/** 单价由后端返回，已经包含1.1倍率，前端只计算规格和数量。 */
export interface ModelPricing {
  billingSource?: string
  freeImages?: number
  extraImagePrice?: number
  unit: 'image' | 'second'
  defaultResolution: string
  defaultDuration: number
  minDuration: number
  maxDuration: number
  referenceMaxDuration: number
  referenceDurationMode: string
  estimated: boolean
  prices: Record<string, number>
  referencePrices?: Record<string, number>
  soundPrices?: Record<string, number>
  defaultGenerateAudio?: boolean
  aspectPrices?: Record<string, Record<string, number>>
  note?: string
}

interface EstimateOptions {
  resolution?: string
  ratio?: string
  duration?: number
  referenceVideo?: boolean
  generateAudio?: boolean
  imageCount?: number
  count?: number
}

export function estimateModelPoints(
  model: { pricing?: ModelPricing | null } | null | undefined,
  options: EstimateOptions = {},
): number | null {
  const pricing = model?.pricing
  if (!pricing) return null
  const resolution = (options.resolution || pricing.defaultResolution).toLowerCase()
  let table = pricing.prices
  if (pricing.unit === 'second' && (options.generateAudio ?? pricing.defaultGenerateAudio)
      && Object.keys(pricing.soundPrices || {}).length) table = pricing.soundPrices || {}
  if (pricing.unit === 'image' && Object.keys(pricing.aspectPrices || {}).length) {
    const ratio = !options.ratio || options.ratio === 'auto' ? '1:1' : options.ratio
    table = pricing.aspectPrices?.[ratio] || {}
  }
  const local = pricing.billingSource === 'LOCAL_TARIFF'
  if (pricing.unit === 'second' && options.referenceVideo && !local) table = pricing.referencePrices || {}
  const unit = Number(table[resolution])
  if (!Number.isFinite(unit) || unit <= 0) return null
  let units = 1
  if (pricing.unit === 'second') {
    const duration = options.duration ?? pricing.defaultDuration
    if (!Number.isInteger(duration) || duration < pricing.minDuration || duration > pricing.maxDuration) return null
    let referenceSeconds = options.referenceVideo ? Number(pricing.referenceMaxDuration) : 0
    if (options.referenceVideo) {
      if (pricing.referenceDurationMode === 'output-only') referenceSeconds = 0
      if (pricing.referenceDurationMode === 'output-plus-max') referenceSeconds = Math.max(duration, referenceSeconds)
      if (pricing.referenceDurationMode === 'combined-cap') {
        referenceSeconds = Math.min(referenceSeconds, pricing.maxDuration - duration)
        if (referenceSeconds <= 0) return null
      }
    }
    units = duration + (local ? 0 : referenceSeconds)
    if (!Number.isFinite(units) || units <= 0) return null
  }
  const count = options.count ?? 1
  if (!Number.isInteger(count) || count < 1) return null
  // 后端每个任务单独保留3位小数，再累加批量任务，避免逐项舍入差异。
  let total = unit * units
  if (local) {
    const images = options.imageCount ?? 0
    const extra = Number(pricing.extraImagePrice)
    const refSeconds = options.referenceVideo ? Number(pricing.referenceMaxDuration) : 0
    const refUnit = options.referenceVideo ? Number(pricing.referencePrices?.[resolution]) : 0
    if (!Number.isInteger(images) || images < 0 || !Number.isFinite(extra) || extra < 0
        || !Number.isFinite(refUnit) || refUnit < 0 || !Number.isFinite(refSeconds)) return null
    total += Math.max(0, images - (pricing.freeImages ?? 2)) * extra + refSeconds * refUnit
  }
  const taskPoints = Math.round((total + Number.EPSILON) * 1000)
  return (taskPoints * count) / 1000
}

export function formatModelPoints(points: number | null): string {
  return points == null ? '价格未配置' : `${points.toFixed(3)} 积分（预冻结）`
}
