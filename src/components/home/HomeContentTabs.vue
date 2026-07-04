<template>
  <section class="home-content-tabs animate-fade-up animate-fade-up-delay-1">
    <div class="home-content-tabs__nav">
      <button
        v-for="item in tabs"
        :key="item"
        type="button"
        class="home-content-tabs__tab"
        :class="{ 'home-content-tabs__tab--active': tab === item }"
        @click="tab = item"
      >
        {{ item }}
        <span v-if="tab === item" class="home-content-tabs__indicator" />
      </button>
    </div>

    <FeatureUnavailable
      title="内容推荐"
      subtitle="模板推荐和最近打开功能正在建设中"
      hint="已开放 AI 工具请前往 AI 工具页体验"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FeatureUnavailable from '@/components/features/FeatureUnavailable.vue'

const tabs = ['模板推荐', '最近打开'] as const
type Tab = (typeof tabs)[number]

const tab = ref<Tab>('模板推荐')
</script>

<style scoped lang="scss">
.home-content-tabs {
  margin-bottom: var(--spacing-section);

  &__nav {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    overflow-x: auto;
    border-bottom: 1px solid rgba(229, 231, 235, 0.6);
  }

  &__tab {
    position: relative;
    flex-shrink: 0;
    min-height: 44px;
    padding-bottom: 10px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--color-ink-primary);
    }

    &--active {
      color: var(--color-creative-violet);
    }
  }

  &__indicator {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    border-radius: 9999px;
    background: var(--color-creative-violet);
  }
}
</style>
