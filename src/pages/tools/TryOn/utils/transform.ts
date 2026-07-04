import type {
  GenerateWearImagePrompt,
  GenerateWearImageReq,
  WearImageBatch,
} from '../utils/types'
import type { ScenePromptResult, TryOnFormData, TryOnResultGroup } from './types'
import { MODEL_ID_WEAR } from '@/constants/ai-model'
import { formatTimestamp } from './constants'

const POSE_ID_SEPARATOR = '::'

/** 构建姿势选项 id */
export function buildPoseId(scene: string, index: number): string {
  return `${scene}${POSE_ID_SEPARATOR}${index}`
}

/** 解析姿势选项 id */
export function parsePoseId(poseId: string): { scene: string; index: number } | null {
  const sepIndex = poseId.lastIndexOf(POSE_ID_SEPARATOR)
  if (sepIndex <= 0) return null
  const scene = poseId.slice(0, sepIndex)
  const index = Number(poseId.slice(sepIndex + POSE_ID_SEPARATOR.length))
  if (!Number.isInteger(index) || index < 0) return null
  return { scene, index }
}

/** 选中姿势 → 生成图片 prompts */
export function buildWearImagePrompts(
  poseIds: string[],
  sceneResults: ScenePromptResult[]
): GenerateWearImagePrompt[] {
  const sceneMap = new Map(sceneResults.map((item) => [item.scene, item]))

  return poseIds
    .map((poseId) => {
      const parsed = parsePoseId(poseId)
      if (!parsed) return null
      const sceneResult = sceneMap.get(parsed.scene)
      if (!sceneResult) return null
      const poseAction = sceneResult.recommendedPoses[parsed.index]
      if (!poseAction) return null

      return {
        scene: {
          scene: sceneResult.scene,
          sceneVisualAnchor: sceneResult.sceneVisualAnchor,
          scenePromptSegment: sceneResult.scenePromptSegment,
        },
        pose: {
          poseAction,
        },
      }
    })
    .filter((item): item is GenerateWearImagePrompt => item !== null)
}

/** 表单 + 场景提示词 → 生成图片请求体 */
export function buildWearImageGenerateReq(
  form: TryOnFormData,
  sceneResults: ScenePromptResult[],
  poseIds: string[]
): GenerateWearImageReq {
  const prompts = buildWearImagePrompts(poseIds, sceneResults)
  const title = sceneResults[0]?.clothing || form.productName || '服饰商品'

  return {
    modelId: MODEL_ID_WEAR,
    title,
    image_urls: [...form.productImages],
    poster_url: form.modelAvatar ?? '',
    aspect_ratio: form.aspectRatio,
    prompts,
  }
}

/** 分页批次 → 前端展示结构 */
export function batchVoToResult(batch: WearImageBatch): TryOnResultGroup {
  return {
    id: String(batch.id),
    createTime: formatTimestamp(batch.createTime),
    title: batch.title,
    originalUrl: batch.imageUrls?.[0] ?? '',
    modelAvatar: batch.posterUrl ?? '',
    selected: false,
    images: (batch.tasks ?? []).map((task) => ({
      id: String(task.id),
      picUrl: task.picUrl ?? '',
      selected: false,
      status: task.status,
      errorMessage: task.errorMessage ?? undefined,
    })),
  }
}
