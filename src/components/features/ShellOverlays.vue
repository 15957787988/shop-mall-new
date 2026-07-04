<template>
  <OverlayDrawer :open="messageOpen" title="消息通知" :on-close="onMessageClose">
    <p class="shell-overlays__empty-msg">暂无消息</p>
  </OverlayDrawer>
</template>

<script setup lang="ts">
import OverlayDrawer from '@/components/ui/OverlayDrawer.vue'

defineProps<{
  messageOpen: boolean
  onMessageClose: () => void
}>()
</script>

<style scoped lang="scss">
.shell-overlays {
  &__empty-msg {
    margin: 0;
    padding: 48px 16px;
    text-align: center;
    font-size: 14px;
    color: var(--color-ink-tertiary);
  }
}
</style>
