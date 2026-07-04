<template>
  <div class="image-card" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <div class="image-card__wrap">
      <Image
        v-if="image.picUrl"
        :src="image.picUrl"
        :alt="image.label"
        class="image-card__img"
        :preview="{ src: image.picUrl }"
      />

      <div v-else-if="isGenerating" class="image-card__status">
        <Spin />
        <span>生成中</span>
      </div>

      <div v-else-if="isFailed" class="image-card__status image-card__status--error">
        <span>{{ image.errorMessage || '生成失败' }}</span>
      </div>

      <div v-else class="image-card__status">
        <Spin />
        <span>等待生成</span>
      </div>

      <div v-if="showActions && hovered" class="image-card__actions">
        <button
          type="button"
          class="image-card__action"
          title="重新生成"
          :disabled="regenerating"
          @click.stop="emit('regenerate', image)"
        >
          <ReloadOutlined :spin="regenerating" />
        </button>
        <button
          v-if="image.picUrl"
          type="button"
          class="image-card__action"
          title="下载"
          @click.stop="emit('download', image)"
        >
          <DownloadOutlined />
        </button>
      </div>

      <div class="image-card__label">{{ image.label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Image, Spin } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { DETAIL_STATUS_FAILED, DETAIL_STATUS_GENERATING } from '../utils/constants'
import type { SaleorImageItem } from '../utils/types'

const props = withDefaults(
  defineProps<{
    image: SaleorImageItem
    regenerating?: boolean
  }>(),
  { regenerating: false }
)

const emit = defineEmits<{
  download: [image: SaleorImageItem]
  regenerate: [image: SaleorImageItem]
}>()

const hovered = ref(false)

const isGenerating = computed(() => props.image.status === DETAIL_STATUS_GENERATING)
const isFailed = computed(() => props.image.status === DETAIL_STATUS_FAILED)
const showActions = computed(() => Boolean(props.image.picUrl) || isFailed.value)
</script>

<style scoped lang="scss">
.image-card {
  &__wrap {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    background: var(--color-surface-2);
  }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;

    :deep(.ant-image-img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__status {
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    font-size: 12px;
    color: var(--color-ink-secondary);

    &--error {
      color: var(--color-blossom-pink);
    }
  }

  &__actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
  }

  &__action {
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
  }

  &__label {
    position: absolute;
    left: 8px;
    bottom: 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.55);
    padding: 2px 8px;
    font-size: 11px;
    color: #fff;
  }
}
</style>
