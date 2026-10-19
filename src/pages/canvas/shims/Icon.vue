<template>
  <span class="canvas-icon" :style="{ fontSize: `${size}px` }" aria-hidden="true">{{ glyph }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '' },
  size: { type: Number, default: 16 },
})

const MAP = {
  'lucide:search': '⌕',
  'lucide:pencil': '✎',
  'lucide:copy': '⧉',
  'lucide:trash-2': '⌫',
}

const glyph = computed(() => MAP[props.icon] || '•')
</script>
