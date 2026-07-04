/** 模特选项 */
export interface TryOnModel {
  id: string
  name: string
  avatar: string
}

/** 拍摄场景选项 */
export interface TryOnSceneOption {
  id: string
  label: string
}

/** 场景提示词生成结果 */
export interface ScenePromptResult {
  scene: string
  clothing: string
  sceneVisualAnchor: string
  scenePromptSegment: string
  recommendedPoses: string[]
}

/** 场景分组（用于选择推荐姿势） */
export interface ScenePromptGroup {
  scene: string
  poses: ScenePromptPoseOption[]
}

/** 推荐姿势选项 */
export interface ScenePromptPoseOption {
  id: string
  description: string
}

/** 左侧配置表单 */
export interface TryOnFormData {
  productImages: string[]
  modelId: string | null
  /** 选中模特的头像 URL（含用户上传的自定义模特） */
  modelAvatar: string | null
  sceneIds: string[]
  customScene: string
  aspectRatio: '3:4' | '1:1' | '9:16'
  productName: string
}

/** 单张生成结果 */
export interface TryOnResultImage {
  id: string
  picUrl: string
  selected: boolean
  status?: number
  errorMessage?: string
}

/** 一次生成任务结果组 */
export interface TryOnResultGroup {
  id: string
  createTime: string
  title: string
  originalUrl: string
  modelAvatar: string
  images: TryOnResultImage[]
  selected: boolean
}

/** 生成图片请求 - 单个 prompt */
export interface GenerateWearImagePrompt {
  scene: {
    scene: string
    sceneVisualAnchor: string
    scenePromptSegment: string
  }
  pose: {
    poseAction: string
  }
}

/** 生成图片请求体 */
export interface GenerateWearImageReq {
  /** AI 模型 id，非模特 id */
  modelId: number
  title: string
  image_urls: string[]
  poster_url: string
  aspect_ratio: string
  prompts: GenerateWearImagePrompt[]
}

/** 穿戴图片任务 */
export interface WearImageTask {
  id: number
  batchId: number
  taskId: string | null
  picUrl: string | null
  status: number
  progress: string | null
  errorMessage: string | null
  finishTime: number | null
}

/** 穿戴图片批次 */
export interface WearImageBatch {
  id: number
  userId?: number
  modelId?: number
  title: string
  imageUrls: string[]
  posterUrl: string
  aspectRatio: string
  status: number
  createTime: number
  tasks: WearImageTask[]
}
