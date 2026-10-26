<script setup>
import { labelOf } from '../../../utils/breakdownTaxonomy'

defineProps({
  shots: { type: Array, default: () => [] },
  frames: { type: Object, default: () => ({}) },
  activeId: { type: String, default: '' }
})
const emit = defineEmits(['seek'])

function frame(frames, id, suffix) {
  return frames?.[`${id}${suffix}`] || ''
}
</script>

<template>
  <div class="shot-table">
    <div
      v-for="shot in shots"
      :id="`shot-${shot.id}`"
      :key="shot.id"
      class="shot-row"
      :class="{ active: activeId === shot.id }"
    >
      <button type="button" class="shot-frames" @click="emit('seek', shot.start)">
        <img v-if="frame(frames, shot.id, 'a')" :src="frame(frames, shot.id, 'a')" alt="" />
        <img v-if="frame(frames, shot.id, 'b')" :src="frame(frames, shot.id, 'b')" alt="" />
      </button>
      <div class="shot-meta">
        <strong>{{ shot.id }}</strong>
        <span>{{ shot.start }} → {{ shot.end }}（{{ shot.seconds }}s）</span>
        <span>实测 {{ shot.motion ?? '—' }}</span>
      </div>
      <div class="shot-copy">
        <div class="shot-tags">
          <span>{{ labelOf('size', shot.size) }}</span>
          <span>{{ labelOf('category', shot.category) }}</span>
          <span>{{ labelOf('camera', shot.camera) }}</span>
          <span v-if="shot.rhythm">{{ labelOf('rhythm', shot.rhythm) }}</span>
        </div>
        <p>{{ shot.frame || '画面待填写' }}</p>
        <p v-if="shot.audio" class="shot-audio">{{ shot.audio }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shot-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
}
.shot-row {
  display: grid;
  grid-template-columns: 132px 148px 1fr;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.shot-row.active {
  outline: 1px solid #d7a15a;
}
.shot-frames {
  display: flex;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.shot-frames img {
  width: 62px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  background: #111;
}
.shot-meta,
.shot-copy {
  min-width: 0;
  color: #deddd7;
  font-size: 12px;
  line-height: 1.45;
}
.shot-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}
.shot-tags span {
  padding: 1px 6px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
}
.shot-copy p {
  margin: 0;
}
.shot-audio {
  margin-top: 4px !important;
  color: #c9b27a;
}
</style>
