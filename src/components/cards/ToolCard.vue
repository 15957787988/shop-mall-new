<template>
  <router-link
    :to="link"
    :class="['tool-card', `tool-card--${variant}`, { 'tool-card--closed': isClosed }, className]"
  >
    <template v-if="variant === 'compact'">
      <span v-if="hot" class="tool-card__badge tool-card__badge--hot">热门</span>
      <span v-if="isClosed" class="tool-card__badge tool-card__badge--closed">未开放</span>
      <ToolIcon :category="category" size="md" />
      <div>
        <h3 class="tool-card__name">{{ name }}</h3>
        <p class="tool-card__desc">{{ description }}</p>
      </div>
    </template>

    <template v-else>
      <div :class="['tool-card__preview', gradientClass]">
        <span v-if="hot" class="tool-card__badge tool-card__badge--hot tool-card__badge--left">热门</span>
        <span v-if="isClosed" class="tool-card__badge tool-card__badge--closed">未开放</span>
        <ToolIcon :category="category" size="lg" />
      </div>
      <div class="tool-card__body">
        <h3 class="tool-card__name tool-card__name--tile">{{ name }}</h3>
        <p class="tool-card__desc tool-card__desc--tile">{{ description }}</p>
      </div>
    </template>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ToolIcon from '@/components/ui/ToolIcon.vue'
import { getToolPreviewGradient } from '@/lib/tool-preview'
import { getToolHref } from '@/lib/tool-routes'
import type { ToolCategory } from '@/mock/tools'

const props = withDefaults(
  defineProps<{
    id: string
    name: string
    description: string
    category: ToolCategory
    href?: string
    hot?: boolean
    status?: 'open' | 'closed'
    className?: string
    variant?: 'tile' | 'compact'
  }>(),
  { variant: 'tile' }
)

const isClosed = computed(() => props.status === 'closed')
const link = computed(() => props.href ?? getToolHref(props.id))
const gradientClass = computed(() => getToolPreviewGradient(props.category))
</script>

<style scoped lang="scss">
.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-surface-0);
  box-shadow: var(--shadow-soft);
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lift);
  }

  &--compact {
    gap: 12px;
    padding: 16px;

    &:hover {
      box-shadow: var(--shadow-lift);
      outline: 2px solid rgba(124, 58, 237, 0.2);
    }
  }

  &--closed {
    opacity: 0.7;
  }

  &__preview {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    width: 100%;
  }

  &__body {
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
  }

  &__badge {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 10;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);

    &--hot {
      background: var(--color-blossom-pink);
    }

    &--closed {
      background: var(--color-ink-muted);
    }

    &--left {
      left: 8px;
      right: auto;
    }
  }

  &__name {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);

    &--tile {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__desc {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    &--tile {
      margin-top: 2px;
      -webkit-line-clamp: 1;
    }
  }
}

.tool-card:hover .tool-card__name {
  color: var(--color-creative-violet);
}
</style>
