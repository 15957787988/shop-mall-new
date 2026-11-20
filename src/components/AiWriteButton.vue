<template>
  <Button class="ai-write-button" :loading="loading" :disabled="disabled || loading" :aria-busy="loading" html-type="button" @click="emit('click')">
    <EditOutlined aria-hidden="true" />AI 帮写
  </Button>
</template>

<script setup lang="ts">
import { Button } from 'ant-design-vue'
import { EditOutlined } from '@ant-design/icons-vue'
interface Props { loading?: boolean; disabled?: boolean }
withDefaults(defineProps<Props>(), { loading: false, disabled: false })
const emit = defineEmits<{ click: [] }>()
</script>

<style lang="scss" scoped>
.ai-write-button {
  border-radius: 999px;
  color: var(--color-creative-violet);
  border-color: var(--color-creative-violet);
  flex-shrink: 0;
}
</style>
