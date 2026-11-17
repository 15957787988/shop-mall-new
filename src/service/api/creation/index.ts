import http from '@/service/http'
import type { ImageToolCode } from '@/lib/creation/catalog'

export interface CollectionItem {
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
  resolution?: string
  image: string[]
}

/** 每一套使用固定的请求键；通信失败后重发相同内容，不另建扣费任务。 */
export function submitCollection(items: CollectionItem[]) {
  return http.post<number[]>('/admin-api/ai/image/collections', { items })
}

export interface DetailPagePlanRequest {
  imageUrls: string[]
  title: string
  sellingPoints: string
  requirements: string
  platform: string
  language: string
  modules: string[]
}

export interface DetailPagePlan {
  visualPlan: string
  outputs: { id: string; label: string; prompt: string }[]
}

/** 只分析商品并规划提示词，不创建图片任务。 */
export function planDetailPage(body: DetailPagePlanRequest) {
  return http.post<DetailPagePlan>('/admin-api/ai/image/detail-page/plan', body)
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
  modules: { id: string; name: string; description?: string; maxCount: number }[]
  defaults: string[]
  maxBatch: number
  maxFileMb: number
}
export type FashionWorkbenchConfig = Record<FashionMode, FashionWorkbenchMode>
export function loadFashionWorkbenchConfig() {
  return http.get<FashionWorkbenchConfig>('/admin-api/ai/image/fashion/config')
}
export function planFashionBasic(body: { garmentUrls: string[]; modules: string[]; counts: Record<string, number>; requirements: string }) {
  return http.post<FashionPhotoshootPlan>('/admin-api/ai/image/fashion/basic-plan', body)
}
