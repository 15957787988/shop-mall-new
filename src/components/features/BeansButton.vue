<template>
  <button type="button" class="beans-button" :class="className" @click="emit('click')">
    <StarOutlined class="beans-button__icon" />
    {{ beans }} 算力
  </button>
</template>

<script setup lang="ts">
import { StarOutlined } from '@ant-design/icons-vue'

defineProps<{
  beans: number
  className?: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<style scoped lang="scss">
.beans-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  background: var(--color-creative-violet);
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: var(--shadow-lift);
  }

  &__icon {
    font-size: 14px;
    color: var(--color-blossom-pink);
  }
}
</style>
