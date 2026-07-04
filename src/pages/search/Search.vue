<template>
  <PageContainer>
    <p v-if="!q" class="search-page__empty">请输入关键词搜索已开放的 AI 工具</p>

    <template v-else>
      <p class="search-page__summary">
        搜索「{{ q }}」· 找到 {{ total }} 个开放工具
      </p>

      <section v-if="matchedOpenTools.length > 0" class="search-page__section">
        <h3 class="search-page__heading">
          AI 工具 ({{ matchedOpenTools.length }})
        </h3>
        <div class="search-page__grid">
          <ToolCard
            v-for="tool in matchedOpenTools"
            :id="tool.id"
            :key="tool.id"
            variant="tile"
            :name="tool.name"
            :description="tool.description"
            :category="tool.category"
            :hot="tool.hot"
          />
        </div>
      </section>

      <p v-if="total === 0" class="search-page__empty">
        未找到匹配的开放工具，试试其他关键词
      </p>

      <section class="search-page__templates">
        <FeatureUnavailable
          title="模板搜索"
          subtitle="模板功能正在建设中，暂不支持搜索"
        />
      </section>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PageContainer from "@/components/ui/PageContainer.vue";
import ToolCard from "@/components/cards/ToolCard.vue";
import FeatureUnavailable from "@/components/features/FeatureUnavailable.vue";
import { tools } from "@/mock/tools";
import { isToolOpen } from "@/lib/tool-capability";

const route = useRoute();

const q = computed(() => String(route.query.q ?? "").trim());

const matchedOpenTools = computed(() =>
  q.value
    ? tools.filter(
        (t) =>
          isToolOpen(t.id) &&
          (t.name.includes(q.value) || t.description.includes(q.value))
      )
    : []
);

const total = computed(() => matchedOpenTools.value.length);
</script>

<style scoped lang="scss">
.search-page {
  &__empty {
    padding: 48px 0;
    text-align: center;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__summary {
    margin: 0 0 24px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__section {
    margin-bottom: 32px;
  }

  &__heading {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    @media (min-width: 640px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @media (min-width: 1280px) {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  &__templates {
    padding-top: 32px;
    border-top: 1px solid var(--color-border-whisper);
  }
}
</style>
