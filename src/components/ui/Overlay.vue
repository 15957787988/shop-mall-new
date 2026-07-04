<template>
  <Modal
    :open="open"
    :title="title"
    :footer="null"
    :mask-closable="false"
    :width="512"
    centered
    destroy-on-close
    :wrap-class-name="cn('overlay-modal-wrap', overlayClassName)"
    :class="className"
    @cancel="onClose"
  >
    <div :class="cn('overlay-modal__body scroll-area', bodyClassName)">
      <slot />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Modal } from 'ant-design-vue'
import { cn } from '@/lib/utils'

defineProps<{
  open: boolean
  onClose: () => void
  title: string
  className?: string
  overlayClassName?: string
  bodyClassName?: string
}>()
</script>

<style scoped lang="scss">
:global(.overlay-modal-wrap .ant-modal-body) {
  padding-top: 8px;
}

.overlay-modal__body {
  max-height: calc(90vh - 110px);
  overflow-y: auto;
}
</style>
