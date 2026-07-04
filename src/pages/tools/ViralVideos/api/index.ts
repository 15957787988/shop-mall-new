import http from '@/service/http'
import type { PageResult } from '@/types/api'

const PREFIX = '/admin-api/ai/shop/video'

/** 视频风格项 */
export interface ShopVideoTypeItem {
  videoType: number
  count: number
}

/** 生成爆款视频请求 */
export interface ShopVideoGenerateReq {
  productImages: string[]
  sellingPoints: string
  country?: string
  language?: string
  aspectRatio?: string
  type: 1
  modelId: number
  videoTypes: ShopVideoTypeItem[]
}

/** 爆款复刻请求 */
export interface ShopVideoReplicateReq {
  productImages: string[]
  referenceVideoUrl?: string
  country?: string
  language?: string
  aspectRatio?: string
  sellingPoints?: string
  modelId: number
}

/** 分页列表项 / 详情 */
export interface ShopVideoRecord {
  id: number
  videoType: number
  videoUrl?: string
  coverUrl?: string
  videoStatus: number
  createTime?: string | number
  finishTime?: string
  country?: string
  language?: string
  aspectRatio?: string
  sellingPoints?: string
  type?: number
}

export interface ShopVideoPageParams {
  pageNo: number
  pageSize: number
  type?: number
  videoType?: number
  textStatus?: number
  videoStatus?: number
}

/** 视频状态 */
export const SHOP_VIDEO_STATUS = {
  IN_PROGRESS: 10,
  PROCESSING: 11,
  SUCCESS: 20,
  FAIL: 30,
} as const

/** 视频类型 */
export const SHOP_VIDEO_TYPE = {
  GENERATE: 1,
  REPLICATE: 2,
} as const

/** 任务是否已结束 */
export function isShopVideoFinished(status: number): boolean {
  return status === SHOP_VIDEO_STATUS.SUCCESS || status === SHOP_VIDEO_STATUS.FAIL
}

/** 生成爆款视频，返回视频记录 ID 列表 */
export async function generateShopVideo(req: ShopVideoGenerateReq): Promise<number[]> {
  return http.post<number[]>(`${PREFIX}/generate`, req)
}

/** 爆款复刻，返回视频记录 ID */
export async function replicateShopVideo(req: ShopVideoReplicateReq): Promise<number> {
  return http.post<number>(`${PREFIX}/replicate-write`, req)
}

/** 分页查询爆款视频 */
export async function pageShopVideo(
  params: ShopVideoPageParams,
): Promise<PageResult<ShopVideoRecord>> {
  return http.get<PageResult<ShopVideoRecord>>(`${PREFIX}/page`, params)
}

/** 获取爆款视频详情（含生成参数） */
export async function getShopVideo(id: number): Promise<ShopVideoRecord> {
  return http.get<ShopVideoRecord>(`${PREFIX}/get`, { id })
}

/** 重新生成爆款视频，返回新视频记录 ID */
export async function regenerateShopVideo(id: number): Promise<number> {
  return http.post<number>(`${PREFIX}/regenerate`, { id })
}
