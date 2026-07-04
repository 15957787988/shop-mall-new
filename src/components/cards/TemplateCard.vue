<template>
  <RouterLink
    :to="`/templates/${template.id}`"
    class="template-card"
    :class="className"
  >
    <article>
      <div class="template-card__media" :class="aspectClass || defaultAspect">
        <img
          :src="template.thumbnail"
          :alt="template.title"
          loading="lazy"
          class="template-card__img"
        />
        <span class="template-card__type-badge">
          {{ template.type === 'video' ? '视频' : '图片' }}
        </span>
        <span v-if="template.type === 'video' && template.duration" class="template-card__duration">
          {{ template.duration }}
        </span>
        <div v-if="template.type === 'video'" class="template-card__play-overlay">
          <span class="template-card__play-btn">
            <PlayCircleOutlined />
          </span>
        </div>
        <div class="template-card__hover-bar">
          <span>使用模板</span>
        </div>
      </div>
      <div class="template-card__body">
        <h3 class="template-card__title">{{ template.title }}</h3>
        <div class="template-card__meta">
          <span>{{ template.size }}</span>
          <span>{{ template.downloads.toLocaleString() }} 次下载</span>
        </div>
        <div class="template-card__tags">
          <span class="template-card__tag template-card__tag--scene">{{ template.scene }}</span>
          <span class="template-card__tag">{{ template.style }}</span>
        </div>
      </div>
    </article>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import type { Template } from '@/lib/templates/types'

const props = defineProps<{
  template: Template
  className?: string
  aspectClass?: string
}>()

const defaultAspect = computed(() => {
  if (props.template.orientation === 'portrait') return 'template-card__media--portrait'
  if (props.template.orientation === 'landscape') return 'template-card__media--landscape'
  return 'template-card__media--square'
})
</script>

<style scoped lang="scss">
.template-card {
  display: block;
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-surface-0);
  box-shadow: var(--shadow-soft);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lift);

    .template-card__img {
      transform: scale(1.05);
    }

    .template-card__play-overlay {
      opacity: 1;
    }

    .template-card__hover-bar {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(0.98);
  }

  &__media {
    position: relative;
    overflow: hidden;
    background: var(--color-surface-2);

    &--square {
      aspect-ratio: 1;
    }

    &--portrait {
      aspect-ratio: 3 / 4;
    }

    &--landscape {
      aspect-ratio: 4 / 3;
    }
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }

  &__type-badge {
    position: absolute;
    left: 8px;
    top: 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 6px;
    font-size: 10px;
    color: white;
  }

  &__duration {
    position: absolute;
    bottom: 8px;
    right: 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 6px;
    font-size: 10px;
    color: white;
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
    height: 40px;
    width: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--color-creative-violet);
    font-size: 18px;
  }

  &__hover-bar {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    display: flex;
    align-items: flex-end;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    padding: 12px;
    opacity: 0;
    transition: opacity 0.2s;

    span {
      font-size: 12px;
      font-weight: 500;
      color: white;
    }
  }

  &__body {
    padding: 12px;
  }

  &__title {
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
  }

  &__meta {
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__tags {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__tag {
    border-radius: 4px;
    background: var(--color-surface-2);
    padding: 2px 6px;
    font-size: 10px;
    color: var(--color-ink-secondary);

    &--scene {
      background: rgba(109, 40, 217, 0.1);
      color: var(--color-creative-violet);
    }
  }
}
</style>
