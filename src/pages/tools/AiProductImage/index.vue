<template>
  <PageContainer flush>
    <div class="saleor-page">
      <header class="saleor-page__head">
        <h1 class="saleor-page__title">AI商品套图</h1>
      </header>

      <div class="saleor-page__body">
        <aside class="saleor-page__sidebar">
          <Sidebar v-model:generating="generating" @generate="handleGenerate" />
        </aside>
        <main class="saleor-page__results">
          <ResultList
            v-model:results="results"
            :loading="loading"
            @regenerated="fetchResults(false)"
          />
        </main>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import PageContainer from "@/components/ui/PageContainer.vue";
import Sidebar from "./components/Sidebar.vue";
import ResultList from "./components/ResultList.vue";
import { useSaleorImageGroup } from "./hook/useSaleorImageGroup";
import type { SaleorFormData } from "./utils/types";

const { results, loading, generating, fetchResults, handleGenerate: submitGenerate } =
  useSaleorImageGroup();

async function handleGenerate(form: SaleorFormData, done: () => void) {
  try {
    await submitGenerate(form);
  } finally {
    done();
  }
}
</script>

<style scoped lang="scss">
.saleor-page {
  display: flex;
  height: calc(100vh - 48px);
  flex-direction: column;
  overflow: hidden;

  &__head {
    flex-shrink: 0;
    padding: 12px 16px 8px;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__body {
    display: flex;
    min-height: 0;
    flex: 1;
    gap: 10px;
    padding: 0 10px 10px;
  }

  &__sidebar {
    width: 370px;
    flex-shrink: 0;
    min-height: 0;
  }

  &__results {
    min-width: 0;
    flex: 1;
    min-height: 0;
  }
}

@media (max-width: 960px) {
  .saleor-page {
    height: auto;
    min-height: calc(100vh - 48px);
    overflow: visible;

    &__body {
      flex-direction: column;
    }

    &__sidebar {
      width: 100%;
      height: auto;
    }

    &__results {
      min-height: 480px;
    }
  }
}
</style>
