<template>
  <ul v-if="items.length" class="params" :data-inset="inset ? 'true' : undefined" :data-inline="inline ? 'true' : undefined" aria-label="生成设置">
    <li v-for="item in items" :key="item.label">
      <span>{{ item.label }}</span>
      {{ item.value }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generationSettingItems, type GenerationSettings } from '@/lib/creation/generation-settings'

interface Props {
  work: GenerationSettings
  inset?: boolean
  inline?: boolean
  showPoints?: boolean
}
const props = withDefaults(defineProps<Props>(), { showPoints: true })

const items = computed(() => generationSettingItems(props.work, props.showPoints))
</script>

<style lang="scss" scoped>
.params {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  min-width: 0;

  &[data-inline='true'] { margin: 0; }

  &[data-inset='true'] {
    margin: 0;
    padding: 0 16px 12px;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    background: var(--color-surface-2);
    padding: 2px 8px;
    font-size: 12px;
    color: var(--color-ink-primary);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  span {
    color: var(--color-ink-muted);
  }
}
</style>
