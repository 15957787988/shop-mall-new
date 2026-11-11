<template>
  <div :id="inputId" class="upload-file" :class="$attrs.class">
    <MediaSourceDialog
      v-model:open="sourceOpen"
      :kinds="libraryKinds"
      :max-count="Math.max(0, limit - fileList.length)"
      :exclude-urls="fileList.map((item) => item.url || '')"
      @local="selectLocal"
      @select="selectAssets"
    />
    <Upload.Dragger
      v-if="drag"
      v-model:file-list="fileList"
      :accept="resolvedAccept"
      :disabled="disabled"
      :max-count="limit"
      :multiple="limit > 1"
      :show-upload-list="true"
      :open-file-dialog-on-click="false"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
      @remove="handleRemove"
    >
      <div role="button" tabindex="0" @click.stop="openSources" @keydown.enter.prevent.stop="openSources" @keydown.space.prevent.stop="openSources">
      <slot>
        <p class="upload-file__default-text">点击或拖拽上传文件</p>
      </slot>
      </div>
    </Upload.Dragger>

    <Upload
      v-else
      v-model:file-list="fileList"
      :accept="resolvedAccept"
      :disabled="disabled"
      :max-count="limit"
      :multiple="limit > 1"
      :show-upload-list="true"
      :open-file-dialog-on-click="false"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
      @remove="handleRemove"
    >
      <div role="button" tabindex="0" @click.stop="openSources" @keydown.enter.prevent.stop="openSources" @keydown.space.prevent.stop="openSources">
      <slot>
        <Button type="primary">选取文件</Button>
      </slot>
      </div>
    </Upload>

    <div v-if="isShowTip" class="upload-file__tip">
      大小不超过 <b>{{ fileSize }}MB</b>，格式为 <b>{{ fileType.join('/') }}</b>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Upload, Button } from 'ant-design-vue'
import type { UploadFile, UploadProps } from 'ant-design-vue'
import { uploadFile } from '@/components/UploadFile/api'
import { useToast } from '@/composables/useToast'
import MediaSourceDialog from '@/components/AssetLibrary/MediaSourceDialog.vue'
import type { LibraryAsset } from '@/components/AssetLibrary/api'
import { validateLibrarySelection } from '@/components/AssetLibrary/selection'

defineOptions({ name: 'UploadFile' })

const props = withDefaults(
  defineProps<{
    modelValue: string | string[]
    fileType?: string[]
    fileSize?: number
    limit?: number
    drag?: boolean
    isShowTip?: boolean
    disabled?: boolean
    accept?: string
    beforeUploadHook?: UploadProps['beforeUpload']
    beforeLibrarySelect?: (urls: string[]) => Promise<void>
  }>(),
  {
    fileType: () => ['doc', 'xls', 'ppt', 'txt', 'pdf'],
    fileSize: 5,
    limit: 5,
    drag: false,
    isShowTip: true,
    disabled: false,
    accept: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
  change: [file: UploadFile]
}>()

const { addToast } = useToast()
const fileList = ref<UploadFile[]>([])
const uploading = ref(false)
const sourceOpen = ref(false)
const libraryKinds = computed<LibraryAsset['kind'][]>(() => {
  const types = props.fileType.join(',').toLowerCase()
  return (['image', 'video', 'audio'] as const).filter((kind) =>
    ({
      image: /image|jpg|jpeg|png|webp|gif/,
      video: /video|mp4|mov|webm/,
      audio: /audio|mp3|wav|m4a|ogg/,
    }[kind].test(types))
  )
})
function openSources() {
  if (props.disabled || uploading.value || fileList.value.length >= props.limit) return
  if (!libraryKinds.value.length) selectLocal()
  else sourceOpen.value = true
}
function selectLocal() {
  document.querySelector<HTMLInputElement>(`#${inputId} input[type="file"]`)?.click()
}
const inputId = `media-upload-${Math.random().toString(36).slice(2)}`
async function selectAssets(assets: LibraryAsset[]) {
  if (props.disabled || uploading.value) return
  uploading.value = true
  try {
    const fresh = validateLibrarySelection(
      assets,
      fileList.value.map((file) => file.url || ''),
      props.limit,
      props.fileType,
      props.fileSize
    )
    await props.beforeLibrarySelect?.(
      [...fileList.value.map((file) => file.url || ''), ...fresh.map((asset) => asset.url)].filter(
        Boolean
      )
    )
    for (const asset of fresh)
      fileList.value.push({
        uid: `asset-${asset.source}-${asset.id}`,
        name: asset.name,
        status: 'done',
        url: asset.url,
      })
    emitUpdateModelValue()
    sourceOpen.value = false
  } catch (error) {
    addToast(error instanceof Error ? error.message : '素材不可用', 'error')
  } finally {
    uploading.value = false
  }
}

const resolvedAccept = computed(() => props.accept || props.fileType.join(','))

function urlsFromModelValue(val: string | string[]): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  return val.split(',').map((item) => item.trim()).filter(Boolean)
}

