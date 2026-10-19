<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '../../stores/flowStore'
import { uploadCanvasFile } from '../../utils/uploadFile'
import { getGenCount, resolveVideoDimensionsFromSettings } from '../../utils/resolveNodeGenMeta'
import { clearGenFailLabel } from '../../utils/genFailPatch'
import { readVideoDuration, validateVideoUpload } from '../../utils/videoConstraints'
import { useMessage } from '../../shims/message'
import { useCanvasVideo } from '../../composables/useCanvasVideo'
import NodeHeader from './NodeHeader.vue'
import NodeGenerationHistory from './NodeGenerationHistory.vue'
import NodeAddButton from './NodeAddButton.vue'
import NodeGenLoading from './NodeGenLoading.vue'
import ReplaceMediaMenu from './ReplaceMediaMenu.vue'

const props = defineProps({
  id: String,
  type: String,
  data: Object,
  selected: Boolean
})

const store = useFlowStore()
let disposed = false
onBeforeUnmount(() => {
  disposed = true
})
const message = useMessage()
const { getNodes, updateNodeInternals } = useVueFlow()
const uploading = ref(false)
const fileInputRef = ref(null)
const isUploading = computed(() => uploading.value || !!props.data?.uploading)
const fileName = ref(props.data.fileName || '')
const videoAspect = ref('')
const videoRef = ref(null)
const coverVisible = ref(!!props.data?.poster)
useCanvasVideo(videoRef, props.id)

watch(
  () => [props.data?.src, props.data?.poster],
  () => {
    coverVisible.value = !!props.data?.poster
  }
)

function playFromCover() {
  coverVisible.value = false
  videoRef.value?.play()
}

const VIDEO_ACCEPT = 'video/mp4,video/quicktime,.mp4,.mov'

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
  [() => props.data?.src, () => props.data?.generating, () => props.data?.genError, isUploading],
  () => refreshNodeInternals()
)

// ── Upload ────────────────────────────────────────────────────────────────────
function clearVideo(e) {
  e.stopPropagation()
  fileName.value = ''
  videoAspect.value = ''
  patchData({ src: '', poster: '', outputValue: '', fileName: '', duration: 0 })
  refreshNodeInternals()
}

let paintedSrc = ''
function paintPausedFrame(el) {
  if (!el || disposed || !el.paused) return
  const src = el.currentSrc || el.src || ''
  if (!src || paintedSrc === src) return
  const duration = Number(el.duration)
  if (!Number.isFinite(duration) || duration <= 0) return
  paintedSrc = src
  const frame = Math.min(0.1, Math.max(duration - 0.01, 0))
  if (el.currentTime < 0.01 && frame > 0) el.currentTime = frame
}

function onVideoMeta(e) {
  if (disposed) return
  const el = e?.target
  if (!el?.videoWidth || !el?.videoHeight) {
    return
  }
  videoAspect.value = `${el.videoWidth} / ${el.videoHeight}`
  if (Number.isFinite(el.duration) && el.duration > 0) {
    const cur = Number(props.data?.duration) || 0
    if (Math.abs(cur - el.duration) > 0.5) {
      patchData({ duration: el.duration })
    }
  }
  paintPausedFrame(el)
  refreshNodeInternals()
}

async function applyMediaUrl(url, name = '', duration = 0, completed = false) {
  if (disposed) return
  fileName.value = name || '资产视频'
  const label = clearGenFailLabel('video', props.data?.label)
  const patch = {
    src: url,
    poster: '',
    outputValue: url,
    fileName: fileName.value,
    genError: '',
    ...(label ? { label } : {})
  }
  if (Number.isFinite(duration) && duration > 0) {
    patch.duration = duration
  }
  const commit = completed
    ? (patch) => store.updateNodeResult(props.id, patch, getNodes.value)
    : patchData
  commit(patch)
  refreshNodeInternals()
}

