<template>
  <section class="canvas-entry">
    <router-link to="/canvas/index" class="canvas-entry__card">
      <div>
        <h2 class="canvas-entry__title">无限画布</h2>
        <p class="canvas-entry__desc">在一张画布上排图片、视频、文本和音频，也可以从模板一键同款。</p>
      </div>
      <span class="canvas-entry__action">
        进入画布
        <ArrowRightOutlined />
      </span>
    </router-link>
  </section>
</template>

<script setup lang="ts">
import { ArrowRightOutlined } from '@ant-design/icons-vue'
</script>

<style scoped lang="scss">
.canvas-entry {
  margin-bottom: var(--spacing-section);

  &__card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 28px;
    border-radius: 12px;
    border: 1px solid var(--color-accent-border);
    background: var(--color-accent-soft);
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lift);
    }

    &:active {
      transform: scale(0.99);
    }
  }

  @media (max-width: 600px) {
    &__card { align-items: flex-start; flex-direction: column; padding: 24px; }
  }

  &__title {
    margin: 0;
    font-size: 19px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__desc {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  &__action {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-creative-violet);
  }
}
</style>
