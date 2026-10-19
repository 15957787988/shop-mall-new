<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '../../stores/flowStore'
import { uploadCanvasFile } from '../../utils/uploadFile'
import {
  ACCEPT_AUDIO,
  formatAudioClock,
  readAudioDuration,
  validateAudioUpload,
} from '../../utils/audioConstraints'
import { useMessage } from '../../shims/message'
import NodeHeader from './NodeHeader.vue'
import NodeAddButton from './NodeAddButton.vue'
import ReplaceMediaMenu from './ReplaceMediaMenu.vue'

const props = defineProps({
  id: String,
  type: String,
  data: Object,
  selected: Boolean,
})

const store = useFlowStore()
let disposed = false
const message = useMessage()
const { getNodes, updateNodeInternals } = useVueFlow()
const fileInputRef = ref(null)
const audioRef = ref(null)
const uploading = ref(false)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(Number(props.data?.duration) || 0)

function refreshNodeInternals() {
  if (disposed) return
  nextTick(() => {
    if (disposed) return
    updateNodeInternals(props.id)
    nextTick(() => {
      if (!disposed) store.syncNodeDimensions?.(props.id, getNodes.value)
    })
  })
}

onMounted(() => {
  if (props.data?.src) {
    refreshNodeInternals()
  }
})

watch(
  [() => props.data?.src, uploading],
  () => refreshNodeInternals()
)

watch(
  () => props.data?.duration,
  (v) => {
    if (Number.isFinite(Number(v)) && Number(v) > 0) {
      duration.value = Number(v)
    }
  }
)

function patchData(data) {
  if (disposed) return
  store.updateNodeData(props.id, data, getNodes.value)
}

function triggerLocalUpload() {
  fileInputRef.value?.click()
}

function clearAudio(e) {
  e.stopPropagation()
  pauseAudio()
  currentTime.value = 0
  duration.value = 0
  patchData({ src: '', outputValue: '', fileName: '', duration: 0 })
  refreshNodeInternals()
}

async function applyMediaUrl(url, name = '', dur = 0, completed = false) {
  if (disposed) return
  duration.value = Number.isFinite(dur) && dur > 0 ? dur : 0
  currentTime.value = 0
  playing.value = false
  const commit = completed ? patch => store.updateNodeResult(props.id, patch, getNodes.value) : patchData
  commit({
    src: url,
    outputValue: url,
    fileName: name || '资产音频',
    duration: duration.value,
  })
  refreshNodeInternals()
}

async function onLocalUpload(file) {
  if (disposed || !store.canEditNode(props.id)) return
  let dur
  try {
    dur = await readAudioDuration(file)
    if (disposed) return
  } catch {
    if (disposed) return
    message.error('无法读取音频时长，请更换文件后重试')
    return
  }
  const err = validateAudioUpload(file, dur)
  if (err) {
    message.error(err)
    return
  }

  uploading.value = true
  try {
    const url = await uploadCanvasFile(file)
    if (disposed) return
    await applyMediaUrl(url, file.name, dur, true)
  } catch {
    if (disposed) return
    message.error('音频上传失败')
  } finally {
    uploading.value = false
  }
}

function onLocalFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) {
    void onLocalUpload(file)
  }
}

const hasAudio = computed(() => !!props.data?.src)

function onLoadedMeta(e) {
  const el = e?.target
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) {
    return
  }
  duration.value = el.duration
  if (Math.abs((Number(props.data?.duration) || 0) - el.duration) > 0.5) {
    patchData({ duration: el.duration })
  }
}

function onTimeUpdate(e) {
  currentTime.value = e?.target?.currentTime || 0
}

function onEnded() {
  playing.value = false
  currentTime.value = 0
}

function pauseAudio() {
  const el = audioRef.value
  if (el && !el.paused) {
    el.pause()
  }
  playing.value = false
}

