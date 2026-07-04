import http from '@/service/http'

/** 后端返回的工具简表项 */
export interface AiToolSimpleResp {
  id: number
  name: string
}

/** 后端返回的工具详情 */
export interface AiToolDetailResp {
  id: number
  name: string
  description: string
  status: number
}

/** 获取工具简单列表（仅 id + name） */
export async function getAiToolSimpleList(): Promise<AiToolSimpleResp[]> {
  return http.get<AiToolSimpleResp[]>('/admin-api/ai/tool/simple-list')
}

/** 获取工具详情 */
export async function getAiToolDetail(id: number): Promise<AiToolDetailResp> {
  return http.get<AiToolDetailResp>('/admin-api/ai/tool/get', { id })
}
