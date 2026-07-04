import http from '@/service/http'
import { MODEL_ID_SHOP_IMAGE_AI_WRITE } from '@/constants/ai-model'

/** AI 帮写卖点（商品图 / 爆款视频等共用） */
export async function aiWriteSellingPoints(
  originalUrls: string[],
  modelId?: number,
  type?: number,
): Promise<string> {
  return http.post<string>('/admin-api/ai/shop/image-group/ai-write', {
    originalUrls,
    modelId: modelId ?? MODEL_ID_SHOP_IMAGE_AI_WRITE,
    ...(type != null ? { type } : {}),
  })
}
