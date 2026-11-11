<template>
  <PageContainer>
    <header class="home-intro">
      <div>
        <p class="home-intro__eyebrow">电商创作工作台</p>
        <h1>下一件作品，从这里开始。</h1>
        <p class="home-intro__description">
          为商品制作图片、生成视频，或从一条好视频开始新的创作。
        </p>
      </div>
      <router-link to="/agent-lib" class="home-intro__assets"
        ><FolderOpenOutlined />管理我的素材<ArrowRightOutlined
      /></router-link>
    </header>
    <RecommendedTools />
    <CanvasEntry />
  </PageContainer>
</template>
<script setup lang="ts">
import { FolderOpenOutlined, ArrowRightOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import RecommendedTools from '@/components/home/RecommendedTools.vue'
import CanvasEntry from '@/components/home/CanvasEntry.vue'
</script>
<style scoped lang="scss">
.home-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 0 40px;
  h1 {
    margin: 10px 0 12px;
    font-size: clamp(25px, 2.5vw, 36px);
    font-weight: 650;
    letter-spacing: -0.035em;
    line-height: 1.4;
  }
  &__eyebrow {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-creative-violet);
  }
  &__description {
    margin: 0;
    color: var(--color-ink-secondary);
    font-size: 14px;
  }
  &__assets {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    padding: 10px 14px;
    background: var(--color-surface-0);
    color: var(--color-ink-primary);
    font-size: 13px;
  }
  &__assets:hover {
    border-color: var(--color-accent-border);
    color: var(--color-creative-violet);
  }
  @media (max-width: 700px) {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 0 28px;
    gap: 20px;
  }
}
</style>
