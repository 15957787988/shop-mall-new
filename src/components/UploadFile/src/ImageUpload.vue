<template>
  <div class="image-upload">
    <div v-if="images.length > 0" class="image-upload__grid">
      <div
        v-for="(img, index) in images"
        :key="img.uid"
        class="image-upload__item"
        :class="{
          'image-upload__item--primary': enablePrimary && primaryIndex === index && img.url,
          'image-upload__item--clickable': enablePrimary && img.url,
        }"
        :role="enablePrimary && img.url ? 'button' : undefined"
        :tabindex="enablePrimary && img.url ? 0 : undefined"
        @click="handlePrimaryClick(index, img.url)"
        @keydown.enter.space.prevent="handlePrimaryClick(index, img.url)"
      >
        <img :src="img.previewUrl" :alt="`Upload ${index + 1}`" class="image-upload__preview" />
        <span
          v-if="enablePrimary && primaryIndex === index && img.url"
          class="image-upload__primary-badge"
        >
          主图
        </span>
        <div v-if="img.uploading" class="image-upload__loading-overlay">
          <Spin size="small" />
        </div>
        <button
          type="button"
          class="image-upload__remove"
          aria-label="Remove image"
          @click.stop="handleRemove(index)"
        >
          <CloseOutlined />
        </button>
      </div>
      <button v-if="canUpload" type="button" class="image-upload__add" @click="triggerSelect">
        <UploadOutlined />
        <span>添加</span>
      </button>
    </div>

    <button v-else type="button" class="image-upload__empty" @click="triggerSelect">
      <div class="image-upload__empty-icon">
        <PictureOutlined />
      </div>
      <div class="image-upload__empty-title">上传图片</div>
      <div class="image-upload__empty-desc">同一产品，最多{{ maxCount }}张</div>
    </button>

    <Upload
      ref="uploadRef"
      v-model:file-list="fileList"
      class="image-upload__native"
      :accept="accept"
      :multiple="remainingCount > 1"
      :show-upload-list="false"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
    >
      <span class="image-upload__native-trigger" />
    </Upload>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Spin, Upload } from 'ant-design-vue'
import type { UploadProps } from 'ant-design-vue'
import { UploadOutlined, PictureOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { uploadFile } from '@/components/UploadFile/api'
import { buildImageAccept, matchImageFileType } from '@/components/UploadFile/utils'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

interface UploadedImage {
  uid: string
  file: File
  url: string
  previewUrl: string
  uploading: boolean
}

const props = withDefaults(
  defineProps<{
    maxCount?: number
    existingUrls?: string[]
    enablePrimary?: boolean
    primaryIndex?: number
    fileType?: string[]
    requireLogin?: boolean
    fileSize?: number
  }>(),
  {
    maxCount: 3,
    existingUrls: () => [],
    enablePrimary: false,
    primaryIndex: 0,
    fileType: () => ['image/jpeg', 'image/png', 'image/webp'],
    requireLogin: false,
  }
)

const emit = defineEmits<{
  uploadComplete: [urls: string[]]
  primaryChange: [index: number]
  uploadError: [message: string]
}>()

const { addToast } = useToast()
const { isLoggedIn, openLogin } = useAuth()

const images = ref<UploadedImage[]>(
  props.existingUrls.map((url, index) => ({
    uid: `existing-${index}-${url}`,
    file: new File([], ''),
    url,
    previewUrl: url,
    uploading: false,
  }))
)
const fileList = ref<UploadProps['fileList']>([])
const uploadRef = ref<{ $el: HTMLElement } | null>(null)
const lastSyncedUrls = ref('')

const canUpload = computed(() => images.value.length < props.maxCount)
const remainingCount = computed(() => Math.max(0, props.maxCount - images.value.length))
const accept = computed(() => buildImageAccept(props.fileType))
const fileTypeLabel = computed(() =>
  props.fileType.map((type) => type.replace('image/', '').toUpperCase()).join('、')
)

function isAllowedImage(file: File): boolean {
  return matchImageFileType(file, props.fileType)
}

let limitToastShown = false

function showLimitToast() {
  if (limitToastShown) {
    return
  }
  limitToastShown = true
  addToast(`最多上传${props.maxCount}张图片`, 'error')
  queueMicrotask(() => {
    limitToastShown = false
  })
}

watch(
  images,
  (list) => {
    const urls = list.map((i) => i.url).filter(Boolean)
    const key = urls.join('\0')
    if (key === lastSyncedUrls.value) {
      return
    }
    lastSyncedUrls.value = key
    emit('uploadComplete', urls)
  },
  { deep: true }
)

function triggerSelect() {
  uploadRef.value?.$el?.querySelector<HTMLInputElement>('input[type="file"]')?.click()
}

const beforeUpload: UploadProps['beforeUpload'] = (file, uploadFileList) => {
  // if (props.requireLogin && !isLoggedIn.value) {
  //   openLogin()
  //   return Upload.LIST_IGNORE
  // }
  if (props.fileSize && file.size / 1024 / 1024 >= props.fileSize) {
    addToast(`上传图片大小不能超过 ${props.fileSize}MB`, 'error')
    return Upload.LIST_IGNORE
  }
  if (!isAllowedImage(file)) {
    addToast(`上传图片不符合所需的格式，支持 ${fileTypeLabel.value}`, 'error')
    return Upload.LIST_IGNORE
  }

  const indexInBatch = uploadFileList.findIndex((item) => item.uid === file.uid)
  const slotsAtBatchStart = props.maxCount - (images.value.length - indexInBatch)

  if (indexInBatch >= slotsAtBatchStart || images.value.length >= props.maxCount) {
    if (indexInBatch >= slotsAtBatchStart) {
      showLimitToast()
    }
    return Upload.LIST_IGNORE
  }

  const previewUrl = URL.createObjectURL(file)
  images.value.push({
    uid: file.uid,
    file,
    url: '',
    previewUrl,
    uploading: true,
  })
  return true
}

type UploadRequestOption = Parameters<NonNullable<UploadProps['customRequest']>>[0]

async function customRequest(options: UploadRequestOption) {
  const { file, onSuccess, onError } = options
  const uid = (file as File & { uid: string }).uid
  const img = images.value.find((item) => item.uid === uid)
  if (!img) {
    onError?.(new Error('上传文件未找到'))
    return
  }
  try {
    const url = await uploadFile(file as File)
    images.value = images.value.map((item) =>
      item.uid === uid ? { ...item, url, uploading: false } : item
    )
    onSuccess?.({ url })
    fileList.value = (fileList.value ?? []).filter((item) => item.uid !== uid)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '图片上传失败'
    emit('uploadError', msg)
    images.value = images.value.filter((item) => item.uid !== uid)
    if (img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl)
    }
    fileList.value = (fileList.value ?? []).filter((item) => item.uid !== uid)
    onError?.(err instanceof Error ? err : new Error(msg))
  }
}