async function onLocalUpload(file) {
  if (disposed || !store.canEditNode(props.id)) return
  let dur
  try {
    dur = await readVideoDuration(file)
    if (disposed) return
  } catch {
    if (disposed) return
    message.error('无法读取视频时长，请更换文件后重试')
    return
  }
  const err = validateVideoUpload(dur, 0)
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
    message.error('视频上传失败')
  } finally {
    uploading.value = false
  }
}

function triggerLocalUpload() {
  fileInputRef.value?.click()
}

function onLocalFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) {
    void onLocalUpload(file)
  }
}

const isUpload = computed(() => props.type === 'videoUploadNode' || props.type === 'videoNode')
const isGenMode = computed(() => props.type === 'videoGenNode' || props.type === 'videoNode')
const showTargetHandle = computed(
  () => isGenMode.value || isUpload.value || !!props.data?.fromFrame
)
const isGenerating = computed(
  () =>
    !props.data?.genWaitTimedOut &&
    (!!props.data?.generating ||
      (!!props.data?.genTaskId && !props.data?.src && !props.data?.genError))
)
const genError = computed(() => {
  if (props.data?.generating && !props.data?.genWaitTimedOut) {
    return ''
  }
  if (props.data?.genError) {
    return props.data.genError
  }
  if (!props.data?.src && /失败/.test(props.data?.label || '')) {
    return '生成失败，请重试'
  }
  return ''
})

const genCount = computed(() => (isGenMode.value ? getGenCount(props.data?.settings, 'video') : 1))
const showMultiGenPlaceholder = computed(
  () => !props.data?.src && !genError.value && isGenMode.value && genCount.value > 1
)
const headerDimensions = computed(() => {
  if (props.data?.dimensions) {
    return props.data.dimensions
  }
  if (isGenMode.value) {
    return resolveVideoDimensionsFromSettings(props.data?.settings)
  }
  return ''
})
const isAgentSource = computed(
  () => props.data?.source === 'mcp' || props.data?.genSource === 'mcp'
)

function patchData(data) {
  if (disposed) return
  store.updateNodeData(props.id, data, getNodes.value)
}

const hasVideo = computed(() => !!props.data.src)

const isLegacyVideoWithoutHistory = computed(() => {
  const data = props.data || {}
  return !!(
    data.src &&
    data.settings?.mode !== 'video' &&
    !data.genTaskId &&
    !data.genRequestId &&
    !data.genAppliedTaskId
  )
})

const wrapStyle = computed(() =>
  videoAspect.value ? { aspectRatio: videoAspect.value } : undefined
)
</script>

