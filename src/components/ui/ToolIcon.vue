<template>
  <span :class="['tool-icon', `tool-icon--${size}`, className]" :style="{ backgroundColor: style.bgColor }">
    <component :is="style.icon" :style="{ color: style.iconColor, fontSize: `${iconSize}px` }" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getToolIconStyle } from '@/lib/tool-icons'
import type { ToolCategory } from '@/mock/tools'

const props = withDefaults(
  defineProps<{
    category: ToolCategory
    size?: 'sm' | 'md' | 'lg'
    className?: string
  }>(),
  { size: 'md' }
)

const SIZE_MAP = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 20 },
  lg: { box: 64, icon: 32 },
}

const style = computed(() => getToolIconStyle(props.category))
const iconSize = computed(() => SIZE_MAP[props.size].icon)
</script>

<style scoped lang="scss">
.tool-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;

  &--sm {
    width: 32px;
    height: 32px;
  }

  &--md {
    width: 40px;
    height: 40px;
  }

  &--lg {
    width: 64px;
    height: 64px;
  }
}
</style>
