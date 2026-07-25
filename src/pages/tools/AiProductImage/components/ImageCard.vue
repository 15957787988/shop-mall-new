<template>
  <div
    v-if="mode === 'original'"
    class="image-card image-card--original"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div
      class="image-card__wrap image-card__wrap--original"
      :class="collageClass"
      @click="emit('previewOriginal', 0)"
    >
      <template v-if="displayUrls.length === 1">
        <img :src="displayUrls[0]" alt="原图" class="image-card__original-img" />
      </template>

      <template v-else-if="displayUrls.length === 2">
        <img
          v-for="(url, index) in displayUrls"
          :key="index"
          :src="url"
          alt="原图"
          class="image-card__original-img"
          @click.stop="emit('previewOriginal', index)"
        />
      </template>

      <template v-else-if="displayUrls.length >= 3">
        <div class="image-card__original-main" @click.stop="emit('previewOriginal', 0)">
          <img :src="displayUrls[0]" alt="原图" class="image-card__original-img" />
        </div>
        <div class="image-card__original-side">
          <img
            :src="displayUrls[1]"
            alt="原图"
            class="image-card__original-img"
            @click.stop="emit('previewOriginal', 1)"
          />
          <img
            :src="displayUrls[2]"
            alt="原图"
            class="image-card__original-img"
            @click.stop="emit('previewOriginal', 2)"
          />
        </div>
      </template>

      <div class="image-card__label">原图</div>
    </div>
  </div>

  <div
    v-else-if="image"
    class="image-card"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="image-card__wrap">
      <img
        v-if="image.picUrl"
        :src="image.picUrl"
        :alt="image.label"
        class="image-card__img"
        @click="emit('preview', image)"
      />

      <div v-else-if="isGenerating" class="image-card__status">
        <Spin />
        <span>生成中</span>
      </div>

      <div v-else-if="isFailed" class="image-card__status image-card__status--error">
        <span>{{ image.errorMessage || '生成失败，请重试' }}</span>
      </div>

      <div v-else class="image-card__status">
        <Spin />
        <span>等待生成</span>
      </div>

      <div v-if="showActions && hovered" class="image-card__actions">
        <button
          v-if="showRegenerate"
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
import { Spin } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { DETAIL_STATUS_FAILED, DETAIL_STATUS_GENERATING } from '../utils/constants'
import type { SaleorImageItem } from '../utils/types'

const props = withDefaults(
  defineProps<{
    image?: SaleorImageItem
    originalUrls?: string[]
    mode?: 'generated' | 'original'
    regenerating?: boolean
    showRegenerate?: boolean
  }>(),
  { mode: 'generated', regenerating: false, showRegenerate: true, originalUrls: () => [] },
)

const emit = defineEmits<{
  download: [image: SaleorImageItem]
  regenerate: [image: SaleorImageItem]
  preview: [image: SaleorImageItem]
  previewOriginal: [index: number]
}>()

const hovered = ref(false)

const displayUrls = computed(() => (props.originalUrls ?? []).slice(0, 3))
const collageClass = computed(() => {
  const count = displayUrls.value.length
  if (count <= 1) return 'image-card__wrap--original-1'
  if (count === 2) return 'image-card__wrap--original-2'
  return 'image-card__wrap--original-3'
})

const isGenerating = computed(() => props.image?.status === DETAIL_STATUS_GENERATING)
const isFailed = computed(() => props.image?.status === DETAIL_STATUS_FAILED)
const showActions = computed(
  () => Boolean(props.image?.picUrl) || (props.showRegenerate && isFailed.value),
)
</script>

<style scoped lang="scss">
.image-card {
  &__wrap {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    background: var(--color-surface-2);

    &--original {
      display: flex;
      background: #f5f5f5;
      cursor: pointer;
    }

    &--original-1 {
      .image-card__original-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &--original-2 {
      .image-card__original-img {
        width: 50%;
        height: 100%;
        object-fit: cover;
      }
    }

    &--original-3 {
      .image-card__original-main {
        width: 50%;
        height: 100%;
        overflow: hidden;
        flex-shrink: 0;

        .image-card__original-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .image-card__original-side {
        display: flex;
        width: 50%;
        height: 100%;
        flex-direction: column;
        overflow: hidden;
      }

      .image-card__original-side .image-card__original-img {
        width: 100%;
        flex: 1;
        min-height: 0;
        object-fit: cover;
      }
    }
  }

  &__original-img {
    display: block;
    object-fit: cover;
  }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
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
