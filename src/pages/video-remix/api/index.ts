import http from '@/service/http'
import type { PageResult } from '@/types/api'
import { CommonModelType, fetchCommonAiModels, type CommonAiModelItem } from '@/service/api/ai-model'



export type ReplacementKind = 'character' | 'product' | 'scene'

export interface ReplacementItem {
  id: string
  kind: ReplacementKind
  target: string
  imageUrls: string[]
}

export interface ReplicateMaterials {
  videoUrl: string
  replacements: ReplacementItem[]
}

export interface ReplicateSettings {
  modelId: number
  ratio: string
  resolution: string
  duration: number
  audioUrls?: string[]
}

export interface ReplicateTask {
  id: number
  status:
    | 'QUEUED'
    | 'ANALYZING'
    | 'SUBMITTING'
    | 'GENERATING'
    | 'SUCCESS'
    | 'FAILED'
    | 'UNKNOWN'
    | 'ANALYSIS_DONE'
  canvasTaskId: number | null
  sourceVideoUrl: string
  resultUrl: string | null
  errorMessage: string | null
  createdAt: string
}

const path = '/admin-api/ai/video/replicate/tasks'

export function createReplicateTask(
  materials: ReplicateMaterials,
  settings: ReplicateSettings,
  submitKey: string,
  prompt?: string,
) {
  return http.post<number>(path, {
    materials,
    settings,
    submitKey,
    ...(prompt ? { prompt } : {}),
  })
}

export function pageReplicateTasks(pageNo = 1) {
  return http.get<{ list: ReplicateTask[]; total: number }>(path, { pageNo, pageSize: 10 })
}

export type StudioKind = 'image' | 'video'

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

export function getStudioWork(kind: StudioKind, id: number) {
  const url = kind === 'image' ? '/admin-api/ai/image/get-my' : '/admin-api/ai/video/get-my'
  return http.get<StudioWork | null>(url, { id })
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
