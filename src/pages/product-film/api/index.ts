import http from '@/service/http'
import type { StudioWork } from '@/service/api/studio'
import type { CommonAiModelItem } from '@/service/api/ai-model'
import type { PageResult } from '@/types/api'
export interface FilmTask extends StudioWork {
  id: number
  creationTitle?: string
  creationLabel?: string
  modelName?: string
  status: number
  errorMessage?: string
  videoUrl?: string
  previewUrl?: string
  prompt?: string
}
export interface FilmConfig {
  aiReady: boolean
  models: CommonAiModelItem[]
  markets: Record<string, string>
  languages: Record<string, string>
  videoTypes: Record<string, string>
}
export interface FilmRequest {
  title: string
  script: string
  imageUrls: string[]
  modelImageUrl?: string
  modelDescription?: string
  modelId: number
  ratio: string
  resolution: string
  duration: number
  submitKey: string
  videoType: string
  market: string
  language: string
}
export interface PlannedScript {
  videoType: string
  label: string
  script: string
}
export interface PlanRequest {
  imageUrls: string[]
  modelImageUrl?: string
  modelDescription?: string
  facts: string
  duration: number
  market: string
  language: string
  videoTypes: string[]
}
const base = '/admin-api/ai/product-film'
export const getConfig = () => http.get<FilmConfig>(`${base}/config`)
export const planFilm = (body: PlanRequest) =>
  http.post<PlannedScript[]>(`${base}/plan`, body, { timeoutMs: 300000 })
export const createFilm = (body: FilmRequest) => http.post<number>(`${base}/generate`, body)
export const listFilms = (pageNo: number) =>
  http.get<PageResult<FilmTask>>('/admin-api/ai/video/my-page', {
    pageNo,
    pageSize: 12,
    excludeCanvas: true,
    creationTool: 'product-film',
  })
export const deleteFilm = (id: number) =>
  http.delete<boolean>('/admin-api/ai/video/delete-my', { id })
export const saveFilm = (id: number) => http.post<boolean>(`/admin-api/ai/assets/save?taskId=${id}`)
