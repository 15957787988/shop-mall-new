import http from '@/service/http'

export interface PointRecord {
  id: number
  title: string
  description: string
  point: number
  userId: number
  createTime: string | number
}

export async function getPointRecordPage(params: {
  pageNo: number
  pageSize: number
  userId: number
}): Promise<{ list: PointRecord[]; total: number }> {
  return http.get<{ list: PointRecord[]; total: number }>(
    '/admin-api/app-api/member/point/record/page',
    params,
  )
}
