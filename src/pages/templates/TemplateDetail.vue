<template>
  <PageContainer>
    <p v-if="loading" class="template-detail__loading">加载中…</p>

    <FeatureUnavailable
      v-else-if="notFound || !template"
      title="模板不存在"
      subtitle="该模板可能已下架或链接有误"
      full-page
    />

    <template v-else>
      <router-link to="/templates" class="template-detail__back">
        <ArrowLeftOutlined />
        返回模板中心
      </router-link>

      <div class="template-detail__layout">
        <div class="template-detail__preview">
          <img :src="template.thumbnail" :alt="template.title" class="template-detail__img" />
        </div>

        <div class="template-detail__info">
          <div>
            <h1 class="template-detail__title">{{ template.title }}</h1>
            <p class="template-detail__meta">
              {{ template.size }} · {{ orientationLabel }} ·
              {{ template.downloads.toLocaleString() }} 次下载
            </p>
          </div>

          <div class="template-detail__tags">
            <span
              v-for="tag in [template.scene, template.purpose, template.industry, template.style]"
              :key="tag"
              class="template-detail__tag"
            >
              {{ tag }}
            </span>
          </div>

          <FeatureUnavailable
            title="在线编辑未开放"
            subtitle="模板预览已导入，编辑器能力正在建设中"
            hint="可先使用 AI 工具页进行图片/视频创作"
          />
        </div>
      </div>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import FeatureUnavailable from '@/components/features/FeatureUnavailable.vue'
import type { Template, TemplateCatalog } from '@/lib/templates/types'

const ORIENTATION_LABEL = {
  square: '方形',
  portrait: '竖版',
  landscape: '横版',
} as const

const route = useRoute()

const template = ref<Template | null>(null)
const loading = ref(true)
const notFound = ref(false)

const orientationLabel = computed(() =>
  template.value ? ORIENTATION_LABEL[template.value.orientation] : ''
)

const loadTemplate = (id: string) => {
  loading.value = true
  notFound.value = false
  template.value = null

  fetch('/data/templates.json')
    .then((res) => res.json() as Promise<TemplateCatalog>)
    .then((catalog) => {
      const found = catalog.templates.find((item) => item.id === id)
      if (!found) {
        notFound.value = true
      } else {
        template.value = found
      }
    })
    .catch(() => {
      notFound.value = true
    })
    .finally(() => {
      loading.value = false
    })
}

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string') loadTemplate(id)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.template-detail {
  &__loading {
    font-size: 14px;
    color: var(--color-ink-tertiary);
  }

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

  &__layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__preview {
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid var(--color-border-whisper);
    background: var(--color-canvas-mist);
  }

  &__img {
    display: block;
    width: 100%;
    max-height: 70vh;
    margin: 0 auto;
    object-fit: contain;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__meta {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__tag {
    padding: 4px 12px;
    border-radius: 9999px;
    background: var(--color-surface-2);
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
}
</style>
