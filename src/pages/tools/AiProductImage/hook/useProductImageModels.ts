import { computed, ref, shallowRef } from 'vue'
import {
  CommonModelType,
  fetchCommonAiModels,
  mapProductImageModel,
  type ProductImageModelOption,
} from '@/service/api/ai-model'
import { DEFAULT_SALEOR_MODEL_ID } from '@/constants/ai-model'

const models = shallowRef<ProductImageModelOption[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
let loadPromise: Promise<void> | null = null

async function loadProductImageModels() {
  if (models.value.length) {
    return
  }
  if (loadPromise) {
    await loadPromise
    return
  }
  loadPromise = (async () => {
    loading.value = true
    loadError.value = null
    try {
      const list = await fetchCommonAiModels(CommonModelType.IMAGE)
      models.value = list.map(mapProductImageModel)
    } catch (e: unknown) {
      loadError.value = e instanceof Error ? e.message : '模型列表加载失败'
      models.value = []
    } finally {
      loading.value = false
    }
  })()
  await loadPromise
}

export function useProductImageModels() {
  const modelSelectOptions = computed(() =>
    models.value.map((m) => ({
      label: m.name,
      value: m.modelId,
    })),
  )

  function getModelById(modelId?: number | null): ProductImageModelOption | undefined {
    if (modelId == null) return undefined
    return models.value.find((m) => m.modelId === modelId)
  }

  function ratioOptionsFor(modelId?: number | null) {
    const ratios = getModelById(modelId)?.ratios ?? []
    return ratios.map((value) => ({ label: value, value }))
  }

  function resolutionOptionsFor(modelId?: number | null) {
    const resolutions = getModelById(modelId)?.resolutions ?? []
    return resolutions.map((value) => ({ label: value, value }))
  }

  /** 每个模型各自记住上次选的比例/分辨率，切回来不串 */
  const pickedByModel = new Map<number, { aspectRatio: string; resolution: string }>()

  function fieldsForModel(
    modelId: number,
    prefer?: { aspectRatio: string; resolution: string },
  ): { modelId: number; aspectRatio: string; resolution: string } {
    const m = getModelById(modelId)
    const ratios = m?.ratios ?? []
    const resolutions = m?.resolutions ?? []
    const aspectRatio =
      prefer && ratios.includes(prefer.aspectRatio) ? prefer.aspectRatio : ratios[0] ?? '1:1'
    const resolution =
      prefer && resolutions.includes(prefer.resolution) ? prefer.resolution : resolutions[0] ?? ''
    return { modelId, aspectRatio, resolution }
  }

  function switchModel(
    prevId: number,
    nextId: number,
    current: { aspectRatio: string; resolution: string },
  ): { modelId: number; aspectRatio: string; resolution: string } {
    if (prevId && prevId !== nextId && getModelById(prevId)) {
      pickedByModel.set(prevId, {
        aspectRatio: current.aspectRatio,
        resolution: current.resolution,
      })
    }
    let id = nextId
    if (!getModelById(id) && models.value.length) {
      id = models.value[0].modelId
    }
    return fieldsForModel(id, pickedByModel.get(id))
  }

  function defaultModelId(): number {
    return models.value[0]?.modelId ?? DEFAULT_SALEOR_MODEL_ID
  }

  return {
    models,
    loading,
    loadError,
    modelSelectOptions,
    loadProductImageModels,
    getModelById,
    ratioOptionsFor,
    resolutionOptionsFor,
    switchModel,
    defaultModelId,
  }
}