function syncFileListFromModel(val: string | string[]) {
  const urls = urlsFromModelValue(val)
  fileList.value = urls.map((url, index) => ({
    uid: `${index}-${url}`,
    name: url.substring(url.lastIndexOf('/') + 1) || `file-${index + 1}`,
    status: 'done',
    url,
  }))
}

function emitUpdateModelValue() {
  const urls = fileList.value
    .filter((file) => file.status === 'done')
    .map((file) => file.url || (file.response as { url?: string } | undefined)?.url)
    .filter((url): url is string => Boolean(url))

  if (props.limit === 1 || typeof props.modelValue === 'string') {
    emit('update:modelValue', urls[0] ?? '')
    return
  }
  emit('update:modelValue', urls)
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val || (Array.isArray(val) && val.length === 0)) {
      fileList.value = []
      return
    }
    const current = fileList.value
      .map((file) => file.url)
      .filter((url): url is string => Boolean(url))
    const next = urlsFromModelValue(val)
    if (current.join('|') !== next.join('|')) {
      syncFileListFromModel(val)
    }
  },
  { immediate: true, deep: true },
)

function matchFileType(file: File): boolean {
  let fileExtension = ''
  if (file.name.lastIndexOf('.') > -1) {
    fileExtension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  }
  return props.fileType.some((type) => {
    const normalized = type.toLowerCase()
    if (file.type && file.type.toLowerCase().includes(normalized)) return true
    return Boolean(fileExtension && (fileExtension === normalized || normalized.includes(fileExtension)))
  })
}

const beforeUpload: UploadProps['beforeUpload'] = async (file, uploadFiles) => {
  if (props.beforeUploadHook) {
    const hookResult = await props.beforeUploadHook(file, uploadFiles)
    if (hookResult === false || hookResult === Upload.LIST_IGNORE) {
      return Upload.LIST_IGNORE
    }
  }

  if (fileList.value.length >= props.limit) {
    addToast(`上传文件数量不能超过 ${props.limit} 个`, 'error')
    return Upload.LIST_IGNORE
  }

  if (!matchFileType(file)) {
    addToast(`文件格式不正确，请上传 ${props.fileType.join('/')} 格式`, 'error')
    return Upload.LIST_IGNORE
  }

  if (file.size / 1024 / 1024 >= props.fileSize) {
    addToast(`上传文件大小不能超过 ${props.fileSize}MB`, 'error')
    return Upload.LIST_IGNORE
  }

  return true
}

type UploadRequestOption = Parameters<NonNullable<UploadProps['customRequest']>>[0]

async function customRequest(options: UploadRequestOption) {
  const { file, onSuccess, onError, onProgress } = options
  uploading.value = true
  try {
    onProgress?.({ percent: 30 })
    const url = await uploadFile(file as File)
    onProgress?.({ percent: 100 })
    onSuccess?.({ url })
    queueMicrotask(() => emitUpdateModelValue())
    addToast('上传成功', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上传失败'
    addToast(msg, 'error')
    onError?.(err as Error)
  } finally {
    uploading.value = false
  }
}

function handleRemove() {
  queueMicrotask(() => emitUpdateModelValue())
  return true
}
</script>

<style scoped lang="scss">
.upload-file {
  width: 100%;

  :deep(.ant-upload-drag) {
    border-radius: 12px;
    border-color: var(--color-border-whisper);
    background: var(--color-surface-1);
  }

  :deep(.ant-upload-drag:not(.ant-upload-disabled):hover) {
    border-color: var(--color-creative-violet);
  }

  &__default-text {
    margin: 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__tip {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-ink-muted);

    b {
      color: #ef4444;
      font-weight: 600;
    }
  }
}
</style>
