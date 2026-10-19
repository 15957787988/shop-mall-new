// Canvas AI — 通用模型列表 + 图片/视频生成
import request from './request'
import { submittedVideoReferences } from '../utils/videoReferencePreflight'
import { AiImageStatusEnum } from '../shims/status'
import { resolveMediaLimits } from '../utils/refInputConstraints'
import { VIDEO_WAIT_TIMEOUT_MS, videoWaitTimeoutError } from '../utils/videoTaskWait.js'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_MS = 900_000
// ponytail: 生成 POST 不走 withRetry / 401 重放，失败即失败

/** /ai/model/common/list 的 type 参数 */
export const CommonModelType = {
  IMAGE: 2,
  VIDEO: 4,
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** 轮询仅对网络/网关抖动重试；业务 500 等立即失败，避免刷屏 toast */
function isPollRetryableError(err) {
  const status = err?.response?.status
  if (status === 502 || status === 503 || status === 504) return true
  const msg = String(err?.message || '')
  return msg.includes('Network Error') || msg.includes('timeout') || msg.includes('超时')
}

function pickImageResult(detail) {
  if (!detail) return null
  if (detail.status === AiImageStatusEnum.SUCCESS && detail.picUrl) {
    return {
      resultUrl: detail.picUrl,
      picUrls: detail.picUrls,
      imageId: detail.id,
      width: detail.width,
      height: detail.height,
      taskId: detail.taskId,
    }
  }
  if (detail.status === AiImageStatusEnum.FAIL) {
    throw new Error(detail.errorMessage || '图片生成失败')
  }
  return null
}

/** 已配置积分规则的通用模型列表 */
export function fetchCommonModels(type, platform) {
  const params = { type }
  if (platform) params.platform = platform
  return request.get({ url: '/ai/model/common/list', params })
}

function pickDuration(item, key) {
  const n = Number(item?.mediaLimits?.[key] ?? item?.[key])
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** 把 /ai/model/common/list 条目映射成面板用模型 */
export function mapCommonModel(item, icon) {
  return {
    id: String(item.id),
    name: item.name || item.model,
    icon,
    modelId: item.id,
    model: item.model,
    platform: item.platform,
    ratio: item.ratio,
    resolution: item.resolution,
    resolutionScales: item.resolutionScales || {},
    mediaLimits: item.mediaLimits || null,
    minTotalVideoDuration: pickDuration(item, 'minTotalVideoDuration'),
    maxTotalVideoDuration: pickDuration(item, 'maxTotalVideoDuration'),
    minTotalAudioDuration: pickDuration(item, 'minTotalAudioDuration'),
    maxTotalAudioDuration: pickDuration(item, 'maxTotalAudioDuration'),
    costPoint: item.pointsPerUse ?? 0,
  }
}

export function polishText(text, libraryModelId, context = []) {
  return request.post({ url: '/canvas/agent/polish', data: { text, libraryModelId, context }, timeout: 120000 })
}

function isImagePending(status) {
  return (
    status === AiImageStatusEnum.IN_PROGRESS ||
    status === AiImageStatusEnum.WAITING ||
    status === AiImageStatusEnum.RETRY_FAIL
  )
}

/** 按 imageId 轮询 /ai/image/get-my */
export async function pollImageTask(imageId, onProgress) {
  const start = Date.now()

  while (Date.now() - start < MAX_POLL_MS) {
    let detail
    try {
      detail = await request.get({
        url: `/ai/image/get-my?id=${imageId}`,
        silentError: true
      })
    } catch (err) {
      if (!isPollRetryableError(err)) {
        throw err instanceof Error ? err : new Error('图片任务查询失败')
      }
      await sleep(POLL_INTERVAL_MS)
      continue
    }
    if (!detail) {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const pct = parseInt(String(detail.progress || '0').replace('%', ''), 10)
    onProgress?.(Number.isFinite(pct) ? pct : 0)

    const result = pickImageResult(detail)
    if (result) return result
    if (!isImagePending(detail.status)) break

    await sleep(POLL_INTERVAL_MS)
  }
  throw new Error('图片生成超时，请稍后在绘图记录中查看')
}

/** 提交图片任务，返回 imageId（可持久化到节点，刷新后继续轮询） */
export async function submitImageTask({
  canvasProjectId,
  canvasNodeId,
  prompt,
  modelId,
  model,
  aspect,
  resolution,
  refImages = [],
}) {
  const data = {
    ...(canvasProjectId ? { canvasProjectId, canvasNodeId } : {}),
    modelId,
    prompt,
    aspectRatio: aspect || '1:1',
    responseFormat: 'url',
  }
  if (model) data.model = model
  if (resolution) data.resolution = resolution
  const refs = (refImages || []).filter(Boolean)
  if (refs.length) data.image = refs

  const imageId = await request.post({
    url: '/ai/image/common/generations',
    data,
    retry: false,
  })
  if (!imageId) throw new Error('图片任务提交失败')
  return imageId
}

/** 通用图片生成 — POST + 轮询 */
export async function submitImageGen(params) {
  const { onProgress, ...taskParams } = params
  const imageId = await submitImageTask(taskParams)
  return pollImageTask(imageId, onProgress)
}

function normalizeUrlList(list) {
  if (!Array.isArray(list)) return []
  return list.filter((url) => typeof url === 'string' && /^https?:/.test(url))
}

/** VolcanArk type 枚举 — 见 AiVideoCommonGenerateAPI.md */
const VideoGenType = {
  MULTI_IMAGE: 1,
  MIXED: 2,
  TEXT: 3,
  FRAME: 4,
}

/**
 * 构建 POST /ai/video/common/generate 的 params
 * 参考音频写入 params.audioUrls（与 imageUrls / videoUrls 并列）
 */
export function buildCommonVideoParams({
  prompt,
  aspect,
  duration,
  resolution,
  refImages = [],
  refVideos = [],
  refAudios = [],
  mediaLimits,
}) {
  const text = (prompt || '').trim()
  const limits = resolveMediaLimits(mediaLimits)
  const images = normalizeUrlList(refImages).slice(0, limits.images)
  const videos = submittedVideoReferences(refVideos, limits.videos)
  const audios = normalizeUrlList(refAudios).slice(0, limits.audios)
  if (!text && !images.length && !videos.length && !audios.length) return null

  const params = {
    resolution: resolution || '720p',
    ratio: aspect || '16:9',
    duration: parseInt(duration, 10) || 5,
    generateAudio: true,
  }

  if (videos.length || audios.length) {
    params.type = VideoGenType.MIXED
    params.prompt = text || '根据参考素材生成'
    if (images.length) params.imageUrls = images
    if (videos.length) params.videoUrls = videos
    if (audios.length) params.audioUrls = audios
  } else if (images.length === 2 && !text) {
    params.type = VideoGenType.FRAME
    params.imageUrls = images
  } else if (images.length) {
    params.type = VideoGenType.MULTI_IMAGE
    if (text) params.prompt = text
    params.imageUrls = images
  } else if (text) {
    params.type = VideoGenType.TEXT
    params.prompt = text
  } else {
    return null
  }

  return params
}

/** 完整提交体 { modelId, params } */
export function buildCommonVideoReq(params) {
  const { modelId, model, ...rest } = params
  if (!modelId) return null
  const bodyParams = buildCommonVideoParams(rest)
  if (!bodyParams) return null
  const data = { modelId, params: bodyParams, skipSystemLimit: 1 }
  if (model) data.model = model
  return data
}

/** 多模态聊天 — POST /ai/chat/message/multi-modal-send（不传 modelId → 自动 doubao） */
export function multiModalSend({ content, imageUrls = [], videoUrls = [] }) {
  const data = { content }
  const images = normalizeUrlList(imageUrls)
  const videos = normalizeUrlList(videoUrls)
  if (images.length) data.imageUrls = images
  if (videos.length) data.videoUrls = videos
  return request.post({ url: '/ai/chat/message/multi-modal-send', data})
}

function pickVideoId(res) {
  if (typeof res === 'number') return res
  return res?.id ?? res?.data?.id ?? null
}

function isVideoPending(status) {
  return status === AiImageStatusEnum.IN_PROGRESS || status === 11
}

/** 按 videoId 轮询 /ai/video/get-my */
export async function pollVideoTask(videoId, onProgress, { requestedAt, checkOnce = false } = {}) {
  if (!/^[1-9]\d*$/.test(String(videoId ?? ''))) throw new Error('视频任务提交失败')

  let start = Number(requestedAt) > 0 ? Number(requestedAt) : Date.now()
  // Check a final result once even when the saved waiting deadline has passed.
  let firstQuery = true
  while (firstQuery || Date.now() - start < VIDEO_WAIT_TIMEOUT_MS) {
    firstQuery = false
    let item
    try {
      item = await request.get({
        url: '/ai/video/get-my',
        params: { id: videoId },
        silentError: true,
        timeout: 10000
      })
    } catch (err) {
      if (checkOnce) throw err
      if (!isPollRetryableError(err)) {
        throw err instanceof Error ? err : new Error('视频任务查询失败')
      }
      await sleep(POLL_INTERVAL_MS)
      continue
    }
    if (!item) {
      if (checkOnce) break
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    if (item.status === AiImageStatusEnum.SUCCESS && item.videoUrl) {
      onProgress?.(100)
      return {
        resultUrl: item.videoUrl,
        coverUrl: item.previewUrl || item.lastFrameUrl || '',
      }
    }
    if (item.status === AiImageStatusEnum.FAIL) {
      const error = new Error(item.errorMessage || '视频生成失败')
      error.generationFailed = true
      throw error
    }
    if (Number(item.createTime) > 0) start = Number(item.createTime)
    if (!isVideoPending(item.status) && item.status !== AiImageStatusEnum.SUCCESS) {
      throw new Error('视频任务状态暂时无法确认')
    }
    if (checkOnce || Date.now() - start >= VIDEO_WAIT_TIMEOUT_MS) break

    onProgress?.(Math.min(90, 40))
    await sleep(POLL_INTERVAL_MS)
  }
  throw videoWaitTimeoutError()
}

/** 提交视频任务，返回 videoId — POST /ai/video/common/generate */
export async function submitVideoTask({
  canvasProjectId,
  canvasNodeId,
  canvasRequestId,
  prompt,
  aspect,
  duration,
  resolution,
  refImages = [],
  refVideos = [],
  refAudios = [],
  modelId,
  model,
  mediaLimits,
}) {
  const data = buildCommonVideoReq({
    prompt,
    aspect,
    duration,
    resolution,
    refImages,
    refVideos,
    refAudios,
    modelId,
    model,
    mediaLimits,
  })
  if (!data) {
    throw new Error('请至少添加一张参考图、一个参考视频、一段参考音频，或输入提示词')
  }

  const videoId = await request.post({
    url: '/ai/video/common/generate',
    data: { ...data, ...(canvasProjectId ? { canvasProjectId, canvasNodeId, canvasRequestId } : {}) },
    retry: false,
  })
  const id = pickVideoId(videoId)
  if (!id) throw new Error('视频任务提交失败')
  return id
}

export async function submitVideoGen(params) {
  const { onProgress, ...taskParams } = params
  const videoId = await submitVideoTask(taskParams)
  return pollVideoTask(videoId, onProgress)
}

export function buildVideoEstimateReq(params) {
  return buildCommonVideoReq(params)
}

// --- Canvas 模板 ---

/** 获取模板分类列表 */
export function fetchTemplateCategories() {
  return request.get({ url: '/canvas/templates/categories' })
}

/** 精选模板分页 — 先按 categoryId 过滤，keyword 匹配 */
export function fetchTemplateList(params = {}) {
  return request.get({
    url: '/canvas/templates',
    params: {
      current: params.current ?? 1,
      size: params.size ?? 20,
      categoryId: params.categoryId || undefined,
      keyword: params.keyword || undefined,
    },
  })
}