<template>
  <div :class="['canvas-node', 'video-node', { selected }]">
    <Handle v-if="showTargetHandle" id="tl" type="target" :position="Position.Left" />
    <NodeAddButton v-if="showTargetHandle" :id="id" :source-type="type" side="left" />

    <NodeHeader
      :id="id"
      :label="data.label || '视频节点'"
      :current-type="type"
      :cost-points="Number(data.costPoints) || 0"
      :dimensions="headerDimensions"
      :generating="isGenerating"
      :gen-error="genError"
      :has-result="!!data.src"
      :deletable="!isLegacyVideoWithoutHistory"
    >
      <NodeGenerationHistory :id="id" kind="video" :data="data" :busy="isUploading" />
    </NodeHeader>
    <span v-if="isAgentSource" class="agent-tag">Agent</span>

    <div
      v-loading="isUploading"
      class="node-body vid-body"
      element-loading-text="上传中..."
      element-loading-background="rgba(8, 8, 18, 0.88)"
    >
      <ReplaceMediaMenu
        v-if="
          selected &&
          !isUploading &&
          !isGenerating &&
          (!genError || (hasVideo && !data.genTaskId && !data.genRequestId))
        "
        label="替换视频"
        @upload="triggerLocalUpload"
      />
      <input
        ref="fileInputRef"
        type="file"
        class="hidden-file"
        :accept="VIDEO_ACCEPT"
        @change="onLocalFileChange"
      />

      <template v-if="isGenerating">
        <NodeGenLoading hint="AI 生成结果将显示于此" />
      </template>

      <template v-else-if="hasVideo">
        <div class="vid-wrap" :style="wrapStyle">
          <video
            :key="data.src"
            ref="videoRef"
            :src="data.src"
            :poster="data.poster || undefined"
            class="node-video"
            controls
            playsinline
            preload="auto"
            @loadedmetadata="onVideoMeta"
            @loadeddata="paintPausedFrame($event.target)"
            @play="coverVisible = false"
          />
          <img
            v-if="coverVisible && data.poster"
            :src="data.poster"
            class="node-poster"
            alt=""
            @click.stop="playFromCover"
            @error="coverVisible = false"
          />
          <div class="vid-controls">
            <button class="overlay-btn overlay-btn-del" @click.stop="clearVideo">✕</button>
          </div>
        </div>
        <p v-if="genError" class="legacy-task-error" role="status">{{ genError }}</p>
      </template>

      <template v-else-if="genError">
        <div
          class="vid-placeholder vid-error-state"
          :class="{ 'vid-wait-state': data.genWaitTimedOut }"
          role="status"
        >
          <span class="gen-error-text">{{ genError }}</span>
        </div>
      </template>

      <template v-else-if="showMultiGenPlaceholder">
        <div class="vid-placeholder vid-multi-gen">
          <div class="multi-gen-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect
                x="2"
                y="5"
                width="20"
                height="14"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path d="M10 9.5l5 3-5 3V9.5z" fill="currentColor" />
            </svg>
          </div>
          <div class="multi-gen-count">×{{ genCount }}</div>
        </div>
      </template>

      <template v-else>
        <div class="vid-placeholder">
          <span class="ph-icon">{{ isGenMode ? '✦' : '▶' }}</span>
          <span class="ph-hint">{{
            isGenMode ? 'AI 生成结果将显示于此' : '点击右上角上传视频'
          }}</span>
        </div>
      </template>
    </div>

    <Handle id="sr" type="source" :position="Position.Right" />
    <NodeAddButton :id="id" :source-type="type" />
  </div>
</template>

<style lang="scss" scoped>

.video-node {
  width: 244px;
  position: relative;
}
.hidden-file {
  display: none;
}
.legacy-task-error {
  margin: 0;
  padding: 8px;
  color: #d7bc7b;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.agent-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: rgba(59, 91, 178, 0.9);
  color: #ecebe6;
}

.vid-body {
  padding: 0 !important;
  overflow: hidden;
  border-radius: 0 0 10px 10px;
  position: relative;
}

.vid-wrap {
  position: relative;
  width: 100%;
  line-height: 0;
  background: #111110;
  aspect-ratio: 16 / 9;
  max-height: 260px;

  &:hover .vid-controls {
    opacity: 1;
  }
}

.node-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #111110;
}

.node-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #111110;
  cursor: pointer;
  z-index: 1;
}

.vid-controls {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 2;
}

.overlay-btn {
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: $radius-sm;
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;

  &:hover {
    background: rgba(0, 0, 0, 0.85);
  }
  &-del:hover {
    background: rgba(255, 50, 50, 0.7) !important;
  }
}

.file-badge {
  padding: 4px 10px;
  background: rgba($accent-green, 0.08);
  border-top: 1px solid rgba($accent-green, 0.15);
  font-size: 12px;
  color: $accent-green;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vid-placeholder {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #111110;
  border: 2px dashed $border-default;
  border-radius: 0 0 10px 10px;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: rgba($accent-primary, 0.35);
  }
}

.ph-icon {
  font-size: 22px;
  opacity: 0.3;
}
.ph-hint {
  font-size: 12px;
  color: $text-dim;
}

.vid-multi-gen {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba($accent-primary, 0.22);
  cursor: default;
}

.multi-gen-icon {
  width: 36px;
  height: 36px;
  color: $accent-text;

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.multi-gen-count {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.02em;
}

.vid-error-state {
  border-style: solid;
  background: #20201f;
  cursor: default;
}
.gen-error-text {
  color: #ff6b6b;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  padding: 0 16px;
  word-break: break-word;
}
.vid-wait-state .gen-error-text {
  color: #d7bc7b;
}
</style>
