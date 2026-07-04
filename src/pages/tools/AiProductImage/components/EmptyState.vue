<template>
  <div class="saleor-empty">
    <h2 class="empty-title">AI商品套图</h2>
    <p class="empty-desc">
      上传商品图片，AI 即刻生成符合多电商平台规范的高转化商品套图
    </p>
    <div class="empty-demo">
      <img :src="demoImg" alt="AI商品套图示例" class="demo-img" />
    </div>
  </div>
</template>

<script setup lang="ts">
import demoImg from "@/assets/image/demo-img.png";
</script>

<style scoped lang="scss">
.saleor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 24px;
  text-align: center;
}

.empty-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.empty-desc {
  font-size: 146x;
  color: var(--text-secondary);
  max-width: 480px;
  line-height: 1.6;
  margin: 0 0 40px;
}

.empty-demo {
  text-align: center;
  border-radius: 16px;

  .demo-img {
    max-width: 60%;
    height: auto;
  }
}
</style>
