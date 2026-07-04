<template>
  <article :class="['media-card', className]">
    <div class="media-card__media">
      <img :src="thumbnail" :alt="title" class="media-card__image" />
      <span class="media-card__type-badge">
        {{ type === 'video' ? '视频' : '图片' }}
      </span>
      <template v-if="type === 'video'">
        <span v-if="duration" class="media-card__duration">{{ duration }}</span>
        <div class="media-card__play-overlay">
          <span class="media-card__play-btn">
            <CaretRightFilled />
          </span>
        </div>
      </template>
    </div>
    <div class="media-card__content">
      <p class="media-card__title">{{ title }}</p>
      <p v-if="size" class="media-card__size">{{ size }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { CaretRightFilled } from '@ant-design/icons-vue'

withDefaults(
  defineProps<{
    title: string
    thumbnail: string
    type?: 'image' | 'video'
    duration?: string
    size?: string
    className?: string
  }>(),
  { type: 'image' }
)
</script>

<style scoped lang="scss">
.media-card {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--color-border-whisper);
  background: #fff;
  box-shadow: var(--shadow-card);

  &:hover .media-card__play-overlay {
    opacity: 1;
  }

  &__media {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--color-canvas-mist);
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__type-badge,
  &__duration {
    position: absolute;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 6px;
    font-size: 10px;
    color: #fff;
  }

  &__type-badge {
    left: 8px;
    top: 8px;
  }

  &__duration {
    right: 8px;
    bottom: 8px;
  }

  &__play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &__play-btn {
    display: flex;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--color-creative-violet);
    font-size: 18px;
  }

  &__content {
    padding: 8px;
  }

  &__title {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 500;
  }

  &__size {
    margin: 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
}
</style>
