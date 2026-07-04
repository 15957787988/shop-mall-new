import {
  SHOP_VIDEO_STATUS,
  SHOP_VIDEO_TYPE,
} from '@/pages/tools/ViralVideos/api'
import {
  VIDEO_TYPE_CONFIG,
  VIDEO_TYPE_LABEL_MAP,
} from '@/pages/tools/ViralVideos/utils/constants'
import type { TabKey } from '@/pages/tools/ViralVideos/utils/types'

export function videoTypeLabelByCode(code: number): string {
  return VIDEO_TYPE_LABEL_MAP[code] ?? (code ? `类型${code}` : '爆款复刻')
}

export function formatRecordTime(time?: string | number) {
  if (time == null || time === '') return ''
  if (typeof time === 'number') {
    const d = new Date(time)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`
  }
  return String(time).replace('T', ' ').slice(0, 16)
}

export function getVideoSnapshotUrl(videoUrl: string): string {
  const separator = videoUrl.includes('?') ? '&' : '?'
  return `${videoUrl}${separator}x-oss-process=video/snapshot,t_7000,f_jpg,w_800,h_600,m_fast`
}

export function buildOssDownloadUrl(videoUrl: string, fileName: string): string {
  const separator = videoUrl.includes('?') ? '&' : '?'
  const disposition = encodeURIComponent(`attachment;filename=${fileName}`)
  return `${videoUrl}${separator}response-content-disposition=${disposition}`
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

export function downloadVideoByXhr(url: string, fileName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'blob'

      xhr.onload = () => {
        if (xhr.status === 200) {
          triggerBlobDownload(xhr.response, fileName)
          resolve()
        } else {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      }

      xhr.onerror = (err) => {
        reject(err || new Error('CORS or Network Error'))
      }

      xhr.send()
    } catch (e) {
      reject(e)
    }
  })
}

export function triggerRemoteDownload(url: string) {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  window.setTimeout(() => {
    document.body.removeChild(iframe)
  }, 60_000)
}

export function statusLabel(status: number): string {
  if (status === SHOP_VIDEO_STATUS.SUCCESS) return '已完成'
  if (status === SHOP_VIDEO_STATUS.FAIL) return '生成失败，请重试'
  if (status === SHOP_VIDEO_STATUS.PROCESSING) return '处理中'
  return '生成中'
}

export function isTypeHot(code: number): boolean {
  const config = VIDEO_TYPE_CONFIG.find((t) => t.videoType === code)
  return Boolean(config && 'hot' in config && config.hot)
}

export function tabKeyForType(type: 1 | 2): TabKey {
  return type === SHOP_VIDEO_TYPE.GENERATE ? 'generate' : 'replicate'
}
