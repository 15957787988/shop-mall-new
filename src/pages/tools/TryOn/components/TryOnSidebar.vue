<template>
  <div class="tryon-sidebar">
    <div class="tryon-sidebar__scroll scroll-area" @scroll="hideModelPreview">
      <section class="tryon-sidebar__section">
        <h3 class="tryon-sidebar__title">服装图片</h3>
        <ImageUpload
          :max-count="5"
          :existing-urls="form.productImages"
          @upload-complete="form.productImages = $event"
        />
        <p class="tryon-sidebar__tip">整套搭配或同一件服装不同角度图，最多 5 张。</p>
      </section>

      <section class="tryon-sidebar__section">
        <h3 class="tryon-sidebar__title">模特形象</h3>
        <div class="tryon-sidebar__models-wrap scroll-area">
          <div class="tryon-sidebar__models">
            <button
              type="button"
              class="tryon-sidebar__model-add"
              aria-label="上传新模特"
              :disabled="modelUploading"
              @click="handleModelUploadClick"
            >
              <Spin v-if="modelUploading" size="small" />
              <PlusOutlined v-else class="tryon-sidebar__model-add-icon" />
              <span>{{ modelUploading ? '上传中' : '上传新模特' }}</span>
            </button>
            <button
              v-for="model in allModels"
              :key="model.id"
              type="button"
              class="tryon-sidebar__model"
              @click="selectModel(model)"
              @mouseenter="showModelPreview(model, $event)"
              @mouseleave="hideModelPreview"
            >
              <Checkbox
                v-if="form.modelId === model.id"
                checked
                class="tryon-sidebar__model-checkbox"
                @click.prevent
              />
              <img :src="model.avatar" :alt="model.name" />
            </button>
          </div>
        </div>
        <input
          ref="modelInputRef"
          type="file"
          accept="image/*"
          class="tryon-sidebar__model-input"
          @change="handleModelFileChange"
        />
      </section>

      <section class="tryon-sidebar__section">
        <h3 class="tryon-sidebar__title">拍摄场景</h3>
        <Spin v-if="optionsLoading" size="small" />
        <Checkbox.Group v-else v-model:value="form.sceneIds" class="tryon-sidebar__scenes">
          <Checkbox
            v-for="scene in shootingScenes"
            :key="scene.id"
            :value="scene.id"
            class="tryon-sidebar__scene"
          >
            {{ scene.label }}
          </Checkbox>
        </Checkbox.Group>
        <p class="tryon-sidebar__scene-custom-label">或自定义描述场景（可选）</p>
        <Input.TextArea
          v-model:value="form.customScene"
          :rows="3"
          placeholder="描述你想要的场景：如秋季枫叶小径、暖色调午后阳光、模特倚靠树干..."
          class="tryon-sidebar__custom-scene"
        />
      </section>

      <section class="tryon-sidebar__section">
        <h3 class="tryon-sidebar__title">图片比例</h3>
        <div class="tryon-sidebar__ratios">
          <button
            v-for="opt in RATIO_OPTIONS"
            :key="opt.value"
            type="button"
            class="tryon-sidebar__ratio"
            :class="{ 'tryon-sidebar__ratio--active': form.aspectRatio === opt.value }"
            @click="form.aspectRatio = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </section>
    </div>

    <div class="tryon-sidebar__footer">
      <Button
        type="primary"
        block
        size="large"
        class="tryon-sidebar__submit"
        :disabled="!canGenerate"
        :loading="generating"
        @click="handleGenerate"
      >
        {{ submitLabel }}
      </Button>
    </div>

    <div v-if="hoveredModel" class="tryon-model-preview" :style="previewStyle">
      <img :src="hoveredModel.avatar" :alt="hoveredModel.name" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Button, Checkbox, Input, Spin } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { uploadFile } from '@/components/UploadFile/api'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { createWearModel, getWearOptions, WEAR_MODEL_TYPE_UPLOAD } from '../api'
import { RATIO_OPTIONS } from '../utils/constants'
import type { TryOnFormData, TryOnModel, TryOnSceneOption } from '../utils/types'

const emit = defineEmits<{
  generate: [form: TryOnFormData]
}>()

const generating = defineModel<boolean>('generating', { default: false })
const { isLoggedIn, openLogin } = useAuth()
const { addToast } = useToast()

const libraryModels = ref<TryOnModel[]>([])
const customModels = ref<TryOnModel[]>([])
const shootingScenes = ref<TryOnSceneOption[]>([])
const optionsLoading = ref(true)
const modelUploading = ref(false)
const modelInputRef = ref<HTMLInputElement | null>(null)
const hoveredModel = ref<TryOnModel | null>(null)
const previewStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

const PREVIEW_GAP = 12

const allModels = computed(() => [...customModels.value, ...libraryModels.value])

