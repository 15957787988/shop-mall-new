<template>
  <PageContainer>
    <div v-if="loading" class="tools-page__loading">
      <LoadingOutlined spin />
      正在同步工具列表...
    </div>

    <p v-if="query" class="tools-page__summary">搜索「{{ query }}」共 {{ filtered.length }} 个结果</p>

    <div class="tools-page__filters">
      <FilterChips :options="categoryLabels" :selected="selectedLabel" @select="handleCategorySelect" />
      <button
        type="button"
        :class="['tools-page__hot-btn', { 'tools-page__hot-btn--active': hotOnly }]"
        @click="hotOnly = !hotOnly"
      >
        仅看热门
      </button>
    </div>

    <template v-if="showGrouped">
      <ToolCategorySection
        v-for="key in CATEGORY_KEYS"
        :key="key"
        :category-key="key"
        :merged-tools="mergedTools"
      />
    </template>

    <div v-else class="tools-page__grid">
      <ToolCard
        v-for="tool in filtered"
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

    <p v-if="!showGrouped && filtered.length === 0" class="tools-page__empty">暂无匹配工具</p>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LoadingOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import FilterChips from '@/components/filters/FilterChips.vue'
import ToolCategorySection from '@/components/tools/ToolCategorySection.vue'
import ToolCard from '@/components/cards/ToolCard.vue'
import { CATEGORY_KEYS } from '@/lib/tool-categories'
import { getMergedTools, getLocalMergedTools, type MergedTool } from '@/lib/merge-tools'
import { TOOL_CATEGORIES, type ToolCategory } from '@/mock/tools'

const route = useRoute()

const category = ref<string>('全部')
const hotOnly = ref(false)
const query = ref('')
const mergedTools = ref<MergedTool[]>(getLocalMergedTools())
const loading = ref(true)

const syncFromRoute = () => {
  const catParam = String(route.query.category ?? '')
  const qParam = String(route.query.q ?? '')
  if (catParam && CATEGORY_KEYS.includes(catParam as ToolCategory)) {
    category.value = catParam
  }
  query.value = qParam
}

watch(() => route.query, syncFromRoute, { immediate: true })

onMounted(() => {
  let cancelled = false
  loading.value = true
  getMergedTools()
    .then((list) => {
      if (!cancelled) mergedTools.value = list
    })
    .catch(() => {
      if (!cancelled) mergedTools.value = getLocalMergedTools()
    })
    .finally(() => {
      if (!cancelled) loading.value = false
    })

  return () => {
    cancelled = true
  }
})

const filtered = computed(() =>
  mergedTools.value.filter((t) => {
    if (category.value !== '全部' && t.category !== category.value) return false
    if (hotOnly.value && !t.hot) return false
    if (query.value && !t.name.includes(query.value)) return false
    return true
  })
)

const categoryLabels = CATEGORY_KEYS.map((k) => TOOL_CATEGORIES[k].label)

const selectedLabel = computed(() =>
  category.value === '全部'
    ? '全部'
    : TOOL_CATEGORIES[category.value as ToolCategory]?.label ?? '全部'
)

const showGrouped = computed(() => category.value === '全部' && !hotOnly.value && !query.value)

const handleCategorySelect = (label: string) => {
  if (label === '全部') {
    category.value = '全部'
    return
  }
  const key = CATEGORY_KEYS.find((k) => TOOL_CATEGORIES[k].label === label)
  category.value = key ?? '全部'
}
</script>

<style scoped lang="scss">
.tools-page {
  &__loading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__summary {
    margin: 0 0 16px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__filters {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  &__hot-btn {
    align-self: flex-start;
    min-height: 36px;
    padding: 6px 12px;
    border-radius: 9999px;
    border: 1px solid var(--color-border-whisper);
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    cursor: pointer;

    &--active {
      border-color: var(--color-blossom-pink);
      background: var(--color-blossom-pink);
      color: #fff;
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

  &__empty {
    padding: 48px 0;
    text-align: center;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }
}
</style>
