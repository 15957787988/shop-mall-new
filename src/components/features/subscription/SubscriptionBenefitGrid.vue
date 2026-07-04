<template>
  <div class="subscription-benefit-grid">
    <p class="subscription-benefit-grid__title">{{ planName }}尊享特权</p>
    <ul class="subscription-benefit-grid__list">
      <li
        v-for="(feature, i) in features"
        :key="feature"
        class="subscription-benefit-grid__item"
        :style="{ background: TILE_GRADIENTS[i % TILE_GRADIENTS.length] }"
      >
        <span class="subscription-benefit-grid__icon-wrap">
          <component :is="BENEFIT_ICONS[i]" class="subscription-benefit-grid__icon" />
        </span>
        <span class="subscription-benefit-grid__text">{{ feature }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import {
  StarOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  PictureOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons-vue'

const planName = '专业版'
const features = [
  '每月 2000 算力',
  '全部 AI 工具无限制',
  '高级模板库',
  '无水印导出',
  '团队协作 5 人',
  '优先客服支持',
]

const BENEFIT_ICONS = [
  StarOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  PictureOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
]

const TILE_GRADIENTS = [
  'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
  'linear-gradient(135deg, #FDF4FF 0%, #EDE9FE 100%)',
  'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
  'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
  'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
  'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
]
</script>

<style scoped lang="scss">
.subscription-benefit-grid {
  &__title {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
    box-shadow: var(--shadow-soft);
  }

  &__icon-wrap {
    display: flex;
    height: 32px;
    width: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.7);
  }

  &__icon {
    font-size: 16px;
    color: var(--sub-accent-to);
  }

  &__text {
    font-size: 10px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--color-ink-primary);
  }
}
</style>
