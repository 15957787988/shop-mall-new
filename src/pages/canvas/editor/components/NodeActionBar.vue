<script setup>
import { ref, computed, watch } from 'vue'
import { Download, View, FullScreen } from '../../shims/icons'
import { storeToRefs } from 'pinia'
import { useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '../../stores/flowStore'
import { useMessage } from '../../shims/message'
import useDownloader from '../../shims/download'
import { downloadVideo } from '../../shims/download'
import { useCanvasVideo } from '../../composables/useCanvasVideo'
import { applyPlaybackPosition } from '../../utils/canvasPlayback'

const props = defineProps({ readonly: Boolean })
const store = useFlowStore()
const message = useMessage()
const { nodes, activePanelNodeId } = storeToRefs(store)
const { findNode, getViewport, onViewportChange, getNodes } = useVueFlow()
const imageDownloader = useDownloader()

const previewVisible = ref(false)
const previewKind = ref('image')
const previewUrl = ref('')
const previewVideo = ref(null)
const playback = useCanvasVideo(previewVideo)
let previewPosition = null
let previewNodeId = null
let previewPositionReady = false
const viewportTick = ref(0)
const downloading = ref(false)

const expandVisible = ref(false)
const expandContent = ref('')
const expandNodeId = ref(null)

onViewportChange(() => {
  viewportTick.value++
})
watch(
  nodes,
  () => {
    viewportTick.value++
  },
  { deep: true }
)
watch(activePanelNodeId, () => {
  viewportTick.value++
})

function isMediaType(type) {
  return type?.includes('image') || type?.includes('video')
}

const activeNode = computed(() => {
  const id = activePanelNodeId.value
  if (!id) return null
  return nodes.value.find((node) => node.id === id) ?? null
})

const mediaNode = computed(() => {
  const n = activeNode.value
  if (!n || !isMediaType(n.type)) return null
  return n
})

const textNode = computed(() => {
  const n = activeNode.value
  if (!n || n.type !== 'textNode') return null
  return n
})

const barNode = computed(() => mediaNode.value || textNode.value)

function canvasWrapRect() {
  return document.querySelector('.canvas-wrap')?.getBoundingClientRect() ?? { left: 0, top: 0 }
}

const BAR_GAP = 44

const barStyle = computed(() => {
  void viewportTick.value
  const node = barNode.value
  if (!node) return { display: 'none' }
  const live = findNode(node.id) ?? node
  const { x: vpX, y: vpY, zoom } = getViewport()
  const bounds = canvasWrapRect()
  return {
    top: `${bounds.top + live.position.y * zoom + vpY}px`,
    left: `${bounds.left + live.position.x * zoom + vpX}px`,
    transform: `scale(${zoom}) translateY(-${BAR_GAP}px)`,
    transformOrigin: 'top left'
  }
})

const isVideo = computed(() => mediaNode.value?.type?.includes('video'))
const hasMedia = computed(() => !!mediaNode.value?.data?.src)

const textCharCount = computed(() => (textNode.value?.data?.content || '').length)

function deleteNode() {
  const node = barNode.value
  if (!node) return
  store.confirmRemoveNodeById(node.id)
}

function openPreview() {
  const src = mediaNode.value?.data?.src
  if (!src) return
  previewKind.value = isVideo.value ? 'video' : 'image'
  previewUrl.value = src
  previewNodeId = mediaNode.value.id
  previewPositionReady = false
  if (isVideo.value) {
    previewPosition = playback?.positionFor(src, previewNodeId)
    playback?.pauseAll()
  }
  previewVisible.value = true
}

function restorePreviewPosition(event) {
  if (!previewVideo.value || previewNodeId === null || event.target !== previewVideo.value) return
  applyPlaybackPosition(previewVideo.value, previewPosition)
  previewPositionReady = true
}

function closePreview() {
  if (previewVideo.value) {
    previewVideo.value.pause()
    // 元数据可用不等于快照已恢复，关闭不能把默认的零进度覆盖回节点。
    if (previewPositionReady) playback?.syncPosition(previewVideo.value, previewNodeId)
  }
  previewPosition = null
  previewNodeId = null
  previewPositionReady = false
}

async function doDownload() {
  const node = mediaNode.value
  const src = node?.data?.src
  if (!src) return
  const prompt = node.data?.fileName || node.data?.label || node.data?.prompt || ''
  if (isVideo.value) {
    // 对齐 VideoList
    if (downloading.value) {
      message.warning('正在下载中，请稍后')
      return
    }
    downloading.value = true
    const fileName = `${String(prompt || 'video')
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 100)}.mp4`
    void downloadVideo(src, fileName)
      .then((result) => {
        if (result === 'fallback') {
          // message.warning('直链下载失败，已在新窗口打开视频链接，请手动保存')
        } else if (result === 'failed') {
          message.error('下载失败，请检查浏览器是否拦截弹窗后重试')
        }
      })
      .finally(() => {
        downloading.value = false
      })
    return
  }
  // 对齐 ImageList：useDownloader().download({ picUrl, prompt })
  await imageDownloader.download({ picUrl: src, prompt: prompt || 'image' })
}

function openExpand() {
  const node = textNode.value
  if (!node) return
  expandNodeId.value = node.id
  expandContent.value = node.data?.content || ''
  expandVisible.value = true
}

function saveExpand() {
  if (props.readonly) return
  const id = expandNodeId.value
  if (!id) return
  store.updateNodeData(
    id,
    { content: expandContent.value, outputValue: expandContent.value },
    getNodes.value
  )
  expandNodeId.value = null
}
</script>

<template>
  <Teleport to="body">
    <div v-if="barNode" class="node-action-bar" :style="barStyle" @mousedown.stop @click.stop>
      <template v-if="textNode">
        <span class="nab-meta">{{ textCharCount }} 字</span>
        <button class="nab-btn nab-btn-primary" title="查看文本" @click="openExpand"
          ><FullScreen class="nab-icon" aria-hidden="true" />{{
            readonly ? '查看' : '展开'
          }}</button
        >
      </template>
      <template v-else>
        <!-- <button class="nab-btn nab-btn-danger" title="删除节点" @click="deleteNode">🗑 删除</button> -->
        <button class="nab-btn" title="下载" :disabled="!hasMedia" @click="doDownload"
          ><Download class="nab-icon" aria-hidden="true" />下载</button
        >
        <button class="nab-btn" title="预览" :disabled="!hasMedia" @click="openPreview"
          ><View class="nab-icon" aria-hidden="true" />预览</button
        >
      </template>
    </div>

    <a-modal
      v-model:open="previewVisible"
      :title="isVideo ? '视频预览' : '图片预览'"
      width="720px"
      :footer="null"
      destroy-on-close
      class="canvas-preview-dialog"
      @cancel="closePreview"
    >
      <video
        v-if="previewKind === 'video'"
        ref="previewVideo"
        :src="previewUrl"
        controls
        autoplay
        class="preview-media"
        @loadedmetadata="restorePreviewPosition"
      />
      <img v-else :src="previewUrl" alt="预览" class="preview-media" />
    </a-modal>

    <a-modal
      v-model:open="expandVisible"
      title="编辑文本内容"
      width="720px"
      :footer="null"
      destroy-on-close
      class="text-expand-dialog"
      @cancel="saveExpand"
    >
      <p class="expand-hint">关闭窗口时会自动保存到当前文本节点</p>
      <textarea
        v-model="expandContent"
        :readonly="readonly"
        class="expand-editor"
        placeholder="输入内容..."
        @keydown.stop
        @mousedown.stop
      />
    </a-modal>
  </Teleport>
</template>

<style lang="scss" scoped>

.node-action-bar {
  position: fixed;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: #292927;
  border: 1px solid #45453f;
  border-radius: $radius-lg;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
}

.nab-meta {
  padding: 0 6px;
  font-size: 12px;
  color: #deddd7;
  white-space: nowrap;
}

.nab-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.nab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid $border-default;
  border-radius: $radius-sm;
  color: #deddd7;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: $text-primary;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &-primary {
    border-color: rgba($accent-primary, 0.4);
    color: $accent-text;
    &:hover:not(:disabled) {
      background: rgba($accent-primary, 0.12);
    }
  }

  &-danger:hover:not(:disabled) {
    color: #ff4d4d;
    border-color: rgba(#ff4d4d, 0.4);
    background: rgba(#ff4d4d, 0.1);
  }
}

.preview-media {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  display: block;
  background: #000;
  border-radius: $radius-md;
}
</style>

<style lang="scss">

.text-expand-dialog {
  .el-dialog__body {
    padding-top: 8px;
  }

  .expand-hint {
    margin: 0 0 10px;
    font-size: 12px;
    color: #aaa9a4;
  }

  .expand-editor {
    display: block;
    width: 100%;
    height: min(60vh, 520px);
    box-sizing: border-box;
    padding: 12px 14px;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.7;
    font-family: inherit;
    resize: none;
    outline: none;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
