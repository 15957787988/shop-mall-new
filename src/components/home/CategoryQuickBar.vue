<template>
  <div class="category-quick-bar">
    <router-link
      v-for="[key, { label }] in quickCategories"
      :key="key"
      :to="`/tools?category=${key}`"
      class="category-quick-bar__item"
    >
      <ToolIcon :category="key" size="md" />
      <span class="category-quick-bar__label">{{ label }}</span>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import ToolIcon from '@/components/ui/ToolIcon.vue'
import { TOOL_CATEGORIES, type ToolCategory } from '@/mock/tools'

const quickCategories = (
  Object.entries(TOOL_CATEGORIES) as [ToolCategory, { label: string; count: number }][]
).filter(([, v]) => v.count > 0)
</script>

<style scoped lang="scss">
.category-quick-bar {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &__item {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    background: var(--color-surface-0);
    padding: 12px 16px;
    box-shadow: var(--shadow-soft);
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lift);
    }
  }

  &__label {
    white-space: nowrap;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }
}
</style>