function togglePlay(e) {
  e.stopPropagation()
  const el = audioRef.value
  if (!el || !props.data?.src) {
    return
  }
  if (el.paused) {
    el.play()
    playing.value = true
  } else {
    el.pause()
    playing.value = false
  }
}

function seek(e) {
  e.stopPropagation()
  const el = audioRef.value
  const bar = e.currentTarget
  if (!el || !bar || !duration.value) {
    return
  }
  const rect = bar.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  el.currentTime = ratio * duration.value
  currentTime.value = el.currentTime
}

const progressPct = computed(() => {
  if (!duration.value) {
    return 0
  }
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

onBeforeUnmount(() => {
  disposed = true
  pauseAudio()
})
</script>

<template>
  <div :class="['canvas-node', 'audio-node-wrap', { selected }]">
    <Handle id="tl" type="target" :position="Position.Left" />
    <NodeAddButton :id="id" :source-type="type" side="left" />

    <NodeHeader :id="id" :label="data.label || '音频节点'" :current-type="type" />

    <div
      v-loading="uploading"
      class="node-body audio-body"
      element-loading-text="上传中..."
      element-loading-background="rgba(8, 8, 18, 0.75)"
    >
      <ReplaceMediaMenu
        v-if="selected && !uploading"
        label="替换音频"
        @upload="triggerLocalUpload"
      />
      <input
        ref="fileInputRef"
        type="file"
        :accept="ACCEPT_AUDIO"
        class="hidden-file"
        @change="onLocalFileChange"
        @click.stop
      />

      <template v-if="hasAudio">
        <audio
          ref="audioRef"
          :src="data.src"
          preload="metadata"
          @loadedmetadata="onLoadedMeta"
          @timeupdate="onTimeUpdate"
          @ended="onEnded"
          @pause="playing = false"
          @play="playing = true"
        />
        <div class="audio-player">
          <button class="play-btn" type="button" @click.stop="togglePlay">
            {{ playing ? '❚❚' : '▶' }}
          </button>
          <div class="progress-track" @click="seek">
            <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
          </div>
          <span class="time-label">{{ formatAudioClock(duration || currentTime) }}</span>
          <button class="clear-btn" type="button" title="清除" @click.stop="clearAudio">✕</button>
        </div>
      </template>

      <template v-else>
        <div class="audio-placeholder">
          <span class="ph-icon">🎧</span>
          <span class="ph-hint">点击右上角上传音频</span>
          <span class="ph-hint ph-hint-sub">mp3 / wav · 单文件 ≤15s</span>
        </div>
      </template>
    </div>

    <Handle id="sr" type="source" :position="Position.Right" />
    <NodeAddButton :id="id" :source-type="type" />
  </div>
</template>

<style lang="scss" scoped>

.audio-node-wrap {
  width: 280px;
}

.hidden-file {
  display: none;
}

.audio-body {
  padding: 0 !important;
  overflow: hidden;
  border-radius: 0 0 10px 10px;
  position: relative;
  background: #111110;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  min-height: 124px;
}

.play-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba($accent-primary, 0.45);
  background: rgba($accent-primary, 0.12);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;

  &:hover {
    background: rgba($accent-primary, 0.25);
  }
}

.progress-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: $accent-primary;
  border-radius: 3px;
  transition: width 0.05s linear;
}

.time-label {
  flex-shrink: 0;
  font-size: 12px;
  color: $text-dim;
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}

.clear-btn {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;

  &:hover {
    color: #b58f3f;
  }
}

.audio-placeholder {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed $border-default;
  border-radius: 0 0 10px 10px;
  transition: border-color 0.15s;
}

.ph-icon {
  font-size: 22px;
  opacity: 0.35;
}

.ph-hint {
  font-size: 12px;
  color: $text-dim;
  text-align: center;
  padding: 0 12px;
}

.ph-hint-sub {
  font-size: 12px;
  opacity: 0.85;
}
</style>
