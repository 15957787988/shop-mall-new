<template>
  <time v-if="date" class="studio-work-date">{{ date }}</time>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime } from '@/lib/formatTime'
import type { StudioWork } from '@/service/api/studio'
interface Props {
  value?: StudioWork['createTime']
}
const props = defineProps<Props>()
const date = computed(() => {
  const value = props.value
  return formatDateTime(
    Array.isArray(value)
      ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0)
      : value
  )
})
</script>
<style scoped lang="scss">
.studio-work-date {
  display: block;
  flex-shrink: 0;
  margin: auto 16px 16px;
  padding-top: 12px;
  text-align: right;
  font-size: 12px;
  color: var(--color-ink-muted);
}
</style>
