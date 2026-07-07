import http from '@/service/http'

/** AI 帮写卖点（商品图 / 爆款视频等共用） */
export async function aiWriteSellingPoints(originalUrls: string[]): Promise<string> {
  return http.post<string>('/admin-api/ai/shop/image-group/ai-write', { originalUrls })
}
