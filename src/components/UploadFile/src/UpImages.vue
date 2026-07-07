<template>
  <div
    class="upload-box"
    :style="{
      '--upload-width': width,
      '--upload-height': height,
      '--upload-radius': borderradius,
    }"
  >
    <Upload
      v-model:file-list="fileList"
      list-type="picture-card"
      :accept="accept"
      :disabled="disabled"
      :max-count="limit"
      :multiple="true"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
      @preview="handlePreview"
      @remove="handleRemove"
    >
      <div v-if="fileList.length < limit" class="upload-empty">
        <slot name="empty">
          <PlusOutlined />
        </slot>
      </div>
    </Upload>
    <div v-if="$slots.tip" class="upload-tip">
      <slot name="tip" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, ref, watch } from 'vue'
import { Upload, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { UploadFile, UploadProps } from 'ant-design-vue'
import { uploadFile } from '@/components/UploadFile/api'
import { buildImageAccept, matchImageFileType } from '@/components/UploadFile/utils'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

defineOptions({ name: 'UpImages' })

const props = withDefaults(
  defineProps<{
    modelValue: string | string[]
    drag?: boolean
    disabled?: boolean
    limit?: number
    fileSize?: number
    size?: number
    fileType?: string[]
    height?: string
    width?: string
    borderradius?: string
    requireLogin?: boolean
  }>(),
  {
    drag: true,
    disabled: false,
    limit: 5,
    requireLogin: false,
    fileSize: 5,
    size: 300,
    fileType: () => ['image/jpeg', 'image/png', 'image/webp'],
    height: '150px',
    width: '150px',
    borderradius: '8px',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { addToast } = useToast()
const { isLoggedIn, openLogin } = useAuth()
const fileList = ref<UploadFile[]>([])
const accept = computed(() => buildImageAccept(props.fileType))

function resolveFileUrl(file: UploadFile): string | undefined {
  return file.url || (file.response as { url?: string } | undefined)?.url
}

function urlsFromModelValue(val: string | string[]): string[] {
  if (!val) {
    return []
  }
  return Array.isArray(val) ? val : [val]
}

function syncFileListFromModel(val: string | string[]) {
  const urls = urlsFromModelValue(val)
  fileList.value = urls.map((url, index) => ({
    uid: `${index}-${url}`,
    name: url.substring(url.lastIndexOf('/') + 1) || `image-${index + 1}`,
    status: 'done',
    url,
  }))
}

function emitModelValue() {
  const urls = fileList.value
    .filter((file) => file.status === 'done')
    .map((file) => resolveFileUrl(file))
    .filter((url): url is string => Boolean(url))
  emit('update:modelValue', urls)
}

watch(
  () => props.modelValue,
  (val) => {
    const hasUploading = fileList.value.some((file) => file.status === 'uploading')
    if (hasUploading) {
      return
    }

    if (!val || (Array.isArray(val) && val.length === 0)) {
      if (fileList.value.length === 0) {
        return
      }
      fileList.value = []
      return
    }
    const current = fileList.value
      .map((file) => resolveFileUrl(file))
      .filter((url): url is string => Boolean(url))
    const next = urlsFromModelValue(val)
    if (current.join('|') !== next.join('|')) {
      syncFileListFromModel(val)
    }
  },
  { immediate: true, deep: true }
)

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  // if (props.requireLogin && !isLoggedIn.value) {
  //   openLogin()
  //   return Upload.LIST_IGNORE
  // }
  if (!matchImageFileType(file, props.fileType)) {
    addToast('上传图片不符合所需的格式', 'error')
    return Upload.LIST_IGNORE
  }
  if (file.size / 1024 / 1024 >= props.fileSize) {
    addToast(`上传图片大小不能超过 ${props.fileSize}MB`, 'error')
    return Upload.LIST_IGNORE
  }
  return true
}

type UploadRequestOption = Parameters<NonNullable<UploadProps['customRequest']>>[0]

async function customRequest(options: UploadRequestOption) {
  const { file, onSuccess, onError, onProgress } = options
  try {
    onProgress?.({ percent: 30 })
    const url = await uploadFile(file as File)
    onProgress?.({ percent: 100 })
    onSuccess?.({ url })
    await nextTick()
    emitModelValue()
    addToast('上传成功', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上传失败'
    addToast(msg, 'error')
    onError?.(err as Error)
  }
}

const handleRemove: UploadProps['onRemove'] = (file) => {
  fileList.value = fileList.value.filter((item) => item.uid !== file.uid)
  emitModelValue()
  return false
}

function handlePreview(file: UploadFile) {
  const url = resolveFileUrl(file)
  if (!url) {
    return
  }
  Modal.info({
    title: '预览',
    content: h('img', {
      src: url,
      style: 'width: 100%; max-height: 70vh; object-fit: contain;',
    }),
    width: 720,
    okText: '关闭',
  })
}
</script>

<style scoped lang="scss">
.upload-box {
  :deep(.ant-upload-wrapper.ant-upload-picture-card-wrapper) {
    .ant-upload-list.ant-upload-list-picture-card {
      .ant-upload-list-item-container,
      .ant-upload.ant-upload-select {
        width: var(--upload-width);
        height: var(--upload-height);
      }

      .ant-upload-list-item {
        border-radius: var(--upload-radius);
        padding: 0;
      }

      .ant-upload.ant-upload-select {
        border-radius: var(--upload-radius);
        background: var(--color-surface-2, #fafafa);
      }
    }
  }

  .upload-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 20px;
    color: var(--color-ink-secondary, #999);
  }

  .upload-tip {
    margin-top: 8px;
    line-height: 1.4;
    text-align: center;
    font-size: 12px;
    color: var(--color-ink-muted, #999);
  }
}
</style>
