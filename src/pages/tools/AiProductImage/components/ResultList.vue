<template>
  <div class="result-list">
    <Spin v-if="loading" class="result-list__loading" />

    <EmptyState v-else-if="!results.length" :loading="loading" :results="results" />

    <div v-else ref="scrollRef" class="result-list__scroll">
      <ResultGroup
        v-for="group in pagedResults"
        :key="group.id"
        :group="group"
        :refresh-results="refreshResults"
        @regenerated="emit('regenerated')"
      />
      <AutoLoadMore :has-more="pagedResults.length < results.length || !!hasMore" :loading="loadingMore" :count="pagedResults.length" @load="pagedResults.length < results.length ? currentPage++ : emit('load-more')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AutoLoadMore from '@/components/ui/AutoLoadMore.vue'
import { ref, computed, inject, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Spin } from 'ant-design-vue'
import EmptyState from './EmptyState.vue'
import ResultGroup from './ResultGroup.vue'
import type { SaleorResultGroup } from '../utils/types'

interface LazyloadInstance {
  config: (options: { observerOptions?: IntersectionObserverInit }) => void
}

defineProps<{
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  refreshResults?: () => Promise<void>
}>()

const results = defineModel<SaleorResultGroup[]>('results', { default: () => [] })

const pageSize = 10
const currentPage = ref(1)
const scrollRef = ref<HTMLElement>()
const lazyload = inject<LazyloadInstance>('Lazyload')

const pagedResults = computed(() => {
  return results.value.slice(0, currentPage.value * pageSize)
})

const emit = defineEmits<{
  regenerated: []
  'load-more': []
}>()

function bindLazyRoot() {
  if (scrollRef.value && lazyload) {
    lazyload.config({
      observerOptions: { root: scrollRef.value.closest('.saleor-page__results'), rootMargin: '0px', threshold: 0 },
    })
  }
}

onMounted(() => {
  bindLazyRoot()
})

watch(scrollRef, async () => {
  await nextTick()
  bindLazyRoot()
})

onUnmounted(() => {
  lazyload?.config({
    observerOptions: { root: null, rootMargin: '0px', threshold: 0 },
  })
})
</script>

<style scoped lang="scss">
.result-list {
  min-height: 100%;

  &__loading {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }

  &__scroll {
    min-height: 0;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    padding: 12px 0 4px;
  }
}
</style>
