import http from '@/service/http'
import type { PageResult } from '@/types/api'
import type {
  TryOnModel,
  TryOnSceneOption,
  ScenePromptGroup,
  ScenePromptResult,
  GenerateWearImageReq,
  WearImageBatch,
} from '../utils/types'
import { buildPoseId } from '../utils/transform'
import { PAGE_SIZE } from '../utils/constants'

/** 用户上传的自定义模特 */
export const WEAR_MODEL_TYPE_UPLOAD = 1

export interface CreateWearModelReq {
  url: string
  type: number
}

export interface GenerateScenePromptReq {
  userSceneSelection: string
  userSceneCustomInput: string
  images: string[]
}

interface WearModelOptionResp {
  url: string
}

interface WearOptionsResp {
  model_list: WearModelOptionResp[]
  scene: string[]
}

/** 新增模特，返回模特 id */
export async function createWearModel(req: CreateWearModelReq): Promise<number> {
  return http.post<number>('/admin-api/ai/wear/model/create', req)
}

/** 生成场景提示词与推荐姿势 */
export async function generateScenePrompt(
  req: GenerateScenePromptReq
): Promise<ScenePromptResult[]> {
  return http.post<ScenePromptResult[]>('/admin-api/ai/wear/sceneprompt/generations', req)
}

/** 提交穿戴图片生成任务，返回批次 id */
export async function generateWearImage(req: GenerateWearImageReq): Promise<number> {
  return http.post<number>('/admin-api/ai/wear/image/generations', req)
}

/** 分页查询穿戴图片生成结果 */
export async function pageWearImage(
  pageNo = 1,
  pageSize = PAGE_SIZE
): Promise<PageResult<WearImageBatch>> {
  return http.get<PageResult<WearImageBatch>>('/admin-api/ai/wear/image/page', {
    pageNo,
    pageSize,
  })
}

/** 删除穿戴图片生成任务 */
export async function deleteWearImageTasks(ids: number[]): Promise<boolean> {
  return http.post<boolean>('/admin-api/ai/wear/image/tasks/delete', { ids })
}

export function mapScenePromptGroups(list: ScenePromptResult[]): ScenePromptGroup[] {
  return list.map((item) => ({
    scene: item.scene,
    poses: item.recommendedPoses.map((description, index) => ({
      id: buildPoseId(item.scene, index),
      description,
    })),
  }))
}

function mapWearModels(list: WearModelOptionResp[]): TryOnModel[] {
  return list.map((item, index) => ({
    id: item.url,
    name: `模特 ${index + 1}`,
    avatar: item.url,
  }))
}

function mapWearScenes(scenes: string[]): TryOnSceneOption[] {
  return scenes.map((label) => ({
    id: label,
    label,
  }))
}

/** 获取模特库与拍摄场景选项 */
export async function getWearOptions(): Promise<{
  models: TryOnModel[]
  scenes: TryOnSceneOption[]
}> {
  const data = await http.get<WearOptionsResp>('/admin-api/ai/wear/options')
  return {
    models: mapWearModels(data.model_list ?? []),
    scenes: mapWearScenes(data.scene ?? []),
  }
}
