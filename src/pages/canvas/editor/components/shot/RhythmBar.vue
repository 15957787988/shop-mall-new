<script setup>
import { SHOT_SIZES } from '../../../utils/breakdownTaxonomy'

defineProps({
  shots: { type: Array, default: () => [] },
  total: { type: Number, default: 0 }
})

const emit = defineEmits(['seek'])

function color(size) {
  return SHOT_SIZES[size]?.color || '#8e8a82'
}

function width(shot, total) {
  if (!total) return '0%'
  return `${Math.max(0.6, (Number(shot.seconds) / total) * 100)}%`
}
</script>

<template>
  <div class="rhythm-bar" title="片宽是时长占比，颜色深浅是景别远近">
    <button
      v-for="shot in shots"
      :key="shot.id"
      type="button"
      class="rhythm-seg"
      :style="{ width: width(shot, total), background: color(shot.size) }"
      :title="`${shot.id} ${shot.seconds}s`"
      @click="emit('seek', shot.start)"
    />
  </div>
</template>

<style scoped>
.rhythm-bar {
  display: flex;
  height: 18px;
  overflow: hidden;
  border-radius: 4px;
  background: #111;
}
.rhythm-seg {
  height: 100%;
  padding: 0;
  border: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
</style>
