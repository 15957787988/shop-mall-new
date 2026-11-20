<template>
  <nav v-if="total > 0" ref="root" class="result-pagination" aria-label="作品分页">
    <Pagination
      :current="current"
      :total="total"
      :page-size="pageSize"
      :disabled="loading"
      :show-size-changer="false"
      :show-less-items="true"
      @change="emit('change', $event)"
    />
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Pagination } from 'ant-design-vue'

interface Props { current: number; total: number; pageSize: number; loading?: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ change: [page: number] }>()
const root = ref<HTMLElement>()
watch(() => props.current, () => {
  root.value?.closest('.scroll-area')?.scrollTo({ top: 0 })
}, { flush: 'post' })
</script>

<style scoped lang="scss">
.result-pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
  :deep(.ant-pagination) { display: flex; align-items: center; gap: 8px; }
  :deep(.ant-pagination-item), :deep(.ant-pagination-prev), :deep(.ant-pagination-next),
  :deep(.ant-pagination-jump-prev), :deep(.ant-pagination-jump-next) {
    min-width: 38px;
    height: 38px;
    margin: 0;
    line-height: 36px;
    border-radius: 10px;
  }
  :deep(.ant-pagination-item) { background: transparent; border-color: transparent; }
  :deep(.ant-pagination-item a) { color: var(--color-ink-primary); }
  :deep(.ant-pagination-item-active) {
    border-color: var(--color-proposal-blue);
    background: var(--color-surface-0);
  }
  :deep(.ant-pagination-item-active a) { color: var(--color-proposal-blue); }
  :deep(.ant-pagination-item:hover), :deep(.ant-pagination-item:focus-visible) {
    border-color: var(--color-proposal-blue);
  }
  :deep(.ant-pagination-disabled .ant-pagination-item-link) { color: var(--color-ink-quaternary); }
}
</style>
