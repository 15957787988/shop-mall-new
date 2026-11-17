import type { StudioWork } from '@/service/api/studio'

export interface DetailWorkGroup {
  id: string
  title: string
  works: StudioWork[]
  originals: string[]
}

function productTitle(work: StudioWork): string {
  const title = work.creationTitle?.trim()
  if (title && !/^A\+\s*[/／]?\s*详情页$/.test(title)) return title
  return work.prompt?.match(/(?:商品(?:或品牌)?名称|产品名称)[：:]\s*([^\r\n]+)/)?.[1]?.trim() || '未命名商品'
}

function legacyBatchKey(work: StudioWork): string {
  const value = work.createTime
  const date = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0)
    : value ? new Date(value) : undefined
  const references = work.referenceImageUrls || []
  if (!date || Number.isNaN(date.getTime()) || !references.length || !work.creationLabel) return `legacy-${work.id}`
  // 旧记录没有批次号：同秒、同原图和同商品的不同模块兼容为一套。
  return JSON.stringify([Math.floor(date.getTime() / 1000), references, productTitle(work), work.model])
}

export function groupDetailWorks(works: StudioWork[]): DetailWorkGroup[] {
  const groups = new Map<string, DetailWorkGroup>()
  for (const work of works) {
    let id = work.creationBatchId || legacyBatchKey(work)
    if (!work.creationBatchId && groups.get(id)?.works.some(item => item.creationLabel === work.creationLabel)) {
      id = `${id}:${work.id}`
    }
    let group = groups.get(id)
    if (!group) {
      group = { id, title: productTitle(work), works: [], originals: [] }
      groups.set(id, group)
    }
    group.works.push(work)
    for (const url of work.referenceImageUrls || []) {
      if (!group.originals.includes(url)) group.originals.push(url)
    }
  }
  for (const group of groups.values()) {
    group.works.sort((a, b) => (a.creationIndex ?? a.id) - (b.creationIndex ?? b.id))
  }
  return [...groups.values()]
}
