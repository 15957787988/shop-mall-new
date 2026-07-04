<template>
  <div class="tryon-results">
    <Spin v-if="loading" class="tryon-results__loading" />

    <div v-else class="tryon-results__scroll scroll-area">
      <TryOnResultToolbar
        :results="results"
        :deleting="deleting"
        @update:results="results = $event"
        @delete-selected="handleDeleteSelected"
        @batch-download="handleBatchDownload"
      />

      <CompareCard
        v-for="(group, index) in results"
        :key="group.id"
        v-model:group="results[index]"
        @download="handleDownloadGroup"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Spin } from 'ant-design-vue'
import { useToast } from '@/composables/useToast'
import { deleteWearImageTasks } from '../api'
import {
  downloadImageUrl,
  getSelectedWearTaskIds,
  WEAR_TASK_STATUS,
} from '../utils/constants'
import TryOnResultToolbar from './TryOnResultToolbar.vue'
import CompareCard from './CompareCard.vue'
import type { TryOnResultGroup } from '../utils/types'

const results = defineModel<TryOnResultGroup[]>('results', { default: () => [] })

defineProps<{
  loading?: boolean
}>()

const { addToast } = useToast()
const deleting = ref(false)

function getDownloadableUrls(group: TryOnResultGroup): string[] {
  return group.images
    .filter((img) => img.picUrl && img.status === WEAR_TASK_STATUS.SUCCESS)
    .map((img) => img.picUrl)
}

function handleDownloadGroup(group: TryOnResultGroup) {
  const urls = getDownloadableUrls(group)
  if (urls.length === 0) {
    addToast('暂无可下载的图片', 'error')
    return
  }
  urls.forEach((url, index) => {
    downloadImageUrl(url, `${group.title || '穿戴图'}_${index + 1}.jpg`)
  })
  addToast('开始下载', 'success')
}

function handleBatchDownload() {
  const selectedGroups = results.value.filter((g) => g.selected)
  if (selectedGroups.length === 0) {
    return
  }
  let count = 0
  selectedGroups.forEach((group) => {
    getDownloadableUrls(group).forEach((url, index) => {
      count += 1
      downloadImageUrl(url, `${group.title || '穿戴图'}_${index + 1}.jpg`)
    })
  })
  if (count === 0) {
    addToast('选中批次暂无可下载的图片', 'error')
    return
  }
  addToast(`开始下载 ${count} 张图片`, 'success')
}

async function handleDeleteSelected() {
  const ids = getSelectedWearTaskIds(results.value)
  if (ids.length === 0) {
    return
  }

  deleting.value = true
  try {
    await deleteWearImageTasks(ids)
    const idSet = new Set(ids)
    results.value = results.value
      .map((group) => ({
        ...group,
        selected: false,
        images: group.images.filter((img) => !idSet.has(Number(img.id))),
      }))
      .filter((group) => group.images.length > 0)
    addToast('删除成功', 'success')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '删除失败'
    addToast(msg, 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped lang="scss">
.tryon-results {
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-surface-2);

  &__loading {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }

  &__scroll {
    height: 100%;
    padding: 16px;
  }
}
</style>
