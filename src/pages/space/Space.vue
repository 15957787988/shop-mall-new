<template>
  <PageContainer
    ><header class="works-heading">
      <div>
        <p>你的创作档案</p>
        <h1>我的作品</h1>
        <span>查看图片和视频生成记录，预览并下载完成的作品。</span>
      </div>
      <router-link to="/tools"><PlusOutlined />开始新创作</router-link>
    </header>
    <Tabs v-model:activeKey="kind"
      ><Tabs.TabPane key="image" tab="图片作品" /><Tabs.TabPane key="video" tab="视频作品" /></Tabs
    ><ResultsGallery :key="kind" :kind="kind" title="生成记录"
  /></PageContainer>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { Tabs } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import ResultsGallery from './components/ResultsGallery.vue'
import type { StudioKind } from '@/service/api/studio'
const kind = ref<StudioKind>('image')
</script>
<style scoped lang="scss">
.works-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 12px 0 24px;
  p {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-creative-violet);
  }
  h1 {
    font-size: 30px;
    font-weight: 650;
    margin: 10px 0;
  }
  span {
    color: var(--color-ink-secondary);
    font-size: 14px;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    background: var(--color-creative-violet);
    color: var(--color-on-media);
    border-radius: 9px;
    flex-shrink: 0;
  }
}
@media (max-width: 600px) {
  .works-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
