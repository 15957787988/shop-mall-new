import http from '@/service/http'

/** 所有商品AI帮写共用商品套图接口与五项文案，最多识别前3张图。 */
export async function aiWriteSellingPoints(
  originalUrls: string[],
  creationTool = 'product-set'
): Promise<string> {
  return http.post<string>('/admin-api/ai/shop/image-group/ai-write', {
    originalUrls: originalUrls.slice(0, 3),
    creationTool,
  })
}