function handleRemove(index: number) {
  const img = images.value[index]
  if (img.previewUrl && !img.url) {
    URL.revokeObjectURL(img.previewUrl)
  }
  fileList.value = (fileList.value ?? []).filter((item) => item.uid !== img.uid)
  const updated = images.value.filter((_, i) => i !== index)
  images.value = updated
  if (props.enablePrimary) {
    let nextPrimary = props.primaryIndex
    if (props.primaryIndex >= updated.length) {
      nextPrimary = Math.max(0, updated.length - 1)
    } else if (props.primaryIndex > index) {
      nextPrimary = props.primaryIndex - 1
    }
    emit('primaryChange', Math.max(0, nextPrimary))
  }
}

function handlePrimaryClick(index: number, url: string) {
  if (props.enablePrimary && url) {
    emit('primaryChange', index)
  }
}
</script>

<style scoped lang="scss">
.image-upload {
  position: relative;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__count {
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  &__native {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  &__native-trigger {
    display: none;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  &__item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border-whisper);

    &--primary {
      border-color: var(--color-creative-violet);
      outline: 2px solid rgba(109, 40, 217, 0.3);
    }

    &--clickable {
      cursor: pointer;
    }
  }

  &__preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__primary-badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    border-radius: 9999px;
    background: var(--color-creative-violet);
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;
    color: white;
  }

  &__loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
  }

  &__remove {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    height: 24px;
    width: 24px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 12px;
    opacity: 1;
    cursor: pointer;
  }

  &__add {
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 2px dashed var(--color-border-whisper);
    border-radius: 8px;
    background: transparent;
    font-size: 10px;
    color: var(--color-ink-muted);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-creative-violet);
      background: rgba(109, 40, 217, 0.05);
    }
  }

  &__empty {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 2px dashed var(--color-border-whisper);
    border-radius: 12px;
    background: var(--color-surface-1);
    padding: 32px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-creative-violet);
      background: rgba(109, 40, 217, 0.05);
    }
  }

  &__empty-icon {
    display: flex;
    height: 40px;
    width: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: white;
    box-shadow: var(--shadow-soft);
    color: var(--color-ink-secondary);
    font-size: 18px;
  }

  &__empty-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__empty-desc {
    font-size: 12px;
    color: var(--color-ink-muted);
  }
}
</style>
