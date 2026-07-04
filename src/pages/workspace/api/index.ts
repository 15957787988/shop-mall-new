import http from '@/service/http'
import {
  MODEL_ID_VOLCAN_IMAGE,
  MODEL_ID_VOLCAN_VIDEO,
} from '@/constants/ai-model'

/** 后端任务状态：10/11 进行中，20 成功，30 失败 */
export const AI_TASK_STATUS = {
  IN_PROGRESS: 10,
  PROCESSING: 11,
  SUCCESS: 20,
  FAIL: 30,
} as const

export function isAiTaskFinished(status: number): boolean {
  return status === AI_TASK_STATUS.SUCCESS || status === AI_TASK_STATUS.FAIL
}

/** 图片生成请求 */
export interface AiImageGenerateReq {
  modelId?: number
  prompt?: string
  image?: string[]
  [key: string]: unknown
}

export interface AiImageRecord {
  id: number
  status: number
  picUrl?: string
  prompt?: string
  progress?: string
  errorMessage?: string
  createTime?: string
}

/** volcanArk 文生图，返回任务 id */
export async function generateVolcanArkImage(req: AiImageGenerateReq): Promise<number> {
  return http.post<number>('/admin-api/ai/image/volcanArk/generatedimage', {
    modelId: MODEL_ID_VOLCAN_IMAGE,
    ...req,
  })
}

/** 轮询单条图片任务 */
export async function getAiImageMy(id: number): Promise<AiImageRecord> {
  return http.get<AiImageRecord>('/admin-api/ai/image/get-my', { id })
}

/** 我的作品 — 图片 */
export async function getAiImageMyPage(
  pageNo: number = 1,
  pageSize: number = 10,
): Promise<{ list: AiImageRecord[]; total: number }> {
  return http.get('/admin-api/ai/image/my-page', { pageNo, pageSize })
}

/** 视频生成请求 */
export interface AiVideoSubmitReq {
  modelId?: number
  prompt?: string
  imageUrls?: string[]
  [key: string]: unknown
}

export interface AiVideoRecord {
  id: number
  status: number
  videoUrl?: string
  prompt?: string
  progress?: string
  errorMessage?: string
  createTime?: string
}

/** volcanArk 提交视频生成，返回任务 id */
export async function submitVolcanArkVideo(req: AiVideoSubmitReq): Promise<number> {
  return http.post<number>('/admin-api/ai/video/volcanArk/submit', {
    modelId: MODEL_ID_VOLCAN_VIDEO,
    ...req,
  })
}

/** 轮询单条视频任务 */
export async function getAiVideoMy(id: number): Promise<AiVideoRecord> {
  return http.get<AiVideoRecord>('/admin-api/ai/video/get-my', { id })
}

/** 我的作品 — 视频 */
export async function getAiVideoMyPage(
  pageNo: number = 1,
  pageSize: number = 10,
): Promise<{ list: AiVideoRecord[]; total: number }> {
  return http.get('/admin-api/ai/video/my-page', { pageNo, pageSize })
}

/** PPT 创建请求 */
export interface AiPptCreateReq {
  modelId?: number
  title?: string
  text?: string
  [key: string]: unknown
}

export interface AiPptRecord {
  id: number
  status: number
  downloadUrl?: string
  title?: string
  text?: Record<string, unknown>
  errorMessage?: string
  createTime?: string
}

/** 创建 PPT，返回任务 id */
export async function createPpt(req: AiPptCreateReq): Promise<number> {
  return http.post<number>('/admin-api/ai/ppt/ppt/create', req)
}

/** 轮询单条 PPT 任务 */
export async function getAiPptMy(id: number): Promise<AiPptRecord> {
  return http.get<AiPptRecord>('/admin-api/ai/ppt/get-my', { id })
}

/** 我的作品 — PPT */
export async function getAiPptMyPage(
  pageNo: number = 1,
  pageSize: number = 10,
): Promise<{ list: AiPptRecord[]; total: number }> {
  return http.get('/admin-api/ai/ppt/my-page', { pageNo, pageSize })
}

/** AI 文案生成请求 */
export interface AiWriteGenerateReq {
  type: number
  prompt?: string
  originalContent?: string
  length: number
  format: number
  tone: number
  language: number
  modelId?: number
}

/** AI 文案生成（SSE 流式） */
export async function generateWriteStream(req: AiWriteGenerateReq): Promise<Response> {
  return http.fetchStream('/admin-api/ai/write/generate-stream', req)
}

/** Coze 聊天请求 */
export interface CozeChatReq {
  conversation_id?: string
  bot_id?: string
  user_id?: string
  query: string
  modelId?: number
  [key: string]: unknown
}

/** Coze 聊天 SSE */
export async function cozeChat(req: CozeChatReq): Promise<Response> {
  return http.fetchStream('/admin-api/ai/coze/v3/chat', req)
}

/** 积分规则 */
export interface PointRuleResp {
  id: number
  modelId: number
  costPoint: number
  isMemberFree?: number
  isLimitedFree?: number
  status?: number
}

/** 根据 modelId 获取积分规则 */
export async function getPointRuleByModelId(modelId: number): Promise<PointRuleResp> {
  return http.get<PointRuleResp>('/admin-api/ai/point-rule/getByModelId', { modelId })
}
