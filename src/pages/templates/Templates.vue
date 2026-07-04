<template>
  <PageContainer>
    <div v-if="loading" class="templates-page__loading">
      <LoadingOutlined spin />
    </div>

    <div v-else-if="error || !catalog" class="templates-page__error">
      <p class="templates-page__error-title">模板数据加载失败</p>
      <p class="templates-page__error-desc">
        {{ error ?? '请运行 scripts/clone-designkit-templates.py 生成数据' }}
      </p>
    </div>

    <template v-else>
      <div class="templates-page__header">
        <h1 class="templates-page__title">模板中心</h1>
        <p class="templates-page__subtitle">
          已导入 {{ catalog.meta.count.toLocaleString() }} 个设计模板 · 更新于 {{ catalog.meta.clonedAt }}
        </p>
      </div>

      <div class="templates-page__filters">
        <FilterChips
          :options="catalog.filterOptions.scenes"
          :selected="scene"
          @select="(v) => { scene = v; page = 1 }"
        />
        <div class="templates-page__sort">
          <span>排序</span>
          <select v-model="sort" class="templates-page__sort-select">
            <option v-for="item in catalog.filterOptions.sorts" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </div>
      </div>

      <p class="templates-page__count">共 {{ filtered.length.toLocaleString() }} 个模板</p>

      <div class="templates-page__grid">
        <TemplateCard v-for="item in pageItems" :key="item.id" :template="item" />
      </div>

      <div v-if="filtered.length === 0" class="templates-page__empty">
        <div class="templates-page__empty-icon">🎨</div>
        <p class="templates-page__empty-title">暂无匹配模板</p>
        <p class="templates-page__empty-desc">请调整筛选条件，或浏览全部模板</p>
      </div>

      <div v-if="totalPages > 1" class="templates-page__pagination">
        <template v-for="(n, idx) in visiblePages" :key="`${n}-${idx}`">
          <span v-if="idx > 0 && n - visiblePages[idx - 1] > 1" class="templates-page__ellipsis">…</span>
          <button
            type="button"
            :class="['templates-page__page-btn', { 'templates-page__page-btn--active': n === page }]"
            @click="page = n"
          >
            {{ n }}
          </button>
        </template>
      </div>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { LoadingOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import FilterChips from '@/components/filters/FilterChips.vue'
import TemplateCard from '@/components/cards/TemplateCard.vue'
import { sortTemplates } from '@/lib/templates/sort'
import type { Template, TemplateCatalog } from '@/lib/templates/types'

const PAGE_SIZE = 24

const ORIENTATION_MAP: Record<string, Template['orientation']> = {
  方形: 'square',
  竖版: 'portrait',
  横版: 'landscape',
}

const route = useRoute()

const catalog = ref<TemplateCatalog | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const scene = ref('全部')
const purpose = ref('全部')
const industry = ref('全部')
const style = ref('全部')
const orientation = ref('全部')
const sort = ref('综合排序')
const page = ref(1)

const syncFromRoute = () => {
  if (route.query.scene) scene.value = String(route.query.scene)
  if (route.query.purpose) purpose.value = String(route.query.purpose)
  if (route.query.industry) industry.value = String(route.query.industry)
  if (route.query.sort === 'hot') sort.value = '最多下载'
}

watch(() => route.query, syncFromRoute, { immediate: true })

onMounted(() => {
  fetch('/data/templates.json')
    .then((res) => {
      if (!res.ok) throw new Error(`加载失败 (${res.status})`)
      return res.json() as Promise<TemplateCatalog>
    })
    .then((data) => {
      catalog.value = data
    })
    .catch((err: Error) => {
      error.value = err.message
    })
    .finally(() => {
      loading.value = false
    })
})

const filtered = computed(() => {
  if (!catalog.value) return []
  const list = catalog.value.templates.filter((item) => {
    if (scene.value !== '全部' && item.scene !== scene.value) return false
    if (purpose.value !== '全部' && item.purpose !== purpose.value) return false
    if (industry.value !== '全部' && item.industry !== industry.value) return false
    if (style.value !== '全部' && item.style !== style.value) return false
    if (orientation.value !== '全部' && item.orientation !== ORIENTATION_MAP[orientation.value]) {
      return false
    }
    return true
  })
  return sortTemplates(list, sort.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))

const pageItems = computed(() =>
  filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)

const visiblePages = computed(() => {
  const pages = Array.from({ length: totalPages.value }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages.value || Math.abs(n - page.value) <= 2
  )
  return pages
})
</script>

<style scoped lang="scss">
.templates-page {
  &__loading {
    display: flex;
    min-height: 320px;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-tertiary);
  }

  &__error {
    padding: 32px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 12px;
    background: var(--color-surface-0);
    text-align: center;
  }

  &__error-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__error-desc {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__header {
    margin-bottom: 16px;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__filters {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__sort {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__sort-select {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid var(--color-border-whisper);
    background: var(--color-surface-0);
    font-size: 12px;
    outline: none;
  }

  &__count {
    margin: 0 0 16px;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;

    @media (min-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (min-width: 1280px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64px 0;
    text-align: center;
  }

  &__empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    border-radius: 16px;
    background: var(--color-surface-2);
    font-size: 24px;
  }

  &__empty-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__empty-desc {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
  }

  &__ellipsis {
    padding: 0 4px;
    font-size: 12px;
    color: var(--color-ink-tertiary);
  }

  &__page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border: none;
    border-radius: 6px;
    background: var(--color-canvas-mist);
    font-size: 14px;
    color: var(--color-ink-secondary);
    cursor: pointer;

    &--active {
      background: var(--color-creative-violet);
      color: #fff;
    }
  }
}
</style>
