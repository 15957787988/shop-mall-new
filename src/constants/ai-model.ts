/** 火山引擎模型 ID - 图片生成 */
export const MODEL_ID_VOLCAN_IMAGE = 542

/** 火山引擎模型 ID - 视频生成 */
export const MODEL_ID_VOLCAN_VIDEO = 562

/** 电商套图模型 ID（t8 等历史页面，待逐步迁移） */
export const MODEL_ID_SHOP_IMAGE = 571

/** 视频生成 */
export const MODEL_ID_SHOP_VIDEO = 577

/** 商品套图生成默认模型（对齐 humanAI-pc saleor） */
export const DEFAULT_SALEOR_MODEL_ID = 2

/** AI 服饰穿戴生成模型 */
export const MODEL_ID_WEAR = 2

/** 商品套图可选图片模型 */
export const AI_IMAGE_MODELS = [
  { name: 'gpt2', modelId: 2 },
  { name: 'Seedream-4', modelId: 6 },
  { name: 'Seedream-4.5', modelId: 7 },
  { name: 'seedream-5-0-lite', modelId: 8 },
] as const

