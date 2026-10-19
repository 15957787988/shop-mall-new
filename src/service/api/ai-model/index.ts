import http from '@/service/http'

/** /admin-api/ai/model/common/list 的 type：2=图片 */
export const CommonModelType = {
  IMAGE: 2,
  VIDEO: 4,
} as const

/** 接口返回的单条模型（含 canvas_options 展开字段） */
export interface CommonAiModelItem {
  id: number
  name?: string
  model?: string
  platform?: string
  pointsPerUse?: number
  ratio?: string[]
  resolution?: string[]
  resolutionScales?: Record<string, number>
  mediaLimits?: Record<string, number> | null
}

export interface ProductImageModelOption {
  modelId: number
  name: string
  model?: string
  platform?: string
  ratios: string[]
  resolutions: string[]
  pointsPerUse: number
  maxRefImages?: number
}

export async function fetchCommonAiModels(
  type: number,
  platform?: string,
): Promise<CommonAiModelItem[]> {
  const params: Record<string, string | number> = { type }
  if (platform) {
    params.platform = platform
  }
  const list = await http.get<CommonAiModelItem[]>('/admin-api/ai/model/common/list', params)
  return Array.isArray(list) ? list : []
}

function pickMaxRefImages(mediaLimits?: Record<string, number> | null): number | undefined {
  if (!mediaLimits) return undefined
  const n = Number(mediaLimits.maxImages ?? mediaLimits.platformMaxImages)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function mapProductImageModel(item: CommonAiModelItem): ProductImageModelOption {
  const ratios = Array.isArray(item.ratio) ? item.ratio.filter(Boolean) : []
  const resolutions = Array.isArray(item.resolution) ? item.resolution.filter(Boolean) : []
  return {
    modelId: item.id,
    name: item.name || item.model || String(item.id),
    model: item.model,
    platform: item.platform,
    ratios,
    resolutions,
    pointsPerUse: item.pointsPerUse ?? 0,
    maxRefImages: pickMaxRefImages(item.mediaLimits),
  }
}
