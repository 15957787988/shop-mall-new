import http from '@/service/http'
import type { PageResult } from '@/types/api'

const PREFIX = '/admin-api/ai/shop/image-group'

/** 子图详情 */
export interface ShopImageDetail {
  id: number
  type: number
  status: number
  progress: string
  picUrl: string | null
  errorMessage: string | null
}

/** 套图记录 */
export interface ShopImageGroup {
  id: number
  title: string
  status: number
  details: ShopImageDetail[]
  createTime?: number
}

/** 生成请求 */
export interface ShopImageGenerateReq {
  modelId: number
  title?: string
  language?: string
  size?: string
  country?: string
  productSellingPoints?: string
  originalUrls: string[]
  whiteBgCount: number
  sceneCount: number
  sellingCount: number
  otherCount: number
}

/** 套图 type 映射 */
export const SHOP_IMAGE_TYPE_MAP: Record<number, string> = {
  1: '白底图',
  2: '场景图',
  3: '卖点图',
  4: '其他',
}

/** 提交套图生成，返回 groupId */
export async function generateShopImageGroup(req: ShopImageGenerateReq): Promise<number> {
  return http.post<number>(`${PREFIX}/generate`, req)
}

/** 获取套图详情 */
export async function getShopImageGroup(id: number): Promise<ShopImageGroup> {
  return http.get<ShopImageGroup>(`${PREFIX}/get`, { id })
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

/** 删除套图记录 */
export async function deleteShopImageGroup(id: number): Promise<boolean> {
  return http.delete<boolean>(`${PREFIX}/delete`, { id })
}

/** 重新生成套图，返回 groupId */
export async function regenerateShopImageGroup(id: number): Promise<number> {
  return http.post<number>(`${PREFIX}/regenerate`, { id })
}

/** 子图 type → 中文标签 */
export function getImageTypeLabel(type: number): string {
  return SHOP_IMAGE_TYPE_MAP[type] ?? `类型${type}`
}

/** 下载套图 ZIP */
export async function downloadShopImageGroupZip(
  groupId: number,
): Promise<{ blob: Blob; fileName: string }> {
  const blob = await http.getBlob(`${PREFIX}/download-zip`, { groupId })
  return { blob, fileName: `shop_images_${groupId}.zip` }
}
