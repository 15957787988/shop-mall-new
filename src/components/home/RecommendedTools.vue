<template>
  <section class="recommended-tools">
    <div class="recommended-tools__heading">
      <h2>选择创作方式</h2>
      <router-link to="/tools">全部工具 <ArrowRightOutlined /></router-link>
    </div>
    <div class="recommended-tools__featured">
      <router-link
        v-for="tool in FEATURED_TOOLS"
        :key="tool.href"
        :to="tool.href"
        class="recommended-tools__featured-card"
      >
        <span class="recommended-tools__icon"><component :is="tool.icon" /></span>
        <h3>{{ tool.name }}</h3>
        <p>{{ tool.description }}</p>
        <span class="recommended-tools__featured-action">开始创作 <ArrowRightOutlined /></span>
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
        <span>{{ tool.name }}</span>
      </router-link>
    </div>
  </section>
</template>
<script setup lang="ts">
import {
  ArrowRightOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  CopyOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'
import ToolIcon from '@/components/ui/ToolIcon.vue'
import { tools } from '@/mock/tools'
import { getToolHref } from '@/lib/tool-routes'
const FEATURED_TOOLS = [
  {
    name: 'AI 制图',
    description: '用文字和参考图，把创意变成画面。',
    href: '/ai/image',
    icon: PictureOutlined,
  },
  {
    name: 'AI 视频',
    description: '让商品、人物与故事动起来。',
    href: '/ai/video',
    icon: VideoCameraOutlined,
  },
  {
    name: '爆款复刻',
    description: '参考原片节奏，换上你的素材。',
    href: '/tools/video-replicate',
    icon: CopyOutlined,
  },
  {
    name: '商品套图',
    description: '围绕一件商品，完成成套视觉。',
    href: '/tools/ai-product-image',
    icon: AppstoreOutlined,
  },
]
const gridIds = ['t20', 't21', 't22', 't23', 't26', 't28', 't24', 't25']
const displayGrid = tools.filter((tool) => gridIds.includes(tool.id))
</script>
<style scoped lang="scss">
.recommended-tools {
  margin-bottom: var(--spacing-section);
  &__heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }
    a {
      font-size: 13px;
      color: var(--color-ink-secondary);
    }
  }
  &__featured {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
  &__featured-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: 240px;
    padding: 24px;
    border: 1px solid var(--color-border-whisper);
    border-radius: var(--radius-panel);
    background: var(--color-surface-0);
    color: var(--color-ink-primary);
    transition: border-color 0.18s, box-shadow 0.18s;
    h3 {
      margin: 22px 0 8px;
      font-size: 19px;
      font-weight: 600;
    }
    p {
      margin: 0 0 24px;
      font-size: 13px;
      line-height: 1.8;
      color: var(--color-ink-secondary);
    }
    &:hover {
      border-color: var(--color-accent-border);
      box-shadow: var(--shadow-lift);
    }
  }
  &__icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-accent-soft);
    color: var(--color-creative-violet);
    font-size: 22px;
  }
  &__featured-action {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
    font-size: 12px;
    color: var(--color-creative-violet);
    font-weight: 500;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 12px;
    overflow: hidden;
    margin-top: 20px;
    background: var(--color-border-whisper);
  }
  &__grid-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: var(--color-surface-0);
    color: var(--color-ink-secondary);
    font-size: 13px;
    &:hover {
      background: var(--color-accent-soft);
      color: var(--color-creative-violet);
    }
  }
  @media (max-width: 1150px) {
    &__featured {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    &__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 520px) {
    &__featured {
      gap: 12px;
    }
    &__featured-card {
      min-height: 220px;
      padding: 18px;
      h3 {
        font-size: 17px;
      }
    }
    &__grid-card {
      padding: 14px;
      gap: 8px;
      font-size: 12px;
    }
  }
}
</style>
