<template>
  <div class="result-list">
    <Spin v-if="loading" class="result-list__loading" />

    <EmptyState
      v-else-if="!results.length"
      :loading="loading"
      :results="results"
    />

    <div v-else ref="scrollRef" class="result-list__scroll scroll-area">
      <ResultGroup
        v-for="group in pagedResults"
        :key="group.id"
        :group="group"
        :refresh-results="refreshResults"
        @regenerated="emit('regenerated')"
      />
      <Pagination
        v-if="results.length > pageSize"
        v-model:current="currentPage"
        :total="results.length"
        :page-size="pageSize"
        :show-size-changer="false"
        class="result-list__pagination"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, nextTick } from "vue";
import { Spin, Pagination } from "ant-design-vue";
import EmptyState from "./EmptyState.vue";
import ResultGroup from "./ResultGroup.vue";
import type { SaleorResultGroup } from "../utils/types";

interface LazyloadInstance {
  config: (options: { observerOptions?: IntersectionObserverInit }) => void;
}

defineProps<{
  loading?: boolean;
  refreshResults?: () => Promise<void>;
}>();

const results = defineModel<SaleorResultGroup[]>("results", { default: () => [] });

const pageSize = 10;
const currentPage = ref(1);
const scrollRef = ref<HTMLElement>();
const lazyload = inject<LazyloadInstance>("Lazyload");

const pagedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return results.value.slice(start, start + pageSize);
});

const emit = defineEmits<{
  regenerated: [];
}>();

function bindLazyRoot() {
  if (scrollRef.value && lazyload) {
    lazyload.config({
      observerOptions: { root: scrollRef.value, rootMargin: "0px", threshold: 0 },
    });
  }
}

onMounted(() => {
  bindLazyRoot();
});

watch(scrollRef, async () => {
  await nextTick();
  bindLazyRoot();
});

onUnmounted(() => {
  lazyload?.config({
    observerOptions: { root: null, rootMargin: "0px", threshold: 0 },
  });
});
</script>

<style scoped lang="scss">
.result-list {
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-surface-2);

  &__loading {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }

  &__scroll {
    height: 100%;
    padding: 16px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    padding: 12px 0 4px;
  }
}
</style>
