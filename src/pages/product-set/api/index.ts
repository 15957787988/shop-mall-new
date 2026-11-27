import http from '@/service/http'
import type { PageResult } from '@/types/api'



const PREFIX = '/admin-api/ai/shop/image-group'

/** 子图详情 */
export interface ShopImageDetail {
  model?: string
  id: number
  type: number
  title?: string | null
  status: number
  progress: string
  picUrl: string | null
  errorMessage: string | null
}

/** 套图记录 */
export interface ShopImageGroup {
  targetPlatform?: string
  country?: string
  language?: string
  ratio?: string
  output_format?: string
  resolution?: string
  id: number
  title: string
  status: number
  details: ShopImageDetail[]
  createTime?: number
  originalUrls?: string[]
  modelId?: number
}

/** 生成请求 */
export interface ShopImageGenerateReq {
  modelId: number
  platform?: string
  title?: string
  language?: string
  size?: string
  output_format?: string
  resolution?: string
  country?: string
  productSellingPoints?: string
  originalUrls: string[]
  whiteBgCount: number
  sceneCount: number
  sellingCount: number
  otherCount: number
}

/** 提交套图生成，返回 groupId */
export async function generateShopImageGroup(req: ShopImageGenerateReq): Promise<number> {
  const { resolution, output_format, ...body } = req
  return http.post<number>(`${PREFIX}/generate`, {
    ...body,
    ...((resolution || output_format) ? { params: { ...(resolution ? { resolution } : {}), ...(output_format ? { output_format } : {}) } } : {}),
  })
}

/** 套图历史分页 */
export async function pageShopImageGroup(
  pageNo: number = 1,
  pageSize: number = 10,
  title?: string,
): Promise<PageResult<ShopImageGroup>> {
  const params: Record<string, string | number> = { pageNo, pageSize }
  if (title) {
    params.title = title
  }
  return http.get<PageResult<ShopImageGroup>>(`${PREFIX}/page`, params)
}

/** 重新生成请求 */
export interface ShopImageRegenerateReq {
  id: number
  modelId?: number
}

/** 重新生成套图，复用库内 prompt，返回 groupId */
export async function regenerateShopImageGroup(req: ShopImageRegenerateReq): Promise<number> {
  return http.post<number>(`${PREFIX}/regenerate`, req)
}

/** 下载套图 ZIP */
export async function downloadShopImageGroupZip(
  groupId: number,
): Promise<{ blob: Blob; fileName: string }> {
  const blob = await http.getBlob(`${PREFIX}/download-zip`, { groupId })
  return { blob, fileName: `shop_images_${groupId}.zip` }
}
