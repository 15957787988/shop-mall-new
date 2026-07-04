<template>
  <div v-if="filters.length > 0" class="active-filter-pills">
    <button
      v-for="filter in filters"
      :key="filter.key"
      type="button"
      class="active-filter-pills__pill"
      @click="filter.onClear()"
    >
      <span>{{ filter.label }}·{{ filter.value }}</span>
      <CloseOutlined />
    </button>
    <button type="button" class="active-filter-pills__clear" @click="emit('clearAll')">清空</button>
  </div>
</template>

<script setup lang="ts">
import { CloseOutlined } from '@ant-design/icons-vue'

export interface ActiveFilter {
  key: string
  label: string
  value: string
  onClear: () => void
}

defineProps<{
  filters: ActiveFilter[]
}>()

const emit = defineEmits<{
  clearAll: []
}>()
</script>

<style scoped lang="scss">
.active-filter-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  &__pill {
    display: inline-flex;
    min-height: 28px;
    align-items: center;
    gap: 4px;
    border: none;
    border-radius: 9999px;
    background: rgba(109, 40, 217, 0.1);
    padding: 2px 10px;
    font-size: 11px;
    color: var(--color-creative-violet);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: rgba(109, 40, 217, 0.15);
    }
  }

  &__clear {
    border: none;
    background: none;
    font-size: 11px;
    color: var(--color-ink-secondary);
    cursor: pointer;

    &:hover {
      color: var(--color-ink-primary);
      text-decoration: underline;
    }
  }
}
</style>
