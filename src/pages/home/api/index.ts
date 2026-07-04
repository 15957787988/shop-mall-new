import http from '@/service/http'

/** 后端返回的 QuickCreateRespVO */
interface QuickCreateRespVO {
  id: number
  category: string
  imageUrl: string
  title: string
  subtitle: string
  linkUrl: string
  remark: string
  status: number
  sort: number
  createTime: string
}

/** 快捷创作入口（首页推荐工具） */
export interface QuickCreateItem {
  id: number
  name: string
  linkUrl?: string
  icon?: string
  description?: string
  sort?: number
  category?: string
}

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

function mapQuickCreateResp(resp: QuickCreateRespVO): QuickCreateItem {
  return {
    id: resp.id,
    name: resp.title,
    linkUrl: resp.linkUrl,
    icon: resp.imageUrl,
    description: resp.subtitle,
    sort: resp.sort,
    category: resp.category,
  }
}

/** 获取快捷创作入口列表 */
export async function getQuickCreateList(): Promise<QuickCreateItem[]> {
  const list = await http.get<QuickCreateRespVO[]>(
    '/admin-api/system/quick-create/public-list',
    undefined,
    { skipAuth: true },
  )
  return list.map(mapQuickCreateResp)
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
