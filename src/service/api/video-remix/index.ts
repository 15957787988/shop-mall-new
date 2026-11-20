import http from '@/service/http'

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
export function analyzeReplicatePrompt(materials: ReplicateMaterials) {
  return http.post<string>('/admin-api/ai/video/replicate/prompt', materials)
}
export function pageReplicateTasks(pageNo = 1) {
  return http.get<{ list: ReplicateTask[]; total: number }>(path, { pageNo, pageSize: 10 })
}
