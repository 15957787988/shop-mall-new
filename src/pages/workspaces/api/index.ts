import http from '@/service/http'

export interface MediaAsset { id: number; mediaType: 'image' | 'video' | 'audio' | 'file'; url: string }
export interface Binding { entityId: string; kind: 'character' | 'product' | 'scene' | 'outfit'; target: string; assetIds: number[] }
export interface HypitEntry {
  templateCode: 'hypit'
  clientRequestId: string
  prompt: string
  chatModel?: string
  sourceVideoIds: number[]
  bindings: Binding[]
  budgetPoints?: number
  generation: { videoModelId: number; imageModelId?: number; ratio: string; resolution: string; duration: number }
  sourceMetadata?: { width: number; height: number; duration: number }
}
export interface Started { workspaceId: number; conversationId: number; runId: number }
export interface AgentConfiguration { configured: boolean; hypitEnabled: boolean; chatModels: { id: string; name: string }[] }
export interface WorkspaceRow { id: number; title: string; status: string; created_at: string; updated_at: string; run_status: string }
export interface ContentPart { type: string; text?: string; assetId?: number }
export interface WorkspaceMessage {
  id: number; run_id: number; role: 'user' | 'assistant' | 'tool'; seq: number
  content: string | ContentPart[] | null; toolName: string; hasToolCalls: boolean; created_at: string
}
export interface AgentRun {
  id: number; status: string; budget_points: number; reserved_points: number; model_rounds: number
  error_message?: string; created_at: string; finished_at?: string
  plan?: Record<string, unknown>
}
export interface AgentStep { id: number; run_id: number; step_type: string; tool_name: string | null; state: string; error_message?: string | null; canvas_task_id: number | null }
export interface WorkspaceAsset { id: number; media_type: string; url: string; purpose: string; entity_id: string; origin_task_id: number | null }
export interface WorkspaceSnapshot {
  workspace: WorkspaceRow & { entry: HypitEntry }
  conversationId: number; cursor: number; messages: WorkspaceMessage[]; runs: AgentRun[]; steps: AgentStep[]; assets: WorkspaceAsset[]
  balance: { points: number; frozenPoints: number; availablePoints: number }
}
export interface HypitClip { id: string; assetId: number; start: number; end: number; sourceStart: number; fit: 'contain' | 'cover'; motion: 'none' | 'push' | 'pull' | 'pan_left' | 'pan_right'; gain: number }
export interface HypitCaption { id: string; text: string; start: number; end: number; x: number; y: number; width: number; height: number; fontSize: number; color: string; motion: 'none' | 'fade' }
export interface HypitAudio { id: string; assetId: number; start: number; end: number; sourceStart: number; gain: number }
export interface HypitSpec { version: 1; duration: number; width: number; height: number; background: string; clips: HypitClip[]; captions: HypitCaption[]; audio: HypitAudio[]; assetIds?: number[] }
export type HypitSourceSpec = Omit<HypitSpec, 'clips' | 'captions' | 'audio'> & { assetIds: number[] }
export interface HypitRevision { id: number; action_key: string; authoring_mode: 'TRACKS' | 'SOURCE'; review?: { verdict: 'PASS' | 'REVISE'; observations: string; audioVerified: boolean }; parent_id: number | null; state: 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'REVIEW'; build_id: string | null; spec: HypitSpec | HypitSourceSpec; output_url: string | null; error_message: string | null; created_at: string }
const path = '/admin-api/ai'
export const listHypitProjects = (id: number) => http.get<HypitRevision[]>(`${path}/workspaces/${id}/hypit`)
export const createHypitRevision = (id: number, body: { clientRequestId: string; parentId: number | null; spec?: HypitSpec; files?: Record<string, string>; assetIds?: number[] }) => http.post<{ revisionId: number; status: string }>(`${path}/workspaces/${id}/hypit`, body)
export const getHypitSources = (id: number, revision: number) => http.get<Record<string, string>>(`${path}/workspaces/${id}/hypit/${revision}/sources`)
export const reconcileHypitBuild = (id: number, revision: number) => http.post<boolean>(`${path}/workspaces/${id}/hypit/${revision}/reconcile`, {})
export const resolveAssets = (urls: string[]) => http.post<MediaAsset[]>(`${path}/assets/resolve`, { urls })
export const bootstrapWorkspace = (entry: HypitEntry) => http.post<Started>(`${path}/workspaces/bootstrap`, entry)
export const getAgentConfiguration = () => http.get<AgentConfiguration>(`${path}/workspaces/config`)
export const listWorkspaces = (pageNo = 1) => http.get<{ list: WorkspaceRow[]; total: number }>(`${path}/workspaces`, { pageNo })
export const getWorkspace = (id: number) => http.get<WorkspaceSnapshot>(`${path}/workspaces/${id}`)
export const stopAgentRun = (id: number) => http.post<boolean>(`${path}/agent-runs/${id}/stop`, {})
export const sendWorkspaceMessage = (id: number, body: { clientMessageId: string; text: string; assetIds: number[]; budgetPoints: number; chatModel?: string }) =>
  http.post<Started>(`${path}/conversations/${id}/messages`, body)

export function readVideoMetadata(url: string): Promise<HypitEntry['sourceMetadata']> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const finish = (value?: HypitEntry['sourceMetadata']) => {
      clearTimeout(timer); video.onloadedmetadata = null; video.onerror = null
      video.removeAttribute('src'); video.load(); resolve(value)
    }
    const timer = setTimeout(() => finish(), 8000)
    video.preload = 'metadata'
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? { width: video.videoWidth, height: video.videoHeight, duration: video.duration } : undefined)
    video.onerror = () => finish()
    video.src = url
  })
}
