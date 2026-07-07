import http from '@/service/http'

/** 首页 Banner（后端 BannerRespVO） */
export interface BannerItem {
  id: number
  title: string
  imageUrl: string
  sort: number
  status: number
  remark?: string
  createTime?: string
  redirectUrl?: string
}

/** 获取 Banner 列表 */
export async function getBannerList(): Promise<BannerItem[]> {
  const result = await http.get<{ list: BannerItem[]; total: number }>(
    '/admin-api/system/banner/public-page',
    { pageNo: 1, pageSize: 10 },
    { skipAuth: true },
  )
  return result.list ?? []
}
