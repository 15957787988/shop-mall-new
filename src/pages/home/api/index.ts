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

/** 首页灵感分类与模板列表，独立于画布页面请求。 */
export const templateApi = {
  clone: (id: number, name?: string) => http.post<{ id: number }>(`/admin-api/canvas/templates/${id}/clone`, name ? { name } : {}),
  categories: () => http.get<{ id: number; name: string }[]>('/admin-api/canvas/templates/categories'),
  list: (params: { current?: number; size?: number; categoryId?: number; keyword?: string } = {}) => http.get<{ list: { id: number; title: string; cover: string; previewUrl?: string; description?: string; tags?: string[] }[]; total: number }>('/admin-api/canvas/templates', { current: params.current ?? 1, size: params.size ?? 20, categoryId: params.categoryId || undefined, keyword: params.keyword || undefined }),
}
