import http from '@/service/http'
import type { PageResult } from '@/types/api'
import { CommonModelType, fetchCommonAiModels, type CommonAiModelItem } from '@/service/api/ai-model'
import type { ImageToolCode } from '@/lib/creation/catalog'


export type StudioKind = 'image' | 'video'

/** 服务端以完整批次分页，total为组数。 */
export interface StudioWorkGroup {
  id: string
  title?: string
  creationTool: string
  status: number
  createTime?: number
  originalUrls: string[]
  sellingPoints?: string
  requirements?: string
  details: StudioWork[]
}

const PAGE_SIZE = 10

export interface StudioWork {
  targetPlatform?: string
  country?: string
  language?: string
  id: number
  status: number
  prompt?: string
  model?: string
  modelName?: string
  creationTool?: string
  creationBatchId?: string
  creationTitle?: string
  creationIndex?: number
  creationLabel?: string
  ratio?: string
  output_format?: string
  resolution?: string
  duration?: number
  cost?: number
  points?: number
  errorMessage?: string
  createTime?: string | number | number[]
  picUrl?: string
  picUrls?: Array<string | { url?: string }>
  videoUrl?: string
  previewUrl?: string
  lastFrameUrl?: string
  progress?: string
  referenceImageUrls?: string[]
  referenceVideoUrls?: string[]
  referenceAudioUrls?: string[]
}

export function loadStudioModels(kind: StudioKind) {
  const type = kind === 'image' ? CommonModelType.IMAGE : CommonModelType.VIDEO
  return fetchCommonAiModels(type, undefined, kind === 'video')
}

export function pageStudioWorks(_kind: StudioKind, pageNo: number, pageSize = PAGE_SIZE, _creationTool?: string) {
  const creationTool = "fashion-set"
  const url = '/admin-api/ai/image/my-batch-page'
  return http.get<PageResult<StudioWorkGroup>>(url, {
    pageNo,
    pageSize,
    excludeCanvas: true,
    ...(creationTool ? { creationTool } : {}),
  }).then(page => ({
    total: page.total,
    list: page.list.flatMap(group => group.details.map(work => ({
      ...work,
      creationBatchId: work.creationBatchId || group.id,
    }))),
  }))
}

export function getStudioWork(_kind: StudioKind, id: number) {
  const url = '/admin-api/ai/image/get-my'
  return http.get<StudioWork | null>(url, { id })
}

export function deleteStudioWork(_kind: StudioKind, id: number) {
  const url = '/admin-api/ai/image/delete-my'
  return http.delete<boolean>(url, { id })
}

function fileExt(url: string, fallback: string) {
  const match = /\.([a-z0-9]{2,5})$/i.exec(url.split(/[?#]/)[0] || '')
  return (match?.[1] || fallback).toLowerCase()
}

export function studioFileName(kind: StudioKind, id: number, url: string) {
  return `${kind}-${id}.${fileExt(url, kind === 'video' ? 'mp4' : 'png')}`
}

/** 优先保存为本地文件。跨域无法读取时改为新窗口打开，方便另存。 */
export async function downloadStudioFile(url: string, fileName: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

export function submitStudioImage(body: {
  creationTool?: 'image' | 'model-image'
  idempotencyKey?: string
  modelId: number
  model?: string
  prompt: string
  aspectRatio?: string
  output_format?: string
  resolution?: string
  image?: string[]
}) {
  return http.post<number>('/admin-api/ai/image/common/generations', {
    ...body,
    responseFormat: 'url',
    creationTool: body.creationTool || 'image',
    idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
  })
}

export type { CommonAiModelItem }

/** AI 帮写卖点（商品图 / 爆款视频等共用） */
export async function aiWriteSellingPoints(originalUrls: string[]): Promise<string> {
  return http.post<string>('/admin-api/ai/shop/image-group/ai-write', { originalUrls, creationTool: 'fashion-set' })
}

export interface CollectionItem {
  sellingPoints?: string
  requirements?: string
  targetPlatform?: string
  language?: string
  idempotencyKey: string
  creationTool: ImageToolCode
  creationBatchId?: string
  creationTitle?: string
  creationIndex?: number
  creationLabel: string
  modelId: number
  model?: string
  prompt: string
  aspectRatio?: string
  output_format?: string
  resolution?: string
  image: string[]
}

/** 每一套使用固定的请求键；通信失败后重发相同内容，不另建扣费任务。 */
export function submitCollection(items: CollectionItem[]) {
  return http.post<number[]>('/admin-api/ai/image/collections', { items: items.map(item => ({ ...item, creationTool: 'fashion-set' })) })
}

export interface FashionPhotoshootPlanRequest {
  garmentUrls: string[]
  modelUrl: string
  requirements: string
  aspectRatio: string
}

export interface FashionPhotoshootPlan {
  visualPlan: string
  outputs: { id: string; label: string; prompt: string }[]
}

/** 分析一套商品与人物，规划三个共用搭配和摄影主题的镜头，不创建图片任务。 */
export function planFashionPhotoshoot(body: FashionPhotoshootPlanRequest) {
  return http.post<FashionPhotoshootPlan>('/admin-api/ai/image/fashion/plan', body)
}

export type FashionMode = 'wear' | 'basic'

export interface FashionWorkbenchMode {
  description: string
  groups: import('@/lib/creation/catalog').ReferenceGroup[]
  modules: { id: string; name: string; description?: string; maxCount: number; hidden?: boolean; variants?: { label: string; value: string }[]; backgroundToggle?: boolean; defaultWhiteBackground?: boolean }[]
  defaults: string[]
  maxBatch: number
  maxFileMb: number
}

export type FashionWorkbenchConfig = Record<FashionMode, FashionWorkbenchMode>

export function loadFashionWorkbenchConfig() {
  return http.get<FashionWorkbenchConfig>('/admin-api/ai/image/fashion/config')
}

export function planFashionBasic(body: { garmentUrls: string[]; modules: string[]; counts: Record<string, number>; requirements: string; language?: string; whiteBackgrounds?: Record<string, boolean>; aspectRatio?: string }) {
  return http.post<FashionPhotoshootPlan>('/admin-api/ai/image/fashion/basic-plan', body)
}