function showModelPreview(model: TryOnModel, event: MouseEvent) {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) {
    return
  }

  const rect = target.getBoundingClientRect()
  hoveredModel.value = model
  previewStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + PREVIEW_GAP}px`,
  }
}

function hideModelPreview() {
  hoveredModel.value = null
}

function handleWindowScroll() {
  hideModelPreview()
}

onMounted(async () => {
  window.addEventListener('scroll', handleWindowScroll, true)
  try {
    const options = await getWearOptions()
    libraryModels.value = options.models
    shootingScenes.value = options.scenes
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载模特和场景失败'
    addToast(msg, 'error')
  } finally {
    optionsLoading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll, true)
})

const form = reactive<TryOnFormData>({
  productImages: [],
  modelId: null,
  modelAvatar: null,
  sceneIds: [],
  customScene: '',
  aspectRatio: '3:4',
  productName: '服饰商品',
})

const canGenerate = computed(
  () => form.productImages.length > 0 && form.modelId !== null && form.sceneIds.length > 0
)

const submitLabel = computed(() => {
  if (form.productImages.length === 0) {
    return '请先上传服装图片'
  }
  if (!form.modelId) {
    return '请选择模特'
  }
  if (form.sceneIds.length === 0) {
    return '请选择拍摄场景'
  }
  return '生成推荐场景'
})

function selectModel(model: TryOnModel) {
  form.modelId = model.id
  form.modelAvatar = model.avatar
}

function handleModelUploadClick() {
  if (modelUploading.value) {
    return
  }
  // if (!isLoggedIn.value) {
  //   openLogin()
  //   return
  // }
  modelInputRef.value?.click()
}

async function handleModelFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    addToast('请上传图片文件', 'error')
    target.value = ''
    return
  }

  modelUploading.value = true
  try {
    const url = await uploadFile(file)
    const modelId = await createWearModel({ url, type: WEAR_MODEL_TYPE_UPLOAD })
    const newModel: TryOnModel = {
      id: String(modelId),
      name: '自定义模特',
      avatar: url,
    }
    customModels.value = [newModel, ...customModels.value]
    selectModel(newModel)
    addToast('模特上传成功', 'success')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '模特上传失败'
    addToast(msg, 'error')
  } finally {
    modelUploading.value = false
    target.value = ''
  }
}

function handleGenerate() {
  // if (!isLoggedIn.value) {
  //   openLogin()
  //   return
  // }
  if (!canGenerate.value || generating.value) {
    return
  }
  generating.value = true
  emit('generate', {
    ...form,
    productImages: [...form.productImages],
    sceneIds: [...form.sceneIds],
  })
}

defineExpose({ form })
</script>

<style scoped lang="scss">
@mixin tryon-selection-checkbox {
  .ant-checkbox {
    top: 0;
  }

  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: var(--color-creative-violet);
    border-color: var(--color-creative-violet);
  }

  &:hover .ant-checkbox-inner {
    border-color: var(--color-creative-violet);
  }
}

.tryon-sidebar {
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--shadow-soft);

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__section {
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border-whisper);
  }

  &__title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__tip {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  &__models-wrap {
    max-height: 220px;
    overflow-y: auto;
  }

  &__models {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  &__model-add,
  &__model {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    padding: 0;
    cursor: pointer;
  }

  &__model-add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed var(--color-border-whisper);
    background: var(--color-surface-2);

    span {
      font-size: 11px;
      line-height: 1.2;
      color: var(--color-ink-muted);
      text-align: center;
      padding: 0 4px;
    }
  }

  &__model-add-icon {
    font-size: 20px;
    color: var(--color-ink-muted);
  }

  &__model-add:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  &__model {
    border: 2px solid transparent;
    background: var(--color-surface-2);

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__model-checkbox {
    position: absolute;
    top: 6px;
    left: 6px;
    z-index: 1;
    margin: 0;
    line-height: 1;

    :deep(.ant-checkbox) {
      top: 0;
    }

    :deep(.ant-checkbox-checked .ant-checkbox-inner) {
      background-color: var(--color-creative-violet);
      border-color: var(--color-creative-violet);
    }

    &:hover :deep(.ant-checkbox-inner) {
      border-color: var(--color-creative-violet);
    }
  }

  &__model-input {
    display: none;
  }

  &__scenes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    width: 100%;

    :deep(.tryon-sidebar__scene) {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      min-height: 36px;
      border-radius: 8px;
      padding: 8px 10px;
      background: var(--color-surface-2);
      cursor: pointer;

      @include tryon-selection-checkbox;

      .ant-checkbox + span {
        flex: 1;
        min-width: 0;
        padding-inline-start: 0;
        font-size: 12px;
        line-height: 1.4;
        color: var(--color-ink-primary);
      }
    }
  }

  &__scene-custom-label {
    margin: 10px 0 6px;
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  &__custom-scene {
    :deep(textarea) {
      border-radius: 8px;
    }
  }

  &__ai-recommend {
    margin-top: 8px;
    border: none;
    background: transparent;
    font-size: 12px;
    color: var(--color-creative-violet);
    cursor: pointer;
  }

  &__ratios {
    display: flex;
    gap: 8px;
  }

  &__ratio {
    flex: 1;
    min-height: 36px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;

    &--active {
      border-color: var(--color-creative-violet);
      background: rgba(124, 58, 237, 0.06);
      color: var(--color-creative-violet);
      font-weight: 600;
    }
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid var(--color-border-whisper);
  }

  &__submit {
    height: 42px;
    font-weight: 600;
  }
}

.tryon-model-preview {
  position: fixed;
  z-index: 1000;
  width: 220px;
  padding: 8px;
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--shadow-soft);
  pointer-events: none;
  transform: translateY(-50%);

  img {
    display: block;
    width: 100%;
    max-height: 320px;
    border-radius: 8px;
    object-fit: contain;
    background: var(--color-surface-2);
  }
}
</style>
