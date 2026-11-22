import http from '@/service/http'
import type { PageResult } from '@/types/api'
import { CommonModelType, fetchCommonAiModels, type CommonAiModelItem } from '@/service/api/ai-model'


export type StudioKind = 'image' | 'video'

const PAGE_SIZE = 10

export interface StudioWork {
  targetPlatform?: string
  country?: string
  language?: string
  id: number
  status: number
  prompt?: string
  model?: string
  modelName?: string
  creationTool?: string
  creationBatchId?: string
  creationTitle?: string
  creationIndex?: number
  creationLabel?: string
  ratio?: string
  resolution?: string
  duration?: number
  cost?: number
  points?: number
  errorMessage?: string
  createTime?: string | number | number[]
  picUrl?: string
  picUrls?: Array<string | { url?: string }>
  videoUrl?: string
  previewUrl?: string
  lastFrameUrl?: string
  progress?: string
  referenceImageUrls?: string[]
  referenceVideoUrls?: string[]
  referenceAudioUrls?: string[]
}

export function loadStudioModels(kind: StudioKind) {
  const type = kind === 'image' ? CommonModelType.IMAGE : CommonModelType.VIDEO
  return fetchCommonAiModels(type, undefined, kind === 'video')
}

export function pageStudioWorks(_kind: StudioKind, pageNo: number, pageSize = PAGE_SIZE, _creationTool?: string) {
  const creationTool = "image"
  const url = '/admin-api/ai/image/my-page'
  return http.get<PageResult<StudioWork>>(url, {
    pageNo,
    pageSize,
    excludeCanvas: true,
    ...(creationTool ? { creationTool } : {}),
  })
}

export function getStudioWork(_kind: StudioKind, id: number) {
  const url = '/admin-api/ai/image/get-my'
  return http.get<StudioWork | null>(url, { id })
}

export function deleteStudioWork(_kind: StudioKind, id: number) {
  const url = '/admin-api/ai/image/delete-my'
  return http.delete<boolean>(url, { id })
}

function fileExt(url: string, fallback: string) {
  const match = /\.([a-z0-9]{2,5})$/i.exec(url.split(/[?#]/)[0] || '')
  return (match?.[1] || fallback).toLowerCase()
}

export function studioFileName(kind: StudioKind, id: number, url: string) {
  return `${kind}-${id}.${fileExt(url, kind === 'video' ? 'mp4' : 'png')}`
}

/** 优先保存为本地文件。跨域无法读取时改为新窗口打开，方便另存。 */
export async function downloadStudioFile(url: string, fileName: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

export function submitStudioImage(body: {
  creationTool?: 'image' | 'model-image'
  idempotencyKey?: string
  modelId: number
  model?: string
  prompt: string
  output_format?: string
  aspectRatio?: string
  resolution?: string
  image?: string[]
}) {
  return http.post<number>('/admin-api/ai/image/common/generations', {
    ...body,
    responseFormat: 'url',
    creationTool: body.creationTool || 'image',
    idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
  })
}
