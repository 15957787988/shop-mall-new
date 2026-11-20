<template>
  <PageContainer
    ><header class="tools-heading">
      <p>创作工具</p>
      <h1>把创意，交给合适的工具。</h1>
      <span>按任务选择素材和输出方式，复用你的模型与积分账户。</span>
    </header>
    <ToolCatalog
  /></PageContainer>
</template>
<script setup lang="ts">
import PageContainer from '@/components/ui/PageContainer.vue'
import ToolCatalog from '@/components/tools/ToolCatalog.vue'
</script>
<style scoped lang="scss">
.tools-heading {
  margin: 8px 0 40px;
  p {
    color: var(--color-creative-violet);
    font-size: 12px;
    font-weight: 600;
  }
  h1 {
    margin: 12px 0;
    font-size: clamp(26px, 3vw, 36px);
    font-weight: 650;
    letter-spacing: -0.04em;
  }
  span {
    color: var(--color-ink-secondary);
    font-size: 14px;
  }
}
</style>
