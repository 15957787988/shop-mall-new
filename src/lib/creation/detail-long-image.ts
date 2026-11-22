import type { DetailWorkGroup } from '@/lib/creation/detail-results'

import { composeDetailLongImage } from '@/pages/detail-page/api'

export function detailLongImageWorkIds(group: DetailWorkGroup): number[] {
  return group.works.filter(work => work.status === 20 && work.picUrl).map(work => work.id)
}

export async function requestDetailLongImage(ids: number[]): Promise<Blob> {
  if (!ids.length) throw new Error('没有可拼接的图片')
  return composeDetailLongImage(ids)
}

export function detailLongImageFileName(group: DetailWorkGroup): string {
  const id = group.works[0]?.id ?? Date.now()
  const title = group.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
  return title ? `detail-long-${title}-${id}.png` : `detail-long-${id}.png`
}

/** 合成一张 PNG 后触发一次文件下载，不逐张下载模块图。 */
export async function downloadDetailLongImage(group: DetailWorkGroup, previewBlob?: Blob): Promise<void> {
  const blob = previewBlob ?? await requestDetailLongImage(detailLongImageWorkIds(group))
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  try {
    anchor.href = objectUrl
    anchor.download = detailLongImageFileName(group)
    document.body.appendChild(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
