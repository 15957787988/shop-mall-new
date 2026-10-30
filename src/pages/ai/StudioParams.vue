<template>
  <ul v-if="items.length" class="params" :data-inset="inset ? 'true' : undefined">
    <li v-for="item in items" :key="item.label">
      <span>{{ item.label }}</span>
      {{ item.value }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StudioWork } from './api'

const props = defineProps<{
  work: StudioWork
  inset?: boolean
}>()

function pointText(value: number | undefined) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= 0) return ''
  return String(Number(Number(value).toFixed(3)))
}

const items = computed(() => {
  const rows: { label: string; value: string }[] = []
  if (props.work.ratio) rows.push({ label: '比例', value: props.work.ratio })
  if (props.work.resolution) rows.push({ label: '分辨率', value: props.work.resolution })
  if (props.work.duration) rows.push({ label: '时长', value: `${props.work.duration}s` })
  const points = pointText(props.work.points)
  if (points) rows.push({ label: '积分', value: points })
  return rows
})
</script>

<style lang="scss" scoped>
.params {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;

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
  }

  span {
    color: var(--color-ink-muted);
  }
}
</style>
