<template>
  <div class="result-list">
    <GenerationLoading v-if="loading && !results.length" label="正在读取作品…" class="result-list__loading" />

    <EmptyState v-else-if="!results.length" :loading="loading" :results="results" />

    <div v-else ref="scrollRef" class="result-list__scroll">
      <ResultGroup
        v-for="group in results"
        :key="group.id"
        :group="group"
        :refresh-results="refreshResults"
        @regenerated="emit('regenerated')"
      />
      <ResultPagination :current="page" :total="total" :page-size="pageSize" :loading="loading" @change="emit('change-page', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ResultPagination from '@/components/ui/ResultPagination.vue'
import { ref, inject, onMounted, onUnmounted, watch, nextTick } from 'vue'
import GenerationLoading from '@/components/ui/GenerationLoading.vue'
import EmptyState from './EmptyState.vue'
import ResultGroup from './ResultGroup.vue'
import type { SaleorResultGroup } from '../utils/types'

interface LazyloadInstance {
  config: (options: { observerOptions?: IntersectionObserverInit }) => void
}

interface Props {
  loading?: boolean
  page: number
  total: number
  pageSize: number
  refreshResults?: () => Promise<void>
}
defineProps<Props>()

const results = defineModel<SaleorResultGroup[]>('results', { default: () => [] })

const scrollRef = ref<HTMLElement>()
const lazyload = inject<LazyloadInstance>('Lazyload')

const emit = defineEmits<{
  regenerated: []
  'change-page': [page: number]
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
