<template>
  <section v-if="categoryTools.length > 0" class="tool-category-section">
    <div class="tool-category-section__header">
      <div class="tool-category-section__title-wrap">
        <ToolIcon :category="categoryKey" size="sm" />
        <h2 class="tool-category-section__title">{{ label }}</h2>
        <span class="tool-category-section__count">({{ mergedTools ? categoryTools.length : count }})</span>
      </div>
      <router-link
        v-if="showAllLink"
        :to="`/tools?category=${categoryKey}`"
        class="tool-category-section__link"
      >
        查看全部
      </router-link>
    </div>
    <div class="tool-category-section__grid">
      <ToolCard
        v-for="tool in categoryTools"
        :key="tool.id"
        variant="tile"
        :id="tool.id"
        :name="tool.name"
        :description="tool.description"
        :category="tool.category"
        :hot="tool.hot"
        :status="tool.status"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ToolCard from '@/components/cards/ToolCard.vue'
import ToolIcon from '@/components/ui/ToolIcon.vue'
import { tools, TOOL_CATEGORIES, type ToolCategory } from '@/mock/tools'
import { TOOL_CAPABILITY } from '@/lib/tool-capability'
import type { MergedTool } from '@/lib/merge-tools'

const props = withDefaults(
  defineProps<{
    categoryKey: ToolCategory
    showAllLink?: boolean
    mergedTools?: MergedTool[]
  }>(),
  { showAllLink: true }
)

const { label, count } = TOOL_CATEGORIES[props.categoryKey]

const categoryTools = computed(() => {
  if (props.mergedTools) {
    return props.mergedTools.filter((t) => t.category === props.categoryKey)
  }
  return tools
    .filter((t) => t.category === props.categoryKey)
    .map((t) => ({
      ...t,
      categoryLabel: TOOL_CATEGORIES[t.category]?.label ?? '',
      status: TOOL_CAPABILITY[t.id] ?? ('closed' as const),
      fromApi: false,
    }))
})
</script>

<style scoped lang="scss">
.tool-category-section {
  margin-bottom: 32px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__count {
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  &__link {
    font-size: 12px;
    color: var(--color-ink-secondary);
    text-decoration: none;

    &:hover {
      color: var(--color-ink-primary);
    }
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
}
</style>
