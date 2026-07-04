<template>
  <div class="result-list">
    <Spin v-if="loading" class="result-list__loading" />

    <EmptyState
      v-else-if="!results.length"
      :loading="loading"
      :results="results"
    />

    <div v-else class="result-list__scroll scroll-area">
      <ResultGroup
        v-for="group in results"
        :key="group.id"
        :group="group"
        @regenerated="emit('regenerated')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Spin } from "ant-design-vue";
import EmptyState from "./EmptyState.vue";
import ResultGroup from "./ResultGroup.vue";
import type { SaleorResultGroup } from "../utils/types";

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  regenerated: [];
}>();

const results = defineModel<SaleorResultGroup[]>("results", { default: () => [] });
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
}
</style>
