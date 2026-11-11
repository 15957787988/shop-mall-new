<template>
  <div :class="['page-container', { 'page-container--flush': flush }, className]">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  className?: string
  flush?: boolean
}
defineProps<Props>()
</script>

<style scoped lang="scss">
.page-container {
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  max-width: 1560px;
  padding: 20px 16px;

  @media (min-width: 768px) {
    padding: 24px;
  }

  @media (min-width: 1024px) {
    padding: 32px;
  }

  &--flush {
    height: 100%;
    min-height: 0;
    width: 100%;
    overflow: hidden;
    max-width: none;
    padding: 0;
    @media (max-width: 960px) {
      height: auto;
      min-height: 100%;
      overflow: visible;
    }
  }
}
</style>
