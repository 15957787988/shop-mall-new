/** 画布参考输入约束 — 上限优先用节点 settings.mediaLimits.platformMax*，缺省图9/视频3/音频3 */

import { validateAudioTotalDuration } from './audioConstraints.js'
import { validateVideoSingleDuration, validateVideoTotalDuration } from './videoConstraints.js'

const MAX_IMAGE_REFS = 9
const MAX_VIDEO_VIDEO_REFS = 3
const MAX_VIDEO_AUDIO_REFS = 3
const DEFAULT_MAX_VIDEO_DURATION = 15
const DEFAULT_MAX_AUDIO_DURATION = 15

/** @deprecated 用 MAX_IMAGE_REFS；视频节点图片上限同值 */
const MAX_VIDEO_IMAGE_REFS = MAX_IMAGE_REFS

function numOr(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** 模型 mediaLimits.platformMax* → 参考素材上限；缺字段回落默认 9/3/3 */
export function resolveMediaLimits(mediaLimits) {
  return {
    images: numOr(mediaLimits?.platformMaxImages, MAX_IMAGE_REFS),
    videos: numOr(mediaLimits?.platformMaxVideos, MAX_VIDEO_VIDEO_REFS),
    audios: numOr(mediaLimits?.platformMaxAudios, MAX_VIDEO_AUDIO_REFS)
  }
}

/** settings / 模型上的 maxTotal* → 参考音视频总时长上限 */
export function resolveDurationLimits(source) {
  const dl = source?.durationLimits || source?.mediaLimits || source
  return {
    maxVideo: numOr(dl?.maxTotalVideoDuration, DEFAULT_MAX_VIDEO_DURATION),
    maxAudio: numOr(dl?.maxTotalAudioDuration, DEFAULT_MAX_AUDIO_DURATION)
  }
}

export function durationLimitsFromNode(node) {
  return resolveDurationLimits(node?.data?.settings)
}

export function mediaLimitsFromNode(node) {
  return resolveMediaLimits(node?.data?.settings?.mediaLimits)
}

export { MAX_IMAGE_REFS, MAX_VIDEO_IMAGE_REFS, MAX_VIDEO_VIDEO_REFS, MAX_VIDEO_AUDIO_REFS }

const KIND_LABEL = {
  image: '图片',
  video: '视频',
  audio: '音频',
  text: '文本'
}

export function getRefSourceKind(type) {
  if (!type) return null
  if (type.includes('image')) return 'image'
  if (type.includes('video')) return 'video'
  if (type.includes('audio')) return 'audio'
  if (type === 'textNode') return 'text'
  return null
}

export function getRefTargetMode(type) {
  if (!type) return null
  if (type.includes('video')) return 'video'
  if (type.includes('image')) return 'image'
  if (type === 'textNode') return 'text'
  return null
}

/** 计入参考配额的入边 kind 计数（跳过 generation-output） */
export function countRefInputs(targetId, nodes, edges) {
  const counts = { image: 0, video: 0, audio: 0, text: 0 }
  for (const e of edges || []) {
    if (e.target !== targetId) continue
    if (e.data?.role === 'generation-output') continue
    const src = (nodes || []).find((n) => n.id === e.source)
    const kind = getRefSourceKind(src?.type)
    if (kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'text') {
      counts[kind] += 1
    }
  }
  return counts
}

/** 图片/视频节点已占用图片配额（连线 + 待挂接上传）— 各节点独立计数 */
export function countImageInputs(targetId, nodes, edges, pendingUploadImages = 0) {
  const counts = countRefInputs(targetId, nodes, edges)
  const wall = (nodes || []).find((n) => n.id === targetId)?.data?.assetWall || []
  const localUploadImages = wall.filter(
    (item) => item.kind === 'image' && item.source === 'upload' && !item.linkedNodeId
  ).length
  return (counts.image || 0) + localUploadImages + Math.max(0, Number(pendingUploadImages) || 0)
}

/** @deprecated 用 countImageInputs */
export function countVideoImageInputs(targetId, nodes, edges, pendingUploadImages = 0) {
  return countImageInputs(targetId, nodes, edges, pendingUploadImages)
}

export function canAddImageInput(
  targetId,
  nodes,
  edges,
  pendingUploadImages = 0,
  maxImages = MAX_IMAGE_REFS
) {
  return countImageInputs(targetId, nodes, edges, pendingUploadImages) <= maxImages
}

/** @deprecated 用 canAddImageInput */
export function canAddVideoImageInput(targetId, nodes, edges, pendingUploadImages = 0) {
  return canAddImageInput(targetId, nodes, edges, pendingUploadImages)
}

/** 视频目标节点上，已连入参考媒体的总时长（秒） */
export function sumRefMediaDuration(targetId, nodes, edges, kind, excludeSourceId = null) {
  let total = 0
  for (const e of edges || []) {
    if (e.target !== targetId) continue
    if (e.data?.role === 'generation-output') continue
    if (excludeSourceId && e.source === excludeSourceId) continue
    const src = (nodes || []).find((n) => n.id === e.source)
    if (!src || getRefSourceKind(src.type) !== kind) continue
    const d = readNodeMediaDuration(src)
    if (Number.isFinite(d) && d > 0) total += d
  }
  return total
}

function readNodeMediaDuration(node) {
  const d = Number(node?.data?.duration ?? node?.data?.mediaDuration ?? node?.duration)
  return Number.isFinite(d) && d > 0 ? d : NaN
}

function validateRefMediaDuration({ targetType, sourceKind, sourceNode, targetId, nodes, edges }) {
  if (getRefTargetMode(targetType) !== 'video') return { ok: true }
  if (sourceKind !== 'video' && sourceKind !== 'audio') return { ok: true }

  const dur = readNodeMediaDuration(sourceNode)
  if (!Number.isFinite(dur) || dur <= 0) {
    // 资产库素材创建节点后，时长可能会在 metadata 加载完成后异步回填。
    // 这里先放行建边，避免误报“无法读取媒体时长”。
    const hasMediaSrc = !!(sourceNode?.data?.src || sourceNode?.data?.outputValue)
    if (hasMediaSrc) return { ok: true }
    return { ok: false, reason: '无法读取媒体时长，请更换文件后重试' }
  }

  const targetNode = (nodes || []).find((n) => n.id === targetId)
  const durationLimits = durationLimitsFromNode(targetNode)

  if (sourceKind === 'video') {
    const singleErr = validateVideoSingleDuration(dur)
    if (singleErr) return { ok: false, reason: singleErr }
    const existing = sumRefMediaDuration(targetId, nodes, edges, 'video', sourceNode?.id)
    const totalErr = validateVideoTotalDuration(existing, dur, durationLimits.maxVideo)
    if (totalErr) return { ok: false, reason: totalErr }
  }

  if (sourceKind === 'audio') {
    const existing = sumRefMediaDuration(targetId, nodes, edges, 'audio', sourceNode?.id)
    const totalErr = validateAudioTotalDuration(existing, dur, durationLimits.maxAudio)
    if (totalErr) return { ok: false, reason: totalErr }
  }

  return { ok: true }
}

/**
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canAcceptRefInput({ targetType, sourceKind, counts, limits }) {
  if (!sourceKind) return { ok: true }
  const mode = getRefTargetMode(targetType)
  const maxImages = limits?.images ?? MAX_IMAGE_REFS
  const maxVideos = limits?.videos ?? MAX_VIDEO_VIDEO_REFS
  const maxAudios = limits?.audios ?? MAX_VIDEO_AUDIO_REFS

  // 音频节点不接受视频输入
  if (targetType?.includes('audio') && sourceKind === 'video') {
    return { ok: false, reason: `该节点不支持「${KIND_LABEL.video}」类型的输入` }
  }

  // 音频仅可作为视频节点的参考输入
  if (sourceKind === 'audio' && mode !== 'video') {
    return { ok: false, reason: `该节点不支持「${KIND_LABEL.audio}」类型的输入` }
  }

  // 图片/文本/视频节点不能关联音频节点
  if (
    (sourceKind === 'image' || sourceKind === 'text' || sourceKind === 'video') &&
    targetType?.includes('audio')
  ) {
    if (sourceKind === 'video') {
      return { ok: false, reason: `该节点不支持「${KIND_LABEL.video}」类型的输入` }
    }
    return { ok: false, reason: `${KIND_LABEL[sourceKind]}节点不能关联音频节点` }
  }

  if (mode === 'text' || !mode) return { ok: true }

  // 图片目标：禁音频/视频；图片上传+连线按模型 platformMaxImages
  if (mode === 'image') {
    if (sourceKind === 'audio' || sourceKind === 'video') {
      return { ok: false, reason: `该节点不支持「${KIND_LABEL[sourceKind]}」类型的输入` }
    }
    if (sourceKind === 'image') {
      if ((counts?.image || 0) >= maxImages) {
        return { ok: false, reason: `图片上传和连线总共不能超过 ${maxImages} 个` }
      }
    }
    return { ok: true }
  }

  // 视频目标：图片/视频/音频上限来自模型 mediaLimits.platformMax*
  if (mode !== 'video') return { ok: true }

  if (sourceKind === 'image') {
    if ((counts?.image || 0) >= maxImages) {
      return { ok: false, reason: `图片上传和连线总共不能超过 ${maxImages} 个` }
    }
    return { ok: true }
  }
  if (sourceKind === 'video') {
    if ((counts?.video || 0) >= maxVideos) {
      return { ok: false, reason: `参考视频已达上限 ${maxVideos} 个` }
    }
    return { ok: true }
  }
  if (sourceKind === 'text') {
    return { ok: true }
  }
  if (sourceKind === 'audio') {
    if ((counts?.audio || 0) >= maxAudios) {
      return { ok: false, reason: `参考音频已达上限 ${maxAudios} 个` }
    }
    return { ok: true }
  }
  return { ok: true }
}

/**
 * 创建下一/上一节点菜单：选项是否因参考约束禁用（按空配额预判）
 */
export function isCreateOptionDisabled(sourceType, targetType, counts, limits) {
  const sourceKind = getRefSourceKind(sourceType)
  const targetMode = getRefTargetMode(targetType)

  // 音频节点只能创建/关联视频节点
  if (sourceKind === 'audio' && targetMode !== 'video') return true
  // 视频/图片/文本节点不能创建音频节点
  if (
    (sourceKind === 'video' || sourceKind === 'image' || sourceKind === 'text') &&
    targetType?.includes('audio')
  ) {
    return true
  }

  const r = canAcceptRefInput({
    targetType,
    sourceKind,
    counts: counts ?? { image: 0, video: 0, audio: 0, text: 0 },
    limits
  })
  return !r.ok
}

/**
 * 拟建边校验（generation-output 放行）
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateRefEdge({
  sourceType,
  sourceId,
  targetType,
  targetId,
  nodes,
  edges,
  edgeRole
}) {
  if (edgeRole === 'generation-output') return { ok: true }
  const sourceKind = getRefSourceKind(sourceType)
  const sourceNode = (nodes || []).find((n) => n.id === sourceId)
  const targetNode = (nodes || []).find((n) => n.id === targetId)
  const limits = mediaLimitsFromNode(targetNode)

  let countCheck
  const targetMode = getRefTargetMode(targetType)
  if ((targetMode === 'video' || targetMode === 'image') && sourceKind === 'image') {
    countCheck = canAcceptRefInput({
      targetType,
      sourceKind,
      counts: {
        image: countImageInputs(targetId, nodes, edges),
        video: 0,
        audio: 0,
        text: 0
      },
      limits
    })
  } else {
    const counts = countRefInputs(targetId, nodes, edges)
    countCheck = canAcceptRefInput({ targetType, sourceKind, counts, limits })
  }
  if (!countCheck.ok) return countCheck

  return validateRefMediaDuration({
    targetType,
    sourceKind,
    sourceNode,
    targetId,
    nodes,
    edges
  })
}
