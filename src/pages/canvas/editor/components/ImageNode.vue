<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '../../stores/flowStore'
import { uploadCanvasFile } from '../../utils/uploadFile'
import { getGenCount, resolveImageDimensionsFromSettings } from '../../utils/resolveNodeGenMeta'
import { clearGenFailLabel } from '../../utils/genFailPatch'
import { useMessage } from '../../shims/message'
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
onBeforeUnmount(() => { disposed = true })
const { getNodes, updateNodeInternals } = useVueFlow()
const message = useMessage()
const uploading = ref(false)
const fileInputRef = ref(null)
const isUploading = computed(() => uploading.value || !!props.data?.uploading)

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

function refreshNodeInternals() {
  if (disposed) return
  nextTick(() => {
    if (disposed) return
    updateNodeInternals(props.id)
    nextTick(() => {
      if (!disposed) store.syncNodeDimensions(props.id, getNodes.value)
    })
  })
}

onMounted(() => {
  if (props.data?.src) {
    refreshNodeInternals()
  }
})

const isGenMode = computed(() => props.type === 'imageGenNode' || props.type === 'imageNode')
const isUploadMode = computed(() => props.type === 'imageUploadNode')
const showTargetHandle = computed(
  () => isGenMode.value || isUploadMode.value || !!props.data?.fromFrame
)
const isGenerating = computed(
  () => !!props.data?.generating || (!!props.data?.genTaskId && !props.data?.src)
)
// 失败文案：优先 data.genError；旧节点仅改了 label 也兜底
const genError = computed(() => {
  if (props.data?.genError) {
    return props.data.genError
  }
  if (!props.data?.src && /失败/.test(props.data?.label || '')) {
    return '生成失败，请重试'
  }
  return ''
})

const genCount = computed(() => (isGenMode.value ? getGenCount(props.data?.settings, 'image') : 1))
const showMultiGenPlaceholder = computed(
  () => !props.data?.src && !genError.value && isGenMode.value && genCount.value > 1
)
const headerDimensions = computed(() => {
  if (props.data?.dimensions) {
    return props.data.dimensions
  }
  if (isGenMode.value) {
    return resolveImageDimensionsFromSettings(props.data?.settings)
  }
  return ''
})
const isAgentSource = computed(
  () => props.data?.source === 'mcp' || props.data?.genSource === 'mcp'
)

function onImageLoad(e) {
  if (disposed) return
  const img = e?.target
  if (img?.naturalWidth && img?.naturalHeight) {
    patchData({ dimensions: `${img.naturalWidth} x ${img.naturalHeight}` })
  }
  refreshNodeInternals()
}

watch([() => props.data?.src, isGenerating, isUploading, genError], () => refreshNodeInternals())

function patchData(data) {
  if (disposed) return
  store.updateNodeData(props.id, data, getNodes.value)
}

async function applyMediaUrl(url, name = '', completed = false) {
  if (disposed) return
  const label = clearGenFailLabel('image', props.data?.label)
  const commit = completed ? patch => store.updateNodeResult(props.id, patch, getNodes.value) : patchData
  commit({
    src: url,
    outputValue: url,
    fileName: name || '资产图片',
    genError: '',
    ...(label ? { label } : {})
  })
  refreshNodeInternals()
}

async function onLocalUpload(file) {
  if (disposed || !store.canEditNode(props.id)) return
  uploading.value = true
  try {
    const url = await uploadCanvasFile(file)
    if (disposed) return
    await applyMediaUrl(url, file.name, true)
  } catch {
    if (disposed) return
    message.error('图片上传失败')
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
  if (!file) return
  void onLocalUpload(file)
}
</script>

<template>
  <div :class="['canvas-node', 'image-node', { selected }]">
    <Handle v-if="showTargetHandle" id="tl" type="target" :position="Position.Left" />
    <NodeAddButton v-if="showTargetHandle" :id="id" :source-type="type" side="left" />

    <NodeHeader
      :id="id"
      :label="data.label || '图片节点'"
      :current-type="type"
      :cost-points="Number(data.costPoints) || 0"
      :dimensions="headerDimensions"
      :generating="isGenerating"
      :gen-error="genError"
      :has-result="!!data.src"
    >
      <NodeGenerationHistory :id="id" kind="image" :data="data" :busy="isUploading" />
    </NodeHeader>
    <span v-if="isAgentSource" class="agent-tag">Agent</span>

    <div
      v-loading="isUploading"
      class="node-body img-body"
      element-loading-text="上传中..."
      element-loading-background="rgba(10, 10, 24, 0.88)"
    >
      <ReplaceMediaMenu
        v-if="selected && !isUploading && !isGenerating && !genError"
        label="替换图片"
        @upload="triggerLocalUpload"
      />
      <input
        ref="fileInputRef"
        type="file"
        class="hidden-file"
        :accept="IMAGE_ACCEPT"
        @change="onLocalFileChange"
      />

      <template v-if="isGenerating">
        <NodeGenLoading hint="AI 生成结果将显示于此" />
      </template>

      <template v-else-if="data.src">
        <div class="img-preview-wrap">
          <img
            :src="data.src"
            :alt="data.alt || '图片'"
            class="node-image"
            referrerpolicy="no-referrer"
            @load="onImageLoad"
            @error="(e) => e.target.classList.add('img-error')"
          />
        </div>
      </template>

      <template v-else-if="genError">
        <div class="img-placeholder img-error-state">
          <div class="gen-error-text">{{ genError }}</div>
        </div>
      </template>

      <template v-else-if="showMultiGenPlaceholder">
        <div class="img-placeholder img-multi-gen">
          <div class="multi-gen-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
              <path
                d="M3 16l4.5-4.5 3 3L14 11l7 7"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="multi-gen-count">×{{ genCount }}</div>
        </div>
      </template>

      <template v-else>
        <div class="img-placeholder">
          <div class="placeholder-icon">{{ isGenMode ? '✦' : '🖼' }}</div>
          <div class="placeholder-hint">
            {{ isGenMode ? 'AI 生成结果将显示于此' : '点击右上角上传图片' }}
          </div>
        </div>
      </template>
    </div>

    <Handle id="sr" type="source" :position="Position.Right" />
    <NodeAddButton :id="id" :source-type="type" />
  </div>
</template>

<style lang="scss" scoped>

.image-node {
  width: 244px;
  position: relative;
}
.hidden-file {
  display: none;
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
.img-body {
  padding: 0 !important;
  overflow: hidden;
  border-radius: 0 0 10px 10px;
  position: relative;
}

.img-preview-wrap {
  position: relative;
  line-height: 0;

  &:hover .img-overlay {
    opacity: 1;
  }
}

.node-image {
  width: 100%;
  height: auto;
  display: block;
  max-height: 260px;
  object-fit: contain;

  &.img-error {
    filter: grayscale(1) opacity(0.25);
  }
}

.img-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.overlay-btn {
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: $radius-md;
  color: #fff;
  font-size: 12px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  &-del:hover {
    background: rgba(255, 60, 60, 0.5) !important;
  }
}

.img-placeholder {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #131312;
  border: 2px dashed $border-default;
  border-radius: 0 0 10px 10px;
}

.placeholder-icon {
  font-size: 22px;
  opacity: 0.3;
}
.placeholder-hint {
  font-size: 12px;
  color: $text-dim;
}

.img-multi-gen {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba($accent-primary, 0.22);
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

.img-error-state {
  border-style: solid;
  background: #1b1b19;
}
.gen-error-text {
  color: #b58f3f;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  padding: 0 16px;
  word-break: break-word;
}
</style>
