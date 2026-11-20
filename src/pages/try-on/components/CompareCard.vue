<template>
  <div class="compare-card">
    <div class="compare-card__header">
      <div class="compare-card__meta">
        <Checkbox :checked="group.selected" @change="toggleGroup" />
        <span class="compare-card__time">{{ group.createTime }}</span>
        <span class="compare-card__name">{{ group.title }}</span>
      </div>
      <div class="compare-card__actions">
        <Button type="primary" size="small" :disabled="!hasDownloadable" @click="emit('download', group)">
          <DownloadOutlined />
          下载
        </Button>
      </div>
    </div>

    <div class="compare-card__grid">
      <div class="compare-card__cell compare-card__cell--original">
        <div class="compare-card__media">
          <Image :src="group.originalUrl" alt="原图" />
        </div>
        <div v-if="group.modelAvatar" class="compare-card__model-overlay">
          <img :src="group.modelAvatar" alt="模特" class="compare-card__model-thumb" />
        </div>
        <span class="compare-card__tag">原图</span>
      </div>

      <div
        v-for="img in group.images"
        :key="img.id"
        class="compare-card__cell compare-card__cell--result"
        :class="{ 'compare-card__cell--failed': isImageFailed(img) }"
      >
        <Checkbox
          v-if="isImageSelectable(img)"
          class="compare-card__check"
          :checked="img.selected"
          @change="(e) => toggleImage(img.id, e.target.checked)"
        />
        <Spin v-if="isImageLoading(img)" class="compare-card__pending" />
        <div v-else-if="isImageFailed(img)" class="compare-card__failed">
          <span class="compare-card__failed-label">生成失败</span>
          <span class="compare-card__failed-msg">{{ img.errorMessage || '请稍后重试' }}</span>
        </div>
        <div v-else class="compare-card__media">
          <Image :src="img.picUrl" alt="生成结果" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button, Checkbox, Image, Spin } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { WEAR_TASK_STATUS, isWearImageSelectable } from '../utils/constants'
import type { TryOnResultGroup, TryOnResultImage } from '../utils/types'

const group = defineModel<TryOnResultGroup>('group', { required: true })

const emit = defineEmits<{
  download: [group: TryOnResultGroup]
}>()

const hasDownloadable = computed(() =>
  group.value.images.some(
    (img) => img.picUrl && img.status === WEAR_TASK_STATUS.SUCCESS
  )
)

function isImageLoading(img: TryOnResultImage): boolean {
  return (
    !img.picUrl &&
    img.status !== WEAR_TASK_STATUS.SUCCESS &&
    img.status !== WEAR_TASK_STATUS.FAIL
  )
}

function isImageFailed(img: TryOnResultImage): boolean {
  return img.status === WEAR_TASK_STATUS.FAIL
}

function isImageSelectable(img: TryOnResultImage): boolean {
  return isWearImageSelectable(img)
}

function syncGroupSelected(images: TryOnResultImage[]): boolean {
  const selectable = images.filter(isImageSelectable)
  if (selectable.length === 0) {
    return false
  }
  return selectable.every((img) => img.selected)
}

function toggleGroup(e: { target: { checked: boolean } }) {
  const checked = e.target.checked
  const images = group.value.images.map((img) =>
    isImageSelectable(img) ? { ...img, selected: checked } : { ...img, selected: false }
  )
  group.value = {
    ...group.value,
    selected: syncGroupSelected(images),
    images,
  }
}

function toggleImage(id: string, checked: boolean) {
  const images = group.value.images.map((img) =>
    img.id === id && isImageSelectable(img) ? { ...img, selected: checked } : img
  )
  group.value = {
    ...group.value,
    selected: syncGroupSelected(images),
    images,
  }
}
</script>

<style scoped lang="scss">
.compare-card {
  --compare-cell-width: 168px;

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
    flex-wrap: wrap;
  }

  &__meta {
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

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-start;
  }

  &__cell {
    position: relative;
    overflow: hidden;
    flex: 0 0 var(--compare-cell-width);
    width: var(--compare-cell-width);
    border-radius: 10px;
    background: #fff;
    aspect-ratio: 1 / 1;
  }

  &__cell--original {
    border: 1px solid var(--color-border-whisper);
  }

  &__cell--failed {
    background: var(--color-surface-1);
    border: 1px dashed var(--color-border-whisper);
  }

  &__media {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;

    :deep(.ant-image) {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }

    :deep(.ant-image-img) {
      display: block;
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }
  }

  &__tag {
    position: absolute;
    top: 6px;
    left: 6px;
    z-index: 2;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.55);
    padding: 1px 6px;
    font-size: 10px;
    color: #fff;
  }

  &__model-overlay {
    position: absolute;
    left: 8px;
    bottom: 8px;
    z-index: 1;
    overflow: hidden;
    width: 52px;
    height: 68px;
    border: 2px solid #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  &__model-thumb {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__check {
    position: absolute;
    top: 6px;
    left: 4px;
    z-index: 2;
  }

  &__pending,
  &__failed {
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    text-align: center;
  }

  &__failed-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  &__failed-msg {
    display: -webkit-box;
    overflow: hidden;
    font-size: 11px;
    line-height: 1.4;
    color: var(--color-ink-muted);
    word-break: break-word;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}

@media (max-width: 768px) {
  .compare-card {
    --compare-cell-width: 140px;
  }
}
</style>
