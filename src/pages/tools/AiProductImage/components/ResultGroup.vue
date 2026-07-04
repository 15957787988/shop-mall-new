<template>
  <div class="result-group">
    <div class="result-group__header">
      <div class="result-group__title">
        <span class="result-group__time">{{ group.createTime }}</span>
        <span class="result-group__name">{{ group.title }}</span>
      </div>
      <Button size="small" :loading="downloading" @click="handleDownloadAll">
        <DownloadOutlined />
        下载
      </Button>
    </div>

    <div class="result-group__grid">
      <ImageCard
        v-for="img in group.images"
        :key="img.id"
        :image="img"
        :regenerating="regeneratingId === img.id"
        @download="handleDownloadImage"
        @regenerate="handleRegenerateImage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import {
  downloadShopImageGroupZip,
  regenerateShopImageGroup,
} from '@/pages/tools/AiProductImage/api'
import { useToast } from '@/composables/useToast'
import { downloadBlob } from '../utils/constants'
import ImageCard from './ImageCard.vue'
import type { SaleorImageItem, SaleorResultGroup } from '../utils/types'

const props = defineProps<{
  group: SaleorResultGroup
}>()

const emit = defineEmits<{
  regenerated: []
}>()

const { addToast } = useToast()
const downloading = ref(false)
const regeneratingId = ref<string | null>(null)

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

async function handleRegenerateImage(image: SaleorImageItem) {
  regeneratingId.value = image.id
  try {
    await regenerateShopImageGroup(Number(image.id))
    addToast('重新生成任务已提交', 'success')
    emit('regenerated')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '重新生成失败'
    addToast(msg, 'error')
  } finally {
    regeneratingId.value = null
  }
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
