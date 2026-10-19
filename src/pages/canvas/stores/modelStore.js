// 模型库 Store — stub: 返回静态预设模型列表，可后续接入真实 API
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const PRESET_MODELS = [
  // 图像模型
  { id: 'img-g2',      name: '智能图片 G2',       icon: '🎨', category: '图像', enabled: true, modelKey: 'image-g2',    type: 'image' },
  { id: 'img-flux',    name: 'Flux 1.1 Pro',      icon: '🖼', category: '图像', enabled: true, modelKey: 'flux-pro',   type: 'image' },
  { id: 'img-mj',      name: 'Midjourney v7',     icon: '🎭', category: '图像', enabled: true, modelKey: 'mj-v7',      type: 'image' },
  // 视频模型 — Seedance 2.0 全能参考（volcanArk OMNI, type: 2）
  {
    id: '627',
    name: 'Seedance 2.0',
    icon: '🎬',
    category: '视频',
    enabled: true,
    modelKey: 'volcanArk-omni',
    type: 'video',
    modelId: 627,
    model: 'doubao-seedance-2-0-mini-260615',
  },
  // 文本模型
  { id: 'txt-lang5',   name: '全能语言模型 5.5',   icon: '💬', category: '文本', enabled: true, modelKey: 'lang-5.5', type: 'text' },
  { id: 'txt-deepseek',name: 'DeepSeek R2',        icon: '🧠', category: '文本', enabled: true, modelKey: 'deepseek-r2', type: 'text' },
]

export const useModelStore = defineStore('canvas_model', () => {
  const libraryModels  = ref(PRESET_MODELS)
  const libraryLoading = ref(false)
  const marketModels   = ref([])

  async function loadLibrary() { /* no-op for preset models */ }
  async function loadMarket() { /* no-op */ }

  const libraryModelKeys = computed(() => new Set(libraryModels.value.map(m => m.modelKey)))
  function isInLibrary(key) { return libraryModelKeys.value.has(key) }

  return { libraryModels, libraryLoading, marketModels, loadLibrary, loadMarket, libraryModelKeys, isInLibrary }
})
