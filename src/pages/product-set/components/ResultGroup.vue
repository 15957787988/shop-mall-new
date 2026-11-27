<template>
  <div class="result-group">
    <div class="result-group__header">
      <div class="result-group__title">
        <span class="result-group__time">{{ group.createTime }}</span>
        <span class="result-group__name">{{ group.title }}</span>
        <StudioParams :work="group" inline :show-points="false" />
      </div>
      <div class="result-group__actions media-actions">
        <Button class="media-group-download" aria-label="下载整组图片" title="下载整组图片" size="small" :loading="downloading" @click="handleDownloadAll">
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
        :deleting="deletingIds.has(img.id)"
        @preview="openPreview"
        @download="handleDownloadImage"
        @remove="handleRemoveImage"
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


  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import StudioParams from '@/components/studio/StudioParams.vue'
import { Button, Image, Modal } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import {
  downloadShopImageGroupZip,
  deleteShopImage,
} from '@/pages/product-set/api'
import { useToast } from '@/composables/useToast'
import { downloadBlob } from '../utils/constants'
import ImageCard from './ImageCard.vue'
import type { SaleorImageItem, SaleorResultGroup } from '../utils/types'

const ImagePreviewGroup = Image.PreviewGroup

const props = defineProps<{
  group: SaleorResultGroup
  refreshResults?: () => Promise<void>
}>()

const { addToast } = useToast()
const downloading = ref(false)
const deletingIds = ref(new Set<string>())
const viewerVisible = ref(false)
const viewerIndex = ref(0)

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

function handleRemoveImage(image: SaleorImageItem) {
  Modal.confirm({
    title: '删除这张图片？',
    content: '仅删除作品记录，保留原文件。',
    okText: '删除',
    cancelText: '取消',
    async onOk() {
      deletingIds.value = new Set([...deletingIds.value, image.id])
      try {
        await deleteShopImage(Number(image.id))
        await props.refreshResults?.()
        addToast('已删除', 'success')
      } catch (e: unknown) {
        addToast(e instanceof Error ? e.message : '删除失败', 'error')
        throw e
      } finally {
        const next = new Set(deletingIds.value)
        next.delete(image.id)
        deletingIds.value = next
      }
    },
  })
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
  margin-bottom: var(--creation-group-gap);
  border-radius: 12px;
  background: #fff;
  padding: 16px 20px 20px;
  box-shadow: var(--shadow-soft);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: var(--creation-group-gap);
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: var(--creation-item-gap);
  }
}
</style>
