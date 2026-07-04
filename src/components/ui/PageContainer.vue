<template>
  <div :class="['page-container', { 'page-container--flush': flush }, className]">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  className?: string
  flush?: boolean
}>()
</script>

<style scoped lang="scss">
.page-container {
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  max-width: 100%;
  padding: 16px 12px;

  @media (min-width: 768px) {
    padding: 24px;
  }

  @media (min-width: 1024px) {
    padding: 24px 32px;
  }

  &--flush {
    height: 100%;
    min-height: 0;
    width: 100%;
    overflow: hidden;
    padding: 0;
  }
}
</style>
