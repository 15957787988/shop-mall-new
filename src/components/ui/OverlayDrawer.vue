<template>
  <Drawer
    :open="open"
    :title="title"
    :placement="side"
    :width="384"
    :mask-closable="false"
    destroy-on-close
    @close="onClose"
  >
    <div class="overlay-drawer__body scroll-area">
      <slot />
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { Drawer } from 'ant-design-vue'

withDefaults(
  defineProps<{
    open: boolean
    onClose: () => void
    title: string
    side?: 'right' | 'left'
  }>(),
  {
    side: 'right',
  }
)
</script>

<style scoped lang="scss">
.overlay-drawer__body {
  height: 100%;
}
</style>
