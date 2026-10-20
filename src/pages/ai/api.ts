import http from '@/service/http'
import type { PageResult } from '@/types/api'
import { CommonModelType, fetchCommonAiModels, type CommonAiModelItem } from '@/service/api/ai-model'

export type StudioKind = 'image' | 'video'

export type { CommonAiModelItem }

const PAGE_SIZE = 10

/** 与画布 POST /ai/video/common/generate 的 type 一致 */
const VideoGenType = {
  MULTI_IMAGE: 1,
  TEXT: 3,
  FRAME: 4,
} as const

export interface StudioWork {
  id: number
  status: number
  prompt?: string
  model?: string
  modelName?: string
  errorMessage?: string
  createTime?: string | number | number[]
  picUrl?: string
  picUrls?: Array<string | { url?: string }>
  videoUrl?: string
  previewUrl?: string
  lastFrameUrl?: string
  progress?: string
}

export function loadStudioModels(kind: StudioKind) {
  const type = kind === 'image' ? CommonModelType.IMAGE : CommonModelType.VIDEO
  return fetchCommonAiModels(type)
}

export function pageStudioWorks(kind: StudioKind, pageNo: number) {
  const url = kind === 'image' ? '/admin-api/ai/image/my-page' : '/admin-api/ai/video/my-page'
  return http.get<PageResult<StudioWork>>(url, {
    pageNo,
    pageSize: PAGE_SIZE,
    excludeCanvas: true,
  })
}

export function getStudioWork(kind: StudioKind, id: number) {
  const url = kind === 'image' ? '/admin-api/ai/image/get-my' : '/admin-api/ai/video/get-my'
  return http.get<StudioWork | null>(url, { id })
}

export function submitStudioImage(body: {
  modelId: number
  model?: string
  prompt: string
  aspectRatio?: string
  resolution?: string
  image?: string[]
}) {
  return http.post<number>('/admin-api/ai/image/common/generations', {
    ...body,
    responseFormat: 'url',
  })
}

/** 仅文生 / 参考图。不传 canvasProjectId，记录留在列表。 */
export function buildVideoParams(input: {
  prompt: string
  aspect: string
  duration: number
  resolution: string
  refImages: string[]
}) {
  const text = input.prompt.trim()
  const images = input.refImages.filter((url) => /^https?:/.test(url))
  if (!text && !images.length) return null

  const params: Record<string, unknown> = {
    resolution: input.resolution || '720p',
    ratio: input.aspect || '16:9',
    duration: input.duration || 5,
    generateAudio: true,
  }
  if (images.length === 2 && !text) {
    params.type = VideoGenType.FRAME
    params.imageUrls = images
  } else if (images.length) {
    params.type = VideoGenType.MULTI_IMAGE
    if (text) params.prompt = text
    params.imageUrls = images
  } else {
    params.type = VideoGenType.TEXT
    params.prompt = text
  }
  return params
}

export function submitStudioVideo(body: {
  modelId: number
  model?: string
  params: Record<string, unknown>
}) {
  return http.post<number>('/admin-api/ai/video/common/generate', body)
}

export { PAGE_SIZE }
