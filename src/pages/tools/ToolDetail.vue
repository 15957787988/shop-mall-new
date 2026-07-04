<template>
  <PageContainer v-if="tool">
    <router-link to="/tools" class="tool-detail__back">
      <ArrowLeftOutlined />
      返回工具列表
    </router-link>

    <div class="tool-detail__card">
      <div class="tool-detail__hero">
        <ToolIcon :category="tool.category" size="lg" />
        <div class="tool-detail__info">
          <div class="tool-detail__tags">
            <h1 class="tool-detail__title">{{ tool.name }}</h1>
            <span v-if="tool.hot" class="tool-detail__badge tool-detail__badge--hot">热门</span>
            <span v-if="!open" class="tool-detail__badge tool-detail__badge--closed">未开放</span>
            <span v-if="categoryLabel" class="tool-detail__badge tool-detail__badge--category">
              {{ categoryLabel }}
            </span>
          </div>
          <p class="tool-detail__desc">{{ tool.description }}</p>
          <p class="tool-detail__cost">消耗约 10–50 算力 / 次（视复杂度而定）</p>
          <router-link
            v-if="open"
            :to="getToolWorkspaceHref(tool.id)"
            class="tool-detail__cta tool-detail__cta--active"
          >
            <ThunderboltOutlined />
            开始创作
          </router-link>
          <span v-else class="tool-detail__cta tool-detail__cta--disabled" title="功能未开放，敬请期待">
            <LockOutlined />
            开始创作
          </span>
        </div>
      </div>

      <div class="tool-detail__steps">
        <div v-for="(step, i) in steps" :key="step" class="tool-detail__step">
          <span class="tool-detail__step-num">步骤 {{ i + 1 }}</span>
          <p class="tool-detail__step-label">{{ step }}</p>
        </div>
      </div>
    </div>
  </PageContainer>

  <PageContainer v-else>
    <FeatureUnavailable title="工具不存在" subtitle="该工具可能已下架或链接有误" full-page />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftOutlined, ThunderboltOutlined, LockOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import ToolIcon from '@/components/ui/ToolIcon.vue'
import FeatureUnavailable from '@/components/features/FeatureUnavailable.vue'
import { tools, TOOL_CATEGORIES, type ToolCategory } from '@/mock/tools'
import { isToolOpen } from '@/lib/tool-capability'
import { getToolWorkspaceHref } from '@/lib/tool-routes'

const route = useRoute()
const steps = ['上传素材', 'AI 智能处理', '导出成品']

const tool = computed(() => tools.find((t) => t.id === route.params.id))

const categoryLabel = computed(() => {
  if (!tool.value) return undefined
  return TOOL_CATEGORIES[tool.value.category as ToolCategory]?.label
})

const open = computed(() => (tool.value ? isToolOpen(tool.value.id) : false))
</script>

<style scoped lang="scss">
.tool-detail {
  &__back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 16px;
    font-size: 14px;
    color: var(--color-ink-secondary);
    text-decoration: none;

    &:hover {
      color: var(--color-creative-violet);
    }
  }

  &__card {
    padding: 24px;
    border-radius: 12px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);

    @media (min-width: 768px) {
      padding: 32px;
    }
  }

  &__hero {
    display: flex;
    flex-direction: column;
    gap: 24px;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__info {
    flex: 1;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;

    @media (min-width: 768px) {
      font-size: 24px;
    }
  }

  &__badge {
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 12px;

    &--hot {
      background: var(--color-blossom-pink);
      color: #fff;
    }

    &--closed {
      background: var(--color-ink-muted);
      color: #fff;
    }

    &--category {
      background: var(--color-surface-2);
      color: var(--color-ink-secondary);
    }
  }

  &__desc {
    margin: 12px 0 0;
    font-size: 14px;
    color: var(--color-ink-secondary);

    @media (min-width: 768px) {
      font-size: 16px;
    }
  }

  &__cost {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    min-height: 44px;
    padding: 8px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;

    &--active {
      background: var(--color-creative-violet);
      color: #fff;
      transition: all 0.2s;

      &:hover {
        box-shadow: var(--shadow-lift);
      }
    }

    &--disabled {
      background: rgba(156, 163, 175, 0.3);
      color: var(--color-ink-tertiary);
      cursor: not-allowed;
    }
  }

  &__steps {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--color-border-whisper);

    @media (min-width: 640px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__step {
    padding: 16px;
    border-radius: 8px;
    background: var(--color-surface-2);
    text-align: center;
  }

  &__step-num {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-creative-violet);
  }

  &__step-label {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
