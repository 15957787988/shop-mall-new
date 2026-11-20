/** 作品生成时保存的设置；没有记录的字段保持为空。 */
export interface GenerationSettings {
  targetPlatform?: string
  country?: string
  language?: string
  modelName?: string
  model?: string
  ratio?: string
  resolution?: string
  duration?: number
  points?: number
}

export function generationSettingItems(work: GenerationSettings, showPoints = true) {
  const rows: { label: string; value: string }[] = []
  const settings: [string, string | undefined][] = [
    ['平台', work.targetPlatform], ['站点', work.country], ['语言', work.language],
    ['模型', work.modelName || work.model], ['比例', work.ratio], ['分辨率', work.resolution],
  ]
  for (const [label, value] of settings) {
    if (value?.trim()) rows.push({ label, value: value.trim() })
  }
  if (work.duration && Number.isFinite(work.duration) && work.duration > 0)
    rows.push({ label: '时长', value: `${work.duration}s` })
  if (showPoints && work.points != null && Number.isFinite(Number(work.points)) && Number(work.points) > 0)
    rows.push({ label: '积分', value: String(Number(Number(work.points).toFixed(3))) })
  return rows
}
