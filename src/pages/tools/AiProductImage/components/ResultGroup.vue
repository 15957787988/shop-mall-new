<template>
  <div class="result-group">
    <div class="result-group__header">
      <div class="result-group__title">
        <span class="result-group__time">{{ group.createTime }}</span>
        <span class="result-group__name">{{ group.title }}</span>
      </div>
      <div class="result-group__actions">
        <Button
          v-if="failedImages.length >= 2"
          size="small"
          @click="handleBatchRegenerate"
        >
          <ReloadOutlined />
          批量重新生成
        </Button>
        <Button size="small" @click="handleGroupRegenerate">
          <ReloadOutlined />
          重新生成套图
        </Button>
        <Button size="small" :loading="downloading" @click="handleDownloadAll">
          <DownloadOutlined />
          下载
        </Button>
      </div>
    </div>

    <div class="result-group__grid">
      <ImageCard
        v-if="group.originalUrls?.length"
        mode="original"
        :original-urls="group.originalUrls"
        @preview-original="openOriginalPreview"
      />
      <ImageCard
        v-for="img in group.images"
        :key="img.id"
        :image="img"
        :regenerating="regeneratingIds.has(img.id)"
        @preview="openPreview"
        @download="handleDownloadImage"
        @regenerate="handleRegenerateImage"
      />
    </div>

    <ImagePreviewGroup
      v-if="viewerVisible"
      :preview="{
        visible: viewerVisible,
        onVisibleChange: (visible: boolean) => {
          viewerVisible = visible
        },
        current: viewerIndex,
        onChange: (current: number) => {
          viewerIndex = current
        },
      }"
    >
      <Image
        v-for="(url, index) in previewList"
        :key="index"
        :src="url"
        :style="{ display: 'none' }"
      />
    </ImagePreviewGroup>

    <RegenerateModal
      :open="regenerateModalOpen"
      :default-model-id="group.modelId"
      :loading="regenerateModalLoading"
      @confirm="handleRegenerateConfirm"
      @cancel="closeRegenerateModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button, Image } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  downloadShopImageGroupZip,
  regenerateShopImageGroup,
} from '@/pages/tools/AiProductImage/api'
import { useToast } from '@/composables/useToast'
import { DETAIL_STATUS_FAILED, downloadBlob } from '../utils/constants'
import ImageCard from './ImageCard.vue'
import RegenerateModal from './RegenerateModal.vue'
import type { SaleorImageItem, SaleorResultGroup } from '../utils/types'

const ImagePreviewGroup = Image.PreviewGroup

const props = defineProps<{
  group: SaleorResultGroup
  refreshResults?: () => Promise<void>
}>()

const emit = defineEmits<{
  regenerated: []
}>()

const { addToast } = useToast()
const downloading = ref(false)
const regeneratingIds = ref(new Set<string>())
const viewerVisible = ref(false)
const viewerIndex = ref(0)
const regenerateModalOpen = ref(false)
const regenerateModalLoading = ref(false)
const pendingRegenerateIds = ref<string[]>([])

const failedImages = computed(() =>
  props.group.images.filter((img) => img.status === DETAIL_STATUS_FAILED),
)

const previewList = computed(() => {
  const urls: string[] = []
  if (props.group.originalUrls?.length) {
    urls.push(...props.group.originalUrls.slice(0, 3))
  }
  props.group.images
    .filter((img) => img.picUrl)
    .forEach((img) => urls.push(img.picUrl))
  return urls
})

function openOriginalPreview(index: number) {
  viewerIndex.value = index
  viewerVisible.value = true
}

function openPreview(image: SaleorImageItem) {
  const originalCount = props.group.originalUrls?.length
    ? Math.min(props.group.originalUrls.length, 3)
    : 0
  const generated = props.group.images.filter((img) => img.picUrl)
  const generatedIndex = generated.findIndex((img) => img.id === image.id)
  if (generatedIndex < 0) return
  viewerIndex.value = originalCount + generatedIndex
  viewerVisible.value = true
}

async function handleDownloadAll() {
  downloading.value = true
  try {
    const { blob, fileName } = await downloadShopImageGroupZip(Number(props.group.id))
    downloadBlob(blob, fileName)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '下载失败'
    addToast(msg, 'error')
  } finally {
    downloading.value = false
  }
}

function openRegenerateModal(imageIds: string[]) {
  pendingRegenerateIds.value = imageIds
  regenerateModalOpen.value = true
}

function closeRegenerateModal() {
  if (regenerateModalLoading.value) {
    return
  }
  regenerateModalOpen.value = false
  pendingRegenerateIds.value = []
}

async function handleRegenerateConfirm(modelId: number) {
  const ids = pendingRegenerateIds.value
  if (!ids.length) {
    return
  }

  regenerateModalLoading.value = true
  regeneratingIds.value = new Set([...regeneratingIds.value, ...ids])
  try {
    await Promise.all(
      ids.map((id) => regenerateShopImageGroup({ id: Number(id), modelId })),
    )
    addToast(
      ids.length > 1 ? `已提交 ${ids.length} 张图片的重新生成任务` : '重新生成任务已提交',
      'success',
    )
    regenerateModalOpen.value = false
    pendingRegenerateIds.value = []
    await props.refreshResults?.()
    emit('regenerated')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '重新生成失败'
    addToast(msg, 'error')
  } finally {
    regenerateModalLoading.value = false
    const next = new Set(regeneratingIds.value)
    ids.forEach((id) => next.delete(id))
    regeneratingIds.value = next
  }
}

function handleRegenerateImage(image: SaleorImageItem) {
  openRegenerateModal([image.id])
}

async function handleBatchRegenerate() {
  if (failedImages.value.length < 2) return
  openRegenerateModal(failedImages.value.map((img) => img.id))
}

function handleGroupRegenerate() {
  openRegenerateModal(props.group.images.map((img) => img.id))
}

function handleDownloadImage(image: SaleorImageItem) {
  if (!image.picUrl) return
  const a = document.createElement('a')
  a.href = image.picUrl
  a.download = `${image.label || 'image'}.jpg`
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<style scoped lang="scss">
.result-group {
  margin-bottom: 16px;
  border-radius: 12px;
  background: #fff;
  padding: 16px 20px 20px;
  box-shadow: var(--shadow-soft);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
  }

  &__title {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__time {
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
