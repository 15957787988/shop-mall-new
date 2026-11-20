export const RATIO_OPTIONS = [
  { label: '3:4', value: '3:4' as const },
  { label: '1:1', value: '1:1' as const },
  { label: '9:16', value: '9:16' as const },
]

export const PAGE_SIZE = 20
export const POLL_INTERVAL = 3000

/** 穿戴图片任务状态 */
export const WEAR_TASK_STATUS = {
  SUCCESS: 20,
  FAIL: 30,
} as const

export function isWearImageSelectable(_img: { status?: number }): boolean {
  return true
}

export function getSelectedWearTaskIds(results: { images: { id: string; selected: boolean; status?: number }[] }[]): number[] {
  return results.flatMap((group) =>
    group.images
      .filter((img) => img.selected && isWearImageSelectable(img))
      .map((img) => Number(img.id))
      .filter((id) => Number.isFinite(id))
  )
}

export function hasSelectedWearTasks(
  results: { images: { selected: boolean; status?: number }[] }[]
): boolean {
  return getSelectedWearTaskIds(results).length > 0
}

export function formatNow(): string {
  return formatTimestamp(Date.now())
}

export function formatTimestamp(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadImageUrl(url: string, fileName: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
