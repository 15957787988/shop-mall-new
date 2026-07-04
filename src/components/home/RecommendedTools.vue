<template>
  <section class="recommended-tools animate-fade-up">
    <h2 class="recommended-tools__title">推荐工具</h2>

    <div v-if="loading" class="recommended-tools__loading">
      <a-spin />
    </div>

    <div v-else class="recommended-tools__layout">
      <div class="recommended-tools__featured">
        <router-link
          v-for="tool in FEATURED_TOOLS"
          :key="tool.id"
          :to="tool.linkUrl"
          class="recommended-tools__featured-card"
          :style="getFeaturedStyle(tool.id)"
        >
          <div>
            <h3 class="recommended-tools__featured-name" :style="getFeaturedAccent(tool.id)">
              {{ tool.name }}
            </h3>
            <p class="recommended-tools__featured-desc">{{ tool.description }}</p>
          </div>
          <span class="recommended-tools__featured-action" :style="getFeaturedAccent(tool.id)">
            立即使用
            <ArrowRightOutlined />
          </span>
        </router-link>
      </div>
      <div class="recommended-tools__grid">
        <router-link
          v-for="tool in displayGrid"
          :key="tool.id"
          :to="tool.linkUrl || getToolHref(tool.id)"
          class="recommended-tools__grid-card"
        >
          <ToolIcon :category="tool.category" size="sm" />
          <span class="recommended-tools__grid-name">{{ tool.name }}</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRightOutlined } from '@ant-design/icons-vue'
import ToolIcon from '@/components/ui/ToolIcon.vue'
import { tools, type ToolCategory } from '@/mock/tools'
import { getQuickCreateList, type QuickCreateItem } from '@/pages/home/api'
import { apiEnv } from '@/service/env'
import { getToolHref, parseToolIdFromLinkUrl } from '@/lib/tool-routes'

interface DisplayTool {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon?: string
  linkUrl?: string
}

const FEATURED_TOOLS: DisplayTool[] = [
  {
    id: 't1',
    name: 'AI商品套图',
    description: '一键生成电商商品套图',
    category: 'ai-shoot',
    linkUrl: '/tools/ai-product-image',
  },
  {
    id: 't8',
    name: '爆款视频',
    description: '复刻热门带货视频',
    category: 'video',
    linkUrl: '/tools/viral-videos',
  },
]

const GRID_IDS = ['t20', 't21', 't22', 't23', 't26', 't28', 't24', 't25'] as const
const FEATURED_GRAD: Record<string, { from: string; to: string; accent: string }> = {
  t1: { from: '#E0F2FE', to: '#EDE9FE', accent: '#0284C7' },
  t8: { from: '#D1FAE5', to: '#ECFDF5', accent: '#059669' },
}

const useMock = apiEnv.useMock

function getTool(id: string) {
  return tools.find((t) => t.id === id)
}

function quickCreateToDisplay(item: QuickCreateItem): DisplayTool {
  const toolId = parseToolIdFromLinkUrl(item.linkUrl)
  const local = toolId ? tools.find((t) => t.id === toolId) : undefined
  return {
    id: toolId ?? String(item.id),
    name: item.name ?? local?.name ?? '',
    description: item.description ?? local?.description ?? '',
    category: local?.category ?? 'design',
    icon: item.icon,
    linkUrl: item.linkUrl,
  }
}

const quickItems = ref<DisplayTool[] | null>(null)
const loading = ref(false)

onMounted(async () => {
  if (useMock) {
    quickItems.value = null
    return
  }

  loading.value = true
  try {
    const items = await getQuickCreateList()
    quickItems.value = items.length > 0 ? items.map(quickCreateToDisplay) : null
  } catch {
    quickItems.value = null
  } finally {
    loading.value = false
  }
})

const useApiData = computed(() => quickItems.value !== null && quickItems.value.length >= 4)

const displayGrid = computed(() => {
  if (useApiData.value) {
    return quickItems.value!.slice(2, 10)
  }
  return GRID_IDS.map(getTool).filter(Boolean) as DisplayTool[]
})

function getFeaturedStyle(id: string) {
  const gradient = FEATURED_GRAD[id]
  if (!gradient) {
    return {}
  }
  return {
    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
  }
}

function getFeaturedAccent(id: string) {
  const gradient = FEATURED_GRAD[id]
  if (!gradient) {
    return {}
  }
  return { color: gradient.accent }
}
</script>

<style scoped lang="scss">
.recommended-tools {
  margin-bottom: var(--spacing-section);

  &__title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__loading {
    display: flex;
    min-height: 160px;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-tertiary);
  }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: 1024px) {
      flex-direction: row;
    }
  }

  &__featured {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 12px;

    @media (min-width: 640px) {
      flex-direction: row;
    }

    @media (min-width: 1024px) {
      width: 280px;
      flex-direction: column;
    }
  }

  &__featured-card {
    display: flex;
    min-height: 88px;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px;
    border-radius: 12px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lift);

      .recommended-tools__featured-action {
        opacity: 1;
      }
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__featured-name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__featured-desc {
    margin: 4px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__featured-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &__grid {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  &__grid-card {
    display: flex;
    min-height: 72px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 4px;
    border-radius: 12px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lift);
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__grid-name {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-align: center;
    font-size: 10px;
    font-weight: 500;
    color: var(--color-ink-primary);

    @media (min-width: 640px) {
      font-size: 12px;
    }
  }
}
</style>
