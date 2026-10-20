<template>
  <div v-if="panelVisible" ref="panelRef" class="ai-panel" :style="panelStyle">
    <!-- ── Asset wall ── -->
    <div class="asset-row" @click.stop @mousedown.stop>
      <AssetMediaUpload
        v-if="canShowAssetUpload()"
        :can-add="true"
        :accept="mediaAccept"
        :video-image-constraints="currentMode === 'video'"
        :max-images="uploadRemainders.images"
        :max-videos="uploadRemainders.videos"
        :max-audios="uploadRemainders.audios"
        :cap-images="uploadRemainders.capImages"
        :cap-videos="uploadRemainders.capVideos"
        :cap-audios="uploadRemainders.capAudios"
        @change="uploadFiles"
        @library-select="handleLibrarySelect"
      />
      <div
        v-for="asset in displayAssets"
        :key="asset.id"
        class="asset-card"
        :class="{ uploading: asset.uploading }"
        :title="asset.label"
        @click="!asset.uploading && insertMention(asset)"
      >
        <div class="asset-thumb">
          <template v-if="asset.uploading">
            <span class="asset-loading">⏳</span>
          </template>
          <template v-else-if="asset.kind === 'image' && asset.thumb">
            <img :src="asset.thumb" class="asset-img" />
          </template>
          <template v-else-if="asset.kind === 'video' && asset.url">
            <VideoPoster
              :source="asset.url"
              :poster="referenceVideoPoster(asset)"
              class="asset-img"
            />
            <span class="asset-play">▶</span>
          </template>
          <template v-else-if="asset.kind === 'audio'">
            <span class="asset-placeholder">🎧</span>
          </template>
          <template v-else-if="asset.kind === 'document'">
            <span class="asset-placeholder">📄</span>
          </template>
          <span v-else class="asset-placeholder">{{
            asset.kind === 'image' ? '🖼' : asset.kind === 'video' ? '🎬' : '📝'
          }}</span>
        </div>
        <div class="asset-name">{{ asset.label }}</div>
        <button
          v-if="!asset.uploading"
          class="asset-remove"
          @click.stop="removeDisplayAsset(asset)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- ── Prompt area ── -->
    <div class="prompt-wrap">
      <div
        ref="promptHighlightRef"
        class="prompt-highlight"
        aria-hidden="true"
        v-html="promptHtml"
      />
      <textarea
        ref="promptInputRef"
        v-model="promptText"
        rows="4"
        class="prompt-input"
        :placeholder="PROMPT_PLACEHOLDER"
        @input="onPromptInput"
        @scroll="syncPromptHighlight"
        @keydown="onPromptKeydown"
        @focus="onPromptFocus"
        @blur="onPromptBlur"
        @keydown.stop.exact
        @click.stop.exact
      />
      <div
        v-if="mentionActive && mentionItems.length"
        class="mention-drop"
        :style="mentionDropStyle"
        @mousedown.prevent
      >
        <div
          v-for="(asset, i) in mentionItems"
          :key="asset.id || asset.nodeId"
          class="mention-drop-item"
          :class="{ active: i === mentionActiveIdx }"
          @click="selectMentionItem(asset)"
        >
          <img
            v-if="asset.kind === 'image' && (asset.thumb || asset.url)"
            :src="asset.thumb || asset.url"
            class="mention-drop-thumb"
          />
          <span v-else class="mention-drop-icon">
            {{ asset.kind === 'video' ? '🎬' : asset.kind === 'audio' ? '🎧' : '📝' }}
          </span>
          <span class="mention-drop-label">{{ asset.label }}</span>
        </div>
      </div>
    </div>

    <!-- Progress bar when generating -->
    <!-- <div v-if="isNodeGenerating" class="gen-progress">
      <div class="gen-progress-fill" :style="{ width: genProgress + '%' }" />
    </div> -->

    <!-- ── Bottom toolbar ── -->
    <div class="panel-toolbar">
      <!-- Left: Model selector -->
      <div class="toolbar-left">
        <component
          :is="currentMode === 'video' ? VideoCamera : currentMode === 'image' ? Picture : Document"
          class="model-icon"
          aria-hidden="true"
        />
        <select
          v-model="selectedModel"
          aria-label="生成模型"
          class="model-select"
          @change="onSettingsChange"
        >
          <option
            v-for="m in activeModels"
            :key="m.id"
            :value="m.id"
            :disabled="isModelDisabled(m)"
          >
            {{ m.name }}{{ isModelDisabled(m) ? '（不支持当前素材数量）' : '' }}
          </option>
        </select>
      </div>

      <!-- Middle: params based on mode -->
      <div class="toolbar-mid">
        <!-- Image params -->
        <template v-if="currentMode === 'image'">
          <select v-model="imageRatio" class="param-select" aria-label="图片比例">
            <option v-for="r in imageRatios" :key="r" :value="r">{{ r }}</option>
          </select>
          <select
            v-if="imageResolutions.length"
            v-model="imageRes"
            class="param-select"
            aria-label="分辨率"
          >
            <option v-for="r in imageResolutions" :key="r" :value="r">{{ r }}</option>
          </select>
          <select v-model="imageCount" class="param-select count-select">
            <option v-for="n in 10" :key="n" :value="n"># {{ n }}次</option>
          </select>
        </template>

        <!-- Video params -->
        <template v-else-if="currentMode === 'video'">
          <a-popover
            v-model:open="videoSettingsOpen"
            placement="topLeft"
            trigger="click"
            overlay-class-name="canvas-video-settings-popover"
            :overlay-style="{ width: '320px' }"
            :overlay-inner-style="{ padding: 0, background: '#000' }"
          >
            <template #content>
              <div class="video-settings-pop">
                <div class="video-settings-section">
                  <div class="video-settings-title">画面比例</div>
                  <div class="ratio-grid">
                    <button
                      v-for="r in videoRatios"
                      :key="r"
                      type="button"
                      class="ratio-option"
                      :class="{ active: videoRatio === r }"
                      @click="
                        () => {
                          videoRatio = r
                          onSettingsChange()
                        }
                      "
                    >
                      <span v-if="videoRatio === r" class="ratio-check">✓</span>
                      <span class="ratio-preview" :style="ratioPreviewStyle(r)" />
                      <span class="ratio-label">{{ r }}</span>
                    </button>
                  </div>
                </div>

                <div class="video-settings-section">
                  <div class="video-settings-title">视频时长</div>
                  <div class="duration-slider-wrap">
                    <div class="duration-tooltip" :style="{ left: durationTooltipLeft }">
                      {{ videoDurationNum }}s
                    </div>
                    <a-slider
                      :key="durationSliderKey"
                      v-model:value="videoDurationNum"
                      class="duration-slider"
                      :min="vidDurationMin"
                      :max="vidDurationMax"
                      :step="1"
                      :tip-formatter="() => null"
                      @change="onSettingsChange"
                    />
                    <div class="duration-labels">
                      <span>{{ vidDurationMin }}s</span>
                      <span>{{ vidDurationMax }}s</span>
                    </div>
                  </div>
                </div>

                <div class="video-settings-section">
                  <div class="video-settings-title">分辨率</div>
                  <div class="res-grid">
                    <button
                      v-for="r in videoResolutions"
                      :key="r"
                      type="button"
                      class="res-option"
                      :class="{ active: videoRes === r }"
                      @click="
                        () => {
                          videoRes = r
                          onSettingsChange()
                        }
                      "
                    >
                      <span v-if="videoRes === r" class="ratio-check">✓</span>
                      {{ r }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
            <button type="button" class="param-select video-settings-trigger">
              <span class="video-settings-icon" aria-hidden="true">▤</span>
              <span class="video-settings-summary">{{ videoSettingsSummary }}</span>
              <span class="video-settings-chevron" aria-hidden="true">▾</span>
            </button>
          </a-popover>
          <select v-model="videoCount" class="param-select count-select" @change="onSettingsChange">
            <option v-for="n in 10" :key="n" :value="n"># {{ n }}次</option>
          </select>
        </template>

        <!-- Text: no extra params -->
        <template v-else>
          <span class="mode-hint">文本生成</span>
        </template>
      </div>

      <!-- Right: points + submit -->
      <div class="toolbar-right">
        <span v-if="currentMode !== 'text'" class="points-estimate">
          <span class="points-prefix">+ 预计</span>
          {{ estimatedPoints }} 积分
        </span>
        <button
          class="submit-btn"
          aria-label="开始生成"
          :class="{ generating: isNodeGenerating }"
          :disabled="!canGenerate || isGenerationPending"
          @click="generate"
          :title="
            preflightingNodes.has(primaryNode?.id)
              ? '正在校验参考视频时长'
              : isGenerationPending && !isNodeGenerating
              ? '后台任务尚未结束，结果会自动更新，请勿重复提交'
              : 'Ctrl+Enter'
          "
        >
          <span v-if="isNodeGenerating" class="submit-spinner" />
          <Top v-else class="submit-icon" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div v-if="referenceDurationHint" class="reference-duration-hint" role="status">
      {{ referenceDurationHint }}
    </div>
  </div>
</template>

<script setup>
/**
 * AIPanel — floating AI input panel at canvas bottom center
 * 资产墙 + 富文本提示词 + 多模态工具栏
 */
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Picture, VideoCamera, Document, Top } from '../../shims/icons'
import { useResizeObserver } from '@vueuse/core'
import {
  createVideoReferencePreflight,
  submittedVideoReferences,
  resolveMinSingleVideoDuration,
} from '../../utils/videoReferencePreflight'
import { createGenerationScopes } from '../../utils/generationScope'
import { generationApi } from '../../api/generationApi'
import {
  findRecoverableVideoTasks,
  needsVideoTaskSync,
  submitPersistedVideoRequest,
  unconfirmedVideoRequestPatch,
  videoTaskPatch,
  videoTaskDisplayData,
  appliedVideoWaitPatch,
  isPersistedVideoTaskId,
} from '../../utils/discoverVideoTasks'
import { videoWaitState } from '../../utils/videoTaskWait.js'
import { recoverPendingGenerationTasks } from '../../utils/recoverPendingGenerationTasks'
import { canvasGenerationContext } from '../../utils/canvasGenerationContext'
import AssetMediaUpload from './AssetMediaUpload.vue'
import VideoPoster from './VideoPoster.vue'
import { useMediaAssetUpload, buildMediaAccept } from '../../composables/useMediaAssetUpload'
import { useFlowStore } from '../../stores/flowStore'
import { storeToRefs } from 'pinia'
import { useVueFlow } from '@vue-flow/core'
import { useUserPointsStore } from '../../shims/points'
import { useUserStore } from '../../shims/user'
import { useMessage } from '../../shims/message'
import { getAccessToken } from '@/lib/auth/storage'
import {
  submitImageTask,
  pollImageTask,
  submitVideoTask,
  pollVideoTask,
  buildVideoEstimateReq,
  fetchCommonModels,
  mapCommonModel,
  CommonModelType,
  multiModalSend,
} from '../../api/aiApi'
import { resolveAssetWallForNode, snapshotAssetWall, splitAssetWall } from '../../utils/assetWall'
import { buildGenerationPrompt } from '../../utils/buildGenerationPrompt'
import { stripMentionLabels } from '../../utils/stripMentionLabels'
import {
  buildGenFailPatch,
  buildVideoQueryInterruptedPatch,
  clearGenFailLabel,
} from '../../utils/genFailPatch'
import {
  canAddImageInput,
  sumRefMediaDuration,
  resolveMediaLimits,
} from '../../utils/refInputConstraints'
import { validateAudioTotalDuration } from '../../utils/audioConstraints'
import { validateVideoTotalDuration } from '../../utils/videoConstraints'
import {
  resolveImageDimensionsFromSettings,
  resolveVideoDimensionsFromSettings,
} from '../../utils/resolveNodeGenMeta'
import {
  validateAiImageConstraints,
  AI_IMAGE_CONSTRAINTS_TIP,
  formatAiImageValidationError,
} from '../../shims/imageConstraints'

const props = defineProps({
  projectId: { type: [String, Number], default: null },
  recordHistory: { type: Boolean, default: true },
  serverVideoTasks: { type: Array, default: () => [] },
  saveSubmittedTask: { type: Function, default: null },
})
const emit = defineEmits(['generation-complete', 'video-tasks-loaded', 'video-tasks-error'])
const generationScopes = createGenerationScopes(() => props.projectId)
const referencePreflight = createVideoReferencePreflight()
const preflightingNodes = reactive(new Set())
const preflightControllers = new Map()
let referenceRevision = 0
function cancelReferencePreflights() {
  referenceRevision++
  for (const controller of preflightControllers.values()) controller.abort()
}

watch(
  () => props.projectId,
  () => {
    generationScopes.invalidate()
    urgentDiscoveryQueued = false
    videoTaskListKnown = false
    cancelReferencePreflights()
    resumingTaskIds.clear()
    claimingTaskIds.clear()
    retryAfterByNode.clear()
    for (const id of Object.keys(genProgressByNode)) delete genProgressByNode[id]
  },
  { flush: 'sync' }
)

const flowStore = useFlowStore()
const userPointsStore = useUserPointsStore()
const userStore = useUserStore()
const message = useMessage()
const { nodes, edges, activePanelNodeId } = storeToRefs(flowStore)
const { findNode, getNodes, getViewport, onViewportChange, updateNodeInternals } = useVueFlow()

// ── Assets ───────────────────────────────────────────────────────────────────
const assets = ref([])
const {
  items: uploadedAssets,
  canAddAny,
  uploadFiles,
  removeItem: removeUploaded,
  addLibraryItem,
  setLinkedNodeId,
  updateItem: updateUploaded,
  clear: clearUploaded,
  mergeReplaceItems,
  setConfig: setUploadConfig,
} = useMediaAssetUpload()

const displayAssets = computed(() => {
  const nodeItems = assets.value.map((a) => ({
    ...a,
    id: a.nodeId,
    source: 'node',
    url: a.thumb,
  }))
  // 上传记录和它派生的连线节点是同一素材；优先显示节点的实时媒体与编号。
  const shownNodeIds = new Set(nodeItems.map((a) => a.nodeId))
  const uploadItems = uploadedAssets.value.filter(
    (a) => a.uploading || !a.linkedNodeId || !shownNodeIds.has(a.linkedNodeId)
  )
  return [...uploadItems, ...nodeItems]
})

function referenceInputSnapshot(nodeId) {
  const node = nodes.value.find((item) => item.id === nodeId)
  return JSON.stringify({
    project: props.projectId,
    node: node?.id,
    settings: node?.data?.settings,
    prompt: node?.data?.prompt,
    assets: resolveAssetWallForNode(node, nodes.value, edges.value).map((asset) => ({
      id: asset.nodeId || asset.id,
      kind: asset.kind,
      url: assetMediaUrl(asset),
    })),
  })
}

function referenceVideoPoster(asset) {
  const nodeId = asset.nodeId || asset.linkedNodeId
  return nodes.value.find((node) => node.id === nodeId)?.data?.poster || asset.poster || ''
}

/** 文本10；图/视频/音频上限来自当前模型 mediaLimits.platformMax*，缺省 9/3/3 */
const panelMediaLimits = ref(resolveMediaLimits(null))

function pendingUploadImages(excludeId = null) {
  return uploadedAssets.value.filter(
    (a) => a.kind === 'image' && !a.linkedNodeId && a.id !== excludeId
  ).length
}

function pendingUploadVideos(excludeId = null) {
  return uploadedAssets.value.filter(
    (a) => a.kind === 'video' && !a.linkedNodeId && a.id !== excludeId
  ).length
}

function pendingUploadAudios(excludeId = null) {
  return uploadedAssets.value.filter(
    (a) => a.kind === 'audio' && !a.linkedNodeId && a.id !== excludeId
  ).length
}

function sumWallAudioDuration(wall) {
  let total = 0
  for (const a of wall) {
    if (a.kind !== 'audio' || !a.nodeId) continue
    const n = nodes.value.find((node) => node.id === a.nodeId)
    const d = Number(n?.data?.duration)
    if (Number.isFinite(d) && d > 0) total += d
  }
  return total
}

function sumWallVideoDuration(wall) {
  let total = 0
  for (const a of wall) {
    if (a.kind !== 'video' || !a.nodeId) continue
    const n = nodes.value.find((node) => node.id === a.nodeId)
    const d = Number(n?.data?.duration)
    if (Number.isFinite(d) && d > 0) total += d
  }
  return total
}

function canShowAssetUpload() {
  const mode = getKind(primaryNode.value?.type)
  const limits = panelMediaLimits.value
  if (mode === 'video') {
    return (
      panelImageCount.value < limits.images ||
      panelVideoCount.value < limits.videos ||
      panelAudioCount.value < limits.audios
    )
  }
  if (mode === 'image' && panelImageCount.value >= limits.images) {
    return false
  }
  return canAddAny()
}

const panelImageCount = computed(() => {
  return displayAssets.value.filter((a) => a.kind === 'image').length
})
const panelVideoCount = computed(() => {
  return displayAssets.value.filter((a) => a.kind === 'video').length
})
const panelAudioCount = computed(() => {
  return displayAssets.value.filter((a) => a.kind === 'audio').length
})

/** 各类型剩余可添加上限 — 对齐 resolveMediaLimits.platformMax* */
const uploadRemainders = computed(() => {
  const limits = panelMediaLimits.value
  const mode = getKind(primaryNode.value?.type)
  if (mode === 'image') {
    return {
      images: Math.max(0, limits.images - panelImageCount.value),
      videos: 0,
      audios: 0,
      capImages: limits.images,
      capVideos: 0,
      capAudios: 0,
    }
  }
  if (mode === 'video') {
    return {
      images: Math.max(0, limits.images - panelImageCount.value),
      videos: Math.max(0, limits.videos - panelVideoCount.value),
      audios: Math.max(0, limits.audios - panelAudioCount.value),
      capImages: limits.images,
      capVideos: limits.videos,
      capAudios: limits.audios,
    }
  }
  if (mode === 'text') {
    const remain = Math.max(0, 10 - displayAssets.value.length)
    return {
      images: remain,
      videos: remain,
      audios: 0,
      capImages: 10,
      capVideos: 10,
      capAudios: 0,
    }
  }
  return { images: 0, videos: 0, audios: 0, capImages: 0, capVideos: 0, capAudios: 0 }
})

function sumPanelMediaDuration(kind) {
  let total = 0
  for (const a of displayAssets.value) {
    if (a.kind !== kind) continue
    if (a.source === 'upload') {
      const d = Number(a.duration)
      if (Number.isFinite(d) && d > 0) total += d
      continue
    }
    if (!a.nodeId) continue
    const n = nodes.value.find((node) => node.id === a.nodeId)
    const d = Number(n?.data?.duration)
    if (Number.isFinite(d) && d > 0) total += d
  }
  return total
}

const panelVideoTotalDuration = computed(() => sumPanelMediaDuration('video'))
const panelAudioTotalDuration = computed(() => sumPanelMediaDuration('audio'))

function applyUploadLimitsForMode(mode) {
  const wall = assets.value
  const wallImages = wall.filter((a) => a.kind === 'image').length
  const wallVideos = wall.filter((a) => a.kind === 'video').length
  const wallAudios = wall.filter((a) => a.kind === 'audio').length
  const externalCount = wall.length
  const pendingImages = pendingUploadImages()
  const limits = panelMediaLimits.value
  if (mode === 'text') {
    setUploadConfig({
      maxTotal: 10,
      maxImages: 10,
      maxVideos: 10,
      maxDocs: 0,
      maxAudios: 0,
      allowImage: true,
      allowVideo: true,
      allowAudio: false,
      allowDoc: false,
      externalCount,
    })
  } else if (mode === 'image') {
    setUploadConfig({
      maxTotal: limits.images,
      maxImages: limits.images,
      maxVideos: 0,
      maxDocs: 0,
      maxAudios: 0,
      allowImage: wallImages + pendingImages < limits.images,
      allowVideo: false,
      allowAudio: false,
      allowDoc: false,
      externalCount: 0,
      externalImageCount: wallImages,
    })
  } else if (mode === 'video') {
    const pendingVideos = pendingUploadVideos()
    const pendingAudios = pendingUploadAudios()
    setUploadConfig({
      maxTotal: Infinity,
      maxVisual: null,
      maxImages: limits.images,
      maxVideos: limits.videos,
      maxAudios: limits.audios,
      maxDocs: 0,
      allowImage: wallImages + pendingImages < limits.images,
      allowVideo: wallVideos + pendingVideos < limits.videos,
      allowAudio: wallAudios + pendingAudios < limits.audios,
      allowDoc: false,
      externalCount: 0,
      externalImageCount: wallImages,
      externalVideoCount: wallVideos,
      externalAudioCount: wallAudios,
      externalAudioDuration: sumWallAudioDuration(wall),
      externalVideoDuration: sumWallVideoDuration(wall),
      maxVideoTotalDuration: getVidDurationMaxForModel(selectedModel.value),
      maxAudioTotalDuration: getAudioDurationMaxForModel(selectedModel.value),
    })
  }
}

const mediaAccept = computed(() => {
  const mode = getKind(primaryNode.value?.type) ?? 'text'
  if (mode === 'text') {
    return buildMediaAccept({
      allowImage: true,
      allowVideo: true,
      allowAudio: false,
      allowDoc: false,
    })
  }
  if (mode === 'image') {
    return buildMediaAccept({
      allowImage: true,
      allowVideo: false,
      allowAudio: false,
      allowDoc: false,
    })
  }
  return buildMediaAccept({
    allowImage: panelImageCount.value < panelMediaLimits.value.images,
    allowVideo: panelVideoCount.value < panelMediaLimits.value.videos,
    allowAudio: panelAudioCount.value < panelMediaLimits.value.audios,
    allowDoc: false,
  })
})

// Auto-sync assets from the active panel node
const primaryNode = computed(() => {
  const id = activePanelNodeId.value
  if (!id) return null
  return nodes.value.find((n) => n.id === id) ?? null
})

const panelVisible = computed(
  () =>
    originalPanelVisible.value &&
    (!primaryNode.value || flowStore.canEditNode(primaryNode.value.id))
)
const originalPanelVisible = computed(() => {
  const n = primaryNode.value
  return n != null && getKind(n.type) != null
})

const promptText = ref('')

function buildAssetFromNode(node) {
  const kind = getKind(node.type)
  if (!kind) return null
  const prefix = kind === 'image' ? '图片' : kind === 'video' ? '视频' : '文本'
  return {
    nodeId: node.id,
    label: node.data?.label || prefix,
    thumb: node.data?.src || node.data?.poster || '',
    kind,
  }
}

function liveThumb(nodeId, fallback = '') {
  const live = nodes.value.find((n) => n.id === nodeId)
  return live?.data?.src || live?.data?.poster || fallback
}

function loadPanelFromNode(node) {
  if (!node) {
    assets.value = []
    clearUploaded()
    promptText.value = ''
    return
  }

  refreshAssetsFromNode(node)
  promptText.value = node.data?.prompt ?? ''
}

/** 仅刷新资产墙，不碰 prompt — 入边/上游变化时用，避免覆盖正在编辑的提示词 */
function refreshAssetsFromNode(node) {
  if (!node) {
    assets.value = []
    clearUploaded()
    return
  }
  const wall = resolveAssetWallForNode(node, nodes.value, edges.value)
  const { nodeAssets, uploads } = splitAssetWall(wall)
  assets.value = nodeAssets.map((a) => ({
    ...a,
    thumb: liveThumb(a.nodeId, a.thumb),
  }))
  // 保留 uploading 占位，避免同批多选被冲掉（只能传 2 张的根因）
  mergeReplaceItems(uploads, nodeAssets.map((a) => a.nodeId).filter(Boolean))
  applyUploadLimitsForMode(getKind(node.type) ?? 'text')
}

let syncingPanel = false
let persistTimer = null
// 切面板节点时同步置位，抢在 activeModels/selectedModel 等 watcher 前，避免 flush 写错模型
watch(
  () => activePanelNodeId.value,
  () => {
    syncingPanel = true
  },
  { flush: 'sync' }
)
const viewportTick = ref(0)
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

const incomingEdgeSig = computed(() => {
  const id = primaryNode.value?.id
  if (!id) return ''
  return edges.value
    .filter((e) => e.target === id)
    .map((e) => e.source)
    .sort()
    .join(',')
})

watch(incomingEdgeSig, () => {
  const node = primaryNode.value
  if (!node || syncingPanel) return
  syncingPanel = true
  refreshAssetsFromNode(node)
  syncingPanel = false
})

const upstreamOutputSig = computed(() => {
  const id = primaryNode.value?.id
  if (!id) return ''
  return edges.value
    .filter((e) => e.target === id)
    .map((e) => {
      const src = nodes.value.find((n) => n.id === e.source)
      return `${e.source}:${src?.data?.src || src?.data?.poster || src?.data?.content || ''}`
    })
    .sort()
    .join('|')
})

watch(upstreamOutputSig, () => {
  const node = primaryNode.value
  if (!node || syncingPanel) return
  syncingPanel = true
  refreshAssetsFromNode(node)
  syncingPanel = false
})

function removeDisplayAsset(asset) {
  const label = asset?.label
  if (label) {
    const next = stripMentionLabels(promptText.value, [label])
    if (next !== promptText.value) promptText.value = next
  }
  const primary = primaryNode.value
  // 资产墙删除只拆链接关系，保留上传节点与远端文件
  const unlinkSource = (sourceId) => {
    if (!primary || !sourceId) return
    const edgeIds = edges.value
      .filter((e) => e.source === sourceId && e.target === primary.id)
      .map((e) => e.id)
    if (edgeIds.length) {
      flowStore.handleEdgesChange(edgeIds.map((id) => ({ type: 'remove', id })))
    }
  }

  if (asset.source === 'upload') {
    unlinkSource(asset.linkedNodeId)
    removeUploaded(asset.id)
  } else if (asset.nodeId) {
    unlinkSource(asset.nodeId)
    assets.value = assets.value.filter((a) => a.nodeId !== asset.nodeId)
    // 上传衍生节点在墙里以 node 展示时，同步清 uploaded 项（不解文件）
    const linked = uploadedAssets.value.find((a) => a.linkedNodeId === asset.nodeId)
    if (linked) removeUploaded(linked.id)
  }
  if (primary) {
    applyUploadLimitsForMode(getKind(primary.type) ?? 'text')
    flushPanelToNode(primary)
  }
}

/** 资产墙上传完成 → 在 primary 左侧创建上传节点并连入（图2） */
function spawnLinkedAssetNode(asset) {
  const primary = primaryNode.value
  if (!primary || asset.uploading || asset.linkedNodeId || !asset.url) return
  if (asset.kind !== 'image' && asset.kind !== 'video' && asset.kind !== 'audio') return

  const primaryKind = getKind(primary.type)
  if (asset.kind === 'image' && (primaryKind === 'video' || primaryKind === 'image')) {
    const pending = pendingUploadImages(asset.id)
    const maxImages = panelMediaLimits.value.images
    // pendingUploadImages() 已排除当前 asset；countImageInputs 内会统计墙内未连线上传图，
    // 这里不再额外 +1，避免把当前图重复计数导致第 9 张被误判超限。
    if (!canAddImageInput(primary.id, nodes.value, edges.value, pending, maxImages)) {
      message.warning(`图片上传和连线总共不能超过 ${maxImages} 个`)
      removeUploaded(asset.id)
      return
    }
  }

  if (asset.kind === 'video' && primaryKind === 'video') {
    if (panelVideoCount.value > panelMediaLimits.value.videos) {
      message.warning(`参考视频已达上限 ${panelMediaLimits.value.videos} 个`)
      removeUploaded(asset.id)
      return
    }
  }

  if (asset.kind === 'audio' && primaryKind === 'video') {
    if (panelAudioCount.value > panelMediaLimits.value.audios) {
      message.warning(`参考音频已达上限 ${panelMediaLimits.value.audios} 个`)
      removeUploaded(asset.id)
      return
    }
  }

  if (asset.kind === 'audio' && primaryKind === 'video' && asset.duration) {
    const existing = sumRefMediaDuration(primary.id, nodes.value, edges.value, 'audio')
    const totalErr = validateAudioTotalDuration(
      existing,
      asset.duration,
      getAudioDurationMaxForModel(selectedModel.value)
    )
    if (totalErr) {
      message.warning(totalErr)
      removeUploaded(asset.id)
      return
    }
  }

  if (asset.kind === 'video' && primaryKind === 'video' && asset.duration) {
    const existing = sumRefMediaDuration(primary.id, nodes.value, edges.value, 'video')
    const totalErr = validateVideoTotalDuration(
      existing,
      asset.duration,
      getVidDurationMaxForModel(selectedModel.value)
    )
    if (totalErr) {
      message.warning(totalErr)
      removeUploaded(asset.id)
      return
    }
  }

  const type =
    asset.kind === 'image'
      ? 'imageUploadNode'
      : asset.kind === 'video'
      ? 'videoUploadNode'
      : 'audioUploadNode'
  const uploadNodeW = asset.kind === 'audio' ? 280 : 200
  const newH = asset.kind === 'audio' ? 140 : 160
  const linkedCount = uploadedAssets.value.filter((a) => a.linkedNodeId).length
  const startX = primary.position.x - uploadNodeW - 120
  const startY = primary.position.y + linkedCount * (newH + NODE_GAP)
  const newPos = findFreePosition(startX, startY, uploadNodeW, newH)

  const newNode = flowStore.addNodeOfType(type, newPos, getNodes.value)
  if (!newNode) return

  const label =
    asset.kind === 'image' ? '图片节点' : asset.kind === 'video' ? '视频节点' : '音频节点'
  const patch = {
    src: asset.url,
    outputValue: asset.url,
    label,
    linkedAssetId: asset.id,
  }
  if (asset.fileName) patch.fileName = asset.fileName
  if (asset.kind === 'audio' && asset.duration) patch.duration = asset.duration
  if (asset.kind === 'video' && asset.duration) patch.duration = asset.duration

  flowStore.updateNodeData(newNode.id, patch, getNodes.value)
  setLinkedNodeId(asset.id, newNode.id)
  const sourceId = newNode.id
  const targetId = primary.id
  // 节点挂载并量完连接点后再连线，否则 Vue Flow 画不出边，刷新后才出现
  nextTick(() => {
    updateNodeInternals(sourceId)
    updateNodeInternals(targetId)
    nextTick(() => {
      flowStore.addEdge({
        id: `edge-${sourceId}-${targetId}-${Date.now()}`,
        source: sourceId,
        sourceHandle: 'sr',
        target: targetId,
        targetHandle: 'tl',
      })
    })
  })
}

watch(
  uploadedAssets,
  () => {
    for (const asset of uploadedAssets.value) spawnLinkedAssetNode(asset)
  },
  { deep: true }
)

function handleLibrarySelect(items = []) {
  const accepted = []
  for (const item of items) {
    const id = addLibraryItem({
      url: item.url,
      kind: item.kind,
      name: item.name,
      cover: item.cover,
      duration: item.duration,
    })
    if (id) accepted.push(id)
  }
  if (!accepted.length) return
  const primary = primaryNode.value
  if (primary) {
    applyUploadLimitsForMode(getKind(primary.type) ?? 'text')
    flushPanelToNode(primary)
  }
}

// 节点内替换媒体 → 同步资产墙缩略图
watch(
  nodes,
  () => {
    for (const asset of uploadedAssets.value) {
      if (!asset.linkedNodeId) continue
      const node = nodes.value.find((n) => n.id === asset.linkedNodeId)
      const src = node?.data?.src
      if (src && src !== asset.url) {
        updateUploaded(asset.id, { url: src, thumb: src })
      }
    }
  },
  { deep: true }
)

function insertMention(asset) {
  const textarea = getTextarea()
  const token = `@${asset.label} `
  if (!textarea) {
    promptText.value += (promptText.value ? ' ' : '') + token
    return
  }
  textarea.focus()
  const start = textarea.selectionStart ?? promptText.value.length
  const end = textarea.selectionEnd ?? start
  const before = promptText.value.slice(0, start)
  const after = promptText.value.slice(end)
  promptText.value = before + token + after
  nextTick(() => {
    const pos = before.length + token.length
    textarea.setSelectionRange(pos, pos)
    detectMention(promptText.value)
  })
}

function getKind(type) {
  if (!type) return null
  if (type.includes('image')) return 'image'
  if (type.includes('video')) return 'video'
  if (type === 'textNode') return 'text'
  return null
}

const promptInputRef = ref(null)
const promptHighlightRef = ref(null)
const promptFocused = ref(false)

const PROMPT_PLACEHOLDER = '描述你想生成的内容，可 @ 引用上方资产...'

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentionAssets() {
  return displayAssets.value
    .filter((asset) => asset.label && !asset.uploading)
    .slice()
    .sort((a, b) => b.label.length - a.label.length)
}

function mentionPattern(items) {
  return new RegExp(`@(${items.map((asset) => escapeRegExp(asset.label)).join('|')})`, 'g')
}

/** `@标签` 以及紧跟的一个空格，当成一整段 */
function mentionTokenRanges(text) {
  const items = mentionAssets()
  if (!text || !items.length) return []
  const ranges = []
  for (const match of text.matchAll(mentionPattern(items))) {
    const start = match.index ?? 0
    let end = start + match[0].length
    if (text[end] === ' ') end += 1
    ranges.push({ start, end, label: match[1] })
  }
  return ranges
}

const promptHtml = computed(() => {
  const text = promptText.value || ''
  if (!text) return ''
  const items = mentionAssets()
  if (!items.length) return escapeHtml(text)
  const kindOf = new Map(items.map((asset) => [asset.label, asset.kind || 'text']))
  let html = ''
  let last = 0
  for (const match of text.matchAll(mentionPattern(items))) {
    const index = match.index ?? 0
    html += escapeHtml(text.slice(last, index))
    const label = match[1]
    const rawKind = kindOf.get(label)
    const kind = ['image', 'video', 'audio', 'text', 'document'].includes(rawKind) ? rawKind : 'text'
    html += `<span class="mention-chip mention-chip--${kind}">@${escapeHtml(label)}</span>`
    last = index + match[0].length
  }
  html += escapeHtml(text.slice(last))
  return html
})

function removeMentionTokens(event) {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false
  if (event.metaKey || event.ctrlKey || event.altKey) return false
  const textarea = getTextarea()
  if (!textarea) return false
  const text = promptText.value || ''
  const ranges = mentionTokenRanges(text)
  if (!ranges.length) return false

  let start = textarea.selectionStart ?? 0
  let end = textarea.selectionEnd ?? start
  if (start === end) {
    const hit = ranges.find((range) =>
      event.key === 'Backspace'
        ? range.start < start && start <= range.end
        : range.start <= start && start < range.end
    )
    if (!hit) return false
    start = hit.start
    end = hit.end
  } else {
    let nextStart = start
    let nextEnd = end
    for (const range of ranges) {
      if (range.start >= end || range.end <= start) continue
      nextStart = Math.min(nextStart, range.start)
      nextEnd = Math.max(nextEnd, range.end)
    }
    if (nextStart === start && nextEnd === end) return false
    start = nextStart
    end = nextEnd
  }

  event.preventDefault()
  promptText.value = text.slice(0, start) + text.slice(end)
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start, start)
    detectMention(promptText.value)
  })
  return true
}

function syncPromptHighlight(event) {
  const el = promptHighlightRef.value
  if (!el) return
  el.scrollTop = event.target.scrollTop
  el.scrollLeft = event.target.scrollLeft
}

// ── @mention dropdown ─────────────────────────────────────────────────────────
const mentionActive = ref(false)
const mentionQuery = ref('')
const mentionActiveIdx = ref(0)
const mentionStart = ref(-1)
const mentionDropStyle = ref({ top: '0px', left: '0px' })
let mentionScrollCleanup = null

const mentionItems = computed(() => {
  const q = mentionQuery.value.toLowerCase()
  return displayAssets.value.filter(
    (a) => !a.uploading && (!q || a.label.toLowerCase().includes(q))
  )
})

function closeMention() {
  mentionActive.value = false
  mentionQuery.value = ''
  mentionActiveIdx.value = 0
  mentionStart.value = -1
  mentionScrollCleanup?.()
  mentionScrollCleanup = null
}

function getTextarea() {
  const el = promptInputRef.value
  if (!el) return null
  if (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) return el
  return el.textarea ?? el.$el?.querySelector?.('textarea') ?? null
}

function getCaretCoordinates(textarea, position) {
  const style = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  document.body.appendChild(mirror)

  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'

  const styleProps = [
    'boxSizing',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'lineHeight',
    'letterSpacing',
    'textTransform',
    'wordSpacing',
    'textIndent',
  ]

  styleProps.forEach((prop) => {
    mirror.style.setProperty(prop, style.getPropertyValue(prop))
  })
  mirror.style.width = `${textarea.clientWidth}px`
  mirror.textContent = textarea.value.substring(0, position)

  const marker = document.createElement('span')
  marker.textContent = textarea.value.substring(position, position + 1) || '.'
  mirror.appendChild(marker)

  const coordinates = {
    top: marker.offsetTop,
    left: marker.offsetLeft,
    height: marker.offsetHeight,
  }

  document.body.removeChild(mirror)
  return coordinates
}

function updateMentionDropPosition() {
  const textarea = getTextarea()
  const containerEl = textarea?.closest('.prompt-wrap')
  if (!textarea || !containerEl || mentionStart.value < 0) return

  const coords = getCaretCoordinates(textarea, mentionStart.value + 1)
  const containerRect = containerEl.getBoundingClientRect()
  const textareaRect = textarea.getBoundingClientRect()
  const top =
    textareaRect.top - containerRect.top + coords.top - textarea.scrollTop + coords.height + 4
  const left = textareaRect.left - containerRect.left + coords.left - textarea.scrollLeft

  mentionDropStyle.value = {
    top: `${top}px`,
    left: `${Math.max(0, left)}px`,
  }
}

function bindTextareaScroll() {
  mentionScrollCleanup?.()
  const textarea = getTextarea()
  if (!textarea) return
  const handler = () => updateMentionDropPosition()
  textarea.addEventListener('scroll', handler)
  mentionScrollCleanup = () => textarea.removeEventListener('scroll', handler)
}

function detectMention(value) {
  const textarea = getTextarea()
  if (!textarea) {
    closeMention()
    return
  }

  const text = typeof value === 'string' ? value : ''
  const cursor = textarea.selectionStart ?? text.length
  const before = text.slice(0, cursor)
  const atIndex = Math.max(before.lastIndexOf('@'), before.lastIndexOf('＠'))

  if (atIndex === -1) {
    closeMention()
    return
  }

  const query = before.slice(atIndex + 1)
  if (/\s/.test(query)) {
    closeMention()
    return
  }

  mentionStart.value = atIndex
  mentionQuery.value = query
  mentionActiveIdx.value = 0
  mentionActive.value = true
  nextTick(() => {
    updateMentionDropPosition()
    bindTextareaScroll()
  })
}

function selectMentionItem(asset) {
  const textarea = getTextarea()
  const value = promptText.value
  const start = mentionStart.value
  if (start < 0 || !textarea) return

  const cursor = textarea.selectionStart ?? value.length
  const before = value.slice(0, start)
  const after = value.slice(cursor)
  promptText.value = `${before}@${asset.label} ${after}`
  closeMention()

  nextTick(() => {
    const pos = before.length + asset.label.length + 2
    textarea.focus()
    textarea.setSelectionRange(pos, pos)
  })
}

function onPromptInput(event) {
  detectMention(event?.target?.value ?? promptText.value)
}

function onPromptFocus() {
  promptFocused.value = true
}

function onPromptBlur() {
  promptFocused.value = false
  flushPanelToNode()
  setTimeout(closeMention, 150)
}

function onPromptKeydown(e) {
  if (removeMentionTokens(e)) return
  if (mentionActive.value && mentionItems.value.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionActiveIdx.value = (mentionActiveIdx.value + 1) % mentionItems.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionActiveIdx.value =
        (mentionActiveIdx.value - 1 + mentionItems.value.length) % mentionItems.value.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectMentionItem(mentionItems.value[mentionActiveIdx.value])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMention()
      return
    }
  }
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    generate()
  }
}
const currentMode = computed(() => getKind(primaryNode.value?.type) ?? 'text')

watch(
  currentMode,
  (mode) => {
    applyUploadLimitsForMode(mode)
  },
  { immediate: true }
)

watch(panelVisible, (visible) => {
  if (visible) {
    nextTick(() => {
      viewportTick.value++
    })
  }
})

// ── Models ───────────────────────────────────────────────────────────────────
const gptImageModels = ref([])
const commonVideoModels = ref([])
const imageCostPoint = ref(0)
const videoCostPoint = ref(0)

const imageModels = computed(() => gptImageModels.value)
const videoModels = computed(() => commonVideoModels.value)
// 文本节点固定豆包；不传 modelId，后端自动选 doubao 多模态
const textModels = computed(() => [{ id: 'doubao', name: '豆包', icon: '💬' }])

const activeModels = computed(() => {
  if (currentMode.value === 'image') return imageModels.value
  if (currentMode.value === 'video') return videoModels.value
  return textModels.value
})

const selectedModel = ref('')

function ensureDefaultSelectedModel() {
  if (syncingPanel) return
  const models = activeModels.value
  if (!models.length) return
  if (!selectedModel.value || !models.some((m) => m.id === selectedModel.value)) {
    selectedModel.value = models[0]?.id || ''
  }
}

watch(activeModels, () => ensureDefaultSelectedModel(), { immediate: true })

async function loadGptImageModels() {
  const list = await fetchCommonModels(CommonModelType.IMAGE, 'GPT')
  gptImageModels.value = (list || []).map((item) => mapCommonModel(item, '🎨'))
  if (gptImageModels.value[0]) imageCostPoint.value = gptImageModels.value[0].costPoint
}

async function loadCommonVideoModels() {
  const list = await fetchCommonModels(CommonModelType.VIDEO)
  commonVideoModels.value = (list || []).map((item) => mapCommonModel(item, '🎬'))
  if (commonVideoModels.value[0]) videoCostPoint.value = commonVideoModels.value[0].costPoint
  if (currentMode.value === 'video') applyUploadLimitsForMode('video')
}

onMounted(() => {
  if (getAccessToken()) {
    userPointsStore.fetchUserPoints()
  }
  loadGptImageModels().catch(() => {})
  loadCommonVideoModels().catch(() => {})
})

const currentModel = computed(() => {
  if (currentMode.value === 'image') {
    return (
      gptImageModels.value.find((x) => x.id === selectedModel.value) ||
      gptImageModels.value[0] ||
      null
    )
  }
  if (currentMode.value === 'video') {
    return (
      commonVideoModels.value.find((x) => x.id === selectedModel.value) ||
      commonVideoModels.value[0] ||
      null
    )
  }
  return null
})

watch(
  () => currentModel.value?.mediaLimits,
  (ml) => {
    panelMediaLimits.value = resolveMediaLimits(ml)
    applyUploadLimitsForMode(currentMode.value)
  },
  { immediate: true }
)

// 切模型即刻写回 settings（selectedModel + mediaLimits）——与 videoRatio 同走 buildSettingsSnapshot；
// validateRefEdge/NodeAddButton 读节点上限，不能等 800ms 防抖
watch(selectedModel, () => {
  if (syncingPanel) return
  flushPanelToNode()
})

/** 当前墙上素材数超出目标模型上限 → 该模型置灰不可切换 */
function isModelDisabled(m) {
  if (currentMode.value === 'text') return false
  const limits = resolveMediaLimits(m?.mediaLimits)
  if (panelImageCount.value > limits.images) return true
  if (currentMode.value === 'video') {
    if (panelVideoCount.value > limits.videos) return true
    if (panelAudioCount.value > limits.audios) return true
    if (panelVideoTotalDuration.value > getVidDurationMaxForModel(m)) return true
    if (panelAudioTotalDuration.value > getAudioDurationMaxForModel(m)) return true
    const dur = parseInt(videoDuration.value, 10)
    if (!Number.isNaN(dur)) {
      if (dur > getVidDurationMaxForModel(m)) return true
      if (dur < getVidDurationMinForModel(m)) return true
    }
  }
  return false
}

// ── Image params ──────────────────────────────────────────────────────────────
const imageRatio = ref('')
const imageRes = ref('')
const imageCount = ref(1)

// ── Video params ──────────────────────────────────────────────────────────────
const videoRatio = ref('')
const videoDuration = ref('4')
const videoRes = ref('')
const videoCount = ref(1)
const VID_DURATION_MIN_FALLBACK = 4
const VID_DURATION_MAX_FALLBACK = 15
const AUDIO_DURATION_MAX_FALLBACK = 15

function resolveVideoModel(modelOrId) {
  if (modelOrId && typeof modelOrId === 'object') return modelOrId
  return commonVideoModels.value.find((x) => x.id === modelOrId)
}

function modelDuration(model, key, fallback) {
  const n = Number(model?.[key] ?? model?.mediaLimits?.[key])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function getVidDurationMinForModel(modelOrId) {
  return modelDuration(
    resolveVideoModel(modelOrId),
    'minTotalVideoDuration',
    VID_DURATION_MIN_FALLBACK
  )
}

function getVidDurationMaxForModel(modelOrId) {
  return modelDuration(
    resolveVideoModel(modelOrId),
    'maxTotalVideoDuration',
    VID_DURATION_MAX_FALLBACK
  )
}

function getAudioDurationMaxForModel(modelOrId) {
  return modelDuration(
    resolveVideoModel(modelOrId),
    'maxTotalAudioDuration',
    AUDIO_DURATION_MAX_FALLBACK
  )
}

function buildDurationLimitsSnapshot(model = currentModel.value) {
  if (!model) return null
  return {
    minTotalVideoDuration: model.minTotalVideoDuration ?? model.mediaLimits?.minTotalVideoDuration,
    maxTotalVideoDuration: model.maxTotalVideoDuration ?? model.mediaLimits?.maxTotalVideoDuration,
    minTotalAudioDuration: model.minTotalAudioDuration ?? model.mediaLimits?.minTotalAudioDuration,
    maxTotalAudioDuration: model.maxTotalAudioDuration ?? model.mediaLimits?.maxTotalAudioDuration,
  }
}

const vidDurationMin = computed(() => getVidDurationMinForModel(selectedModel.value))
const vidDurationMax = computed(() => getVidDurationMaxForModel(selectedModel.value))

function modelOptionList(list) {
  return Array.isArray(list) ? list.filter(Boolean) : []
}

const imageRatios = computed(() => {
  const m =
    gptImageModels.value.find((x) => x.id === selectedModel.value) || gptImageModels.value[0]
  return modelOptionList(m?.ratio)
})

const imageResolutions = computed(() => {
  const m =
    gptImageModels.value.find((x) => x.id === selectedModel.value) || gptImageModels.value[0]
  return modelOptionList(m?.resolution)
})

const videoRatios = computed(() => {
  const m =
    commonVideoModels.value.find((x) => x.id === selectedModel.value) || commonVideoModels.value[0]
  return modelOptionList(m?.ratio)
})

const videoResolutions = computed(() => {
  const m =
    commonVideoModels.value.find((x) => x.id === selectedModel.value) || commonVideoModels.value[0]
  return modelOptionList(m?.resolution)
})

function syncOptionToList(optionRef, options) {
  if (options.length && !options.includes(optionRef.value)) optionRef.value = options[0]
}

watch(imageRatios, (ratios) => syncOptionToList(imageRatio, ratios), { immediate: true })
watch(imageResolutions, (res) => syncOptionToList(imageRes, res), { immediate: true })
watch(videoRatios, (ratios) => syncOptionToList(videoRatio, ratios), { immediate: true })
watch(videoResolutions, (res) => syncOptionToList(videoRes, res), { immediate: true })

watch(selectedModel, () => {
  if (currentMode.value !== 'video') return
  const min = vidDurationMin.value
  const max = vidDurationMax.value
  const dur = parseInt(videoDuration.value, 10)
  if (!Number.isNaN(dur)) {
    videoDuration.value = String(Math.min(max, Math.max(min, dur)))
  }
  applyUploadLimitsForMode('video')
  durationSliderKey.value += 1
})

const videoSettingsOpen = ref(false)
/** popover 重开时 el-slider 内部 thumb 不跟 model 同步，靠 key 强制重挂 */
const durationSliderKey = ref(0)
watch(videoSettingsOpen, (open) => {
  if (!open) return
  nextTick(() => {
    durationSliderKey.value += 1
  })
})

const videoSettingsSummary = computed(
  () => `${videoRatio.value} ${videoDurationNum.value}s ${videoRes.value}`
)

function ratioPreviewStyle(ratio) {
  const [w, h] = ratio.split(':').map(Number)
  if (!w || !h) return {}
  const max = 14
  if (w >= h) {
    return { width: `${max}px`, height: `${Math.max(4, Math.round((max * h) / w))}px` }
  }
  return { width: `${Math.max(4, Math.round((max * w) / h))}px`, height: `${max}px` }
}

const videoDurationNum = computed({
  get: () => {
    const n = parseInt(videoDuration.value, 10)
    if (Number.isNaN(n)) return vidDurationMin.value
    return Math.min(vidDurationMax.value, Math.max(vidDurationMin.value, n))
  },
  set: (v) => {
    if (syncingPanel) return
    videoDuration.value = String(v)
  },
})

const durationTooltipLeft = computed(() => {
  const min = vidDurationMin.value
  const max = vidDurationMax.value
  const span = max - min
  const pct = span > 0 ? (videoDurationNum.value - min) / span : 0
  return `${pct * 100}%`
})

function buildVideoSettingsSnapshot(count = videoCount.value) {
  return {
    mode: 'video',
    selectedModel: selectedModel.value,
    videoRatio: videoRatio.value,
    videoDuration: videoDuration.value,
    videoRes: videoRes.value,
    videoCount: count,
    mediaLimits: currentModel.value?.mediaLimits || null,
    durationLimits: buildDurationLimitsSnapshot(),
  }
}

/** 历史成片（有 src、无 video settings）不反写面板参数，避免污染旧数据 */
function shouldPersistSettingsForNode(node) {
  const mode = getKind(node?.type)
  if (mode !== 'video') return true
  const data = node?.data
  return !(data?.src && data?.settings?.mode !== 'video')
}

function buildSettingsSnapshot() {
  const mode = currentMode.value
  if (mode === 'image') {
    return {
      mode,
      selectedModel: selectedModel.value,
      imageRatio: imageRatio.value,
      imageRes: imageRes.value,
      imageCount: imageCount.value,
      mediaLimits: currentModel.value?.mediaLimits || null,
    }
  }
  if (mode === 'video') {
    return buildVideoSettingsSnapshot()
  }
  return { mode, selectedModel: selectedModel.value }
}

function loadSettingsFromNode(node) {
  const mode = getKind(node?.type)
  if (mode === 'image') {
    const s = node?.data?.settings
    if (s?.mode === 'image' && s.imageRatio) imageRatio.value = s.imageRatio
    if (s?.mode === 'image' && s.imageRes) imageRes.value = s.imageRes
    imageCount.value = s?.mode === 'image' && s.imageCount ? s.imageCount : 1
    if (s?.mode === 'image' && s.selectedModel) selectedModel.value = s.selectedModel
  } else if (mode === 'video') {
    const s = node?.data?.settings
    if (s?.mode === 'video' && s.selectedModel) selectedModel.value = s.selectedModel
    if (s?.mode === 'video' && s.videoRatio) videoRatio.value = s.videoRatio
    if (s?.mode === 'video' && s.videoRes) videoRes.value = s.videoRes
    videoCount.value = s?.mode === 'video' && s.videoCount ? s.videoCount : 1
    videoDuration.value = s?.mode === 'video' && s.videoDuration ? s.videoDuration : '4'
    const dur = parseInt(videoDuration.value, 10)
    if (!Number.isNaN(dur)) {
      const modelId = s?.selectedModel || selectedModel.value
      const min = getVidDurationMinForModel(modelId)
      const max = getVidDurationMaxForModel(modelId)
      videoDuration.value = String(Math.min(max, Math.max(min, dur)))
    }
  } else if (node?.data?.settings?.selectedModel) {
    selectedModel.value = node.data.settings.selectedModel
  }
  if (mode === 'image') {
    syncOptionToList(imageRatio, imageRatios.value)
    syncOptionToList(imageRes, imageResolutions.value)
  }
  if (mode === 'video') {
    syncOptionToList(videoRatio, videoRatios.value)
    syncOptionToList(videoRes, videoResolutions.value)
  }
}

/** 用户明确修改生成配置时才为历史成片建立草稿；自动模型回填不走此入口。 */
function onSettingsChange() {
  const node = primaryNode.value
  if (!node || syncingPanel || !currentModel.value) return
  flowStore.updateNodeData(node.id, { settings: buildSettingsSnapshot() }, getNodes.value)
}

function buildPanelPatch(nodeAssets = assets.value) {
  const patch = {
    assetWall: snapshotAssetWall(nodeAssets, uploadedAssets.value),
    prompt: promptText.value,
  }
  if (shouldPersistSettingsForNode(primaryNode.value)) {
    patch.settings = buildSettingsSnapshot()
  }
  return patch
}

function persistPanelToNode(targetNode = primaryNode.value) {
  if (
    !targetNode ||
    targetNode.id !== primaryNode.value?.id ||
    syncingPanel ||
    flowStore.isDragging
  )
    return
  flowStore.updateNodeData(targetNode.id, buildPanelPatch(), getNodes.value)
}

function flushPanelToNode(targetNode = primaryNode.value) {
  clearTimeout(persistTimer)
  if (!targetNode || targetNode.id !== primaryNode.value?.id || syncingPanel) return
  flowStore.updateNodeData(targetNode.id, buildPanelPatch(), getNodes.value)
}

flowStore.registerPanelFlusher((nodeId) => {
  const node = nodes.value.find((n) => n.id === nodeId)
  if (node) flushPanelToNode(node)
})

let dragRaf = 0

function bumpPanelPosition() {
  viewportTick.value++
}

defineExpose({
  flushPanel: flushPanelToNode,
  bumpPanelPosition,
  resumePendingGenTasks,
  reloadPanel: () => loadActivePanel(activePanelNodeId.value),
})

onBeforeUnmount(() => {
  clearInterval(discoveryTimer)
  generationScopes.dispose()
  cancelReferencePreflights()
  flowStore.registerPanelFlusher(null)
  if (dragRaf) cancelAnimationFrame(dragRaf)
  mentionScrollCleanup?.()
})

let panelLoadGen = 0
function loadActivePanel(id) {
  // flush 已在 setActivePanelNode/clearActivePanelNode 改 id 前完成，避免 watch 顺序覆盖
  const gen = ++panelLoadGen
  promptFocused.value = false
  syncingPanel = true
  const node = id ? nodes.value.find((n) => n.id === id) ?? null : null
  loadPanelFromNode(node)
  loadSettingsFromNode(node)
  viewportTick.value++
  // slider 在本轮 render 才挂上；等 nextTick 再放行，避免 mount emit 把时长打回 4
  nextTick(() => {
    if (gen !== panelLoadGen) return
    syncingPanel = false
    ensureDefaultSelectedModel()
    if (videoSettingsOpen.value) durationSliderKey.value += 1
  })
}
watch(() => activePanelNodeId.value, loadActivePanel, { immediate: true })

watch(
  () => primaryNode.value?.data?.prompt,
  (next) => {
    if (syncingPanel || next == null) return
    if (next === promptText.value) return
    if (promptFocused.value) return
    // 生成中不把 node 里尚未 persist 的空 prompt 盖掉面板正在编辑的内容
    if (next === '' && isNodeGenerating.value && promptText.value) return
    // External scrub (edge/node delete) — pull into open panel
    promptText.value = next
  }
)

watch(
  [
    assets,
    uploadedAssets,
    promptText,
    selectedModel,
    imageRatio,
    imageRes,
    imageCount,
    videoRatio,
    videoDuration,
    videoRes,
    videoCount,
  ],
  () => {
    clearTimeout(persistTimer)
    // The server save is already debounced; keep the local draft current immediately.
    persistPanelToNode()
  },
  { deep: true, flush: 'sync' }
)

watch(
  () => flowStore.isDragging,
  (dragging, wasDragging) => {
    if (dragging) {
      const tick = () => {
        viewportTick.value++
        if (flowStore.isDragging) dragRaf = requestAnimationFrame(tick)
      }
      dragRaf = requestAnimationFrame(tick)
      return
    }
    if (wasDragging && !dragging) {
      clearTimeout(persistTimer)
      persistPanelToNode()
    }
  }
)

function assetMediaUrl(asset) {
  return asset.source === 'node'
    ? nodes.value.find((n) => n.id === asset.nodeId)?.data?.src
    : asset.url
}

function collectUrlsByKind(kind) {
  const urls = []

  for (const asset of displayAssets.value) {
    if (asset.uploading || asset.kind !== kind) continue
    const url = assetMediaUrl(asset)
    if (url && /^https?:/.test(url)) urls.push(url)
  }

  return [...new Set(urls)]
}

function collectRefImages() {
  const fromDisplay = collectUrlsByKind('image')

  const node = primaryNode.value
  if (!node || currentMode.value !== 'video') return fromDisplay

  const upstream = edges.value
    .filter((e) => e.target === node.id)
    .map((e) => nodes.value.find((n) => n.id === e.source))
    .filter((n) => n?.type?.includes('image') && n.data?.src)
    .map((n) => n.data.src)

  return [...new Set([...fromDisplay, ...upstream])]
}

function collectRefVideos() {
  return collectUrlsByKind('video')
}

function collectRefAudios() {
  return collectUrlsByKind('audio')
}

function imageNameFromUrl(url, index) {
  const asset = displayAssets.value.find(
    (a) => !a.uploading && a.kind === 'image' && assetMediaUrl(a) === url
  )
  return asset?.label || `参考图${index + 1}`
}

async function validateVideoRefImages(urls) {
  if (!urls.length) return true
  const results = await Promise.all(
    urls.map(async (url, i) => {
      const validation = await validateAiImageConstraints(url)
      return { ...validation, name: imageNameFromUrl(url, i) }
    })
  )
  const invalid = results.filter((r) => !r.valid)
  if (!invalid.length) return true
  const msg = invalid.map((item) => formatAiImageValidationError(item, item.name)).join('\n')
  message.warning(`图片不符合要求（${AI_IMAGE_CONSTRAINTS_TIP}）：\n${msg}`, { duration: 4000 })
  return false
}

// ── Points estimate ───────────────────────────────────────────────────────────
function resolutionScaleOf(model, res) {
  const n = Number(model?.resolutionScales?.[res])
  return Number.isFinite(n) && n > 0 ? n : 1
}

function currentEstimatedPoints() {
  if (currentMode.value === 'image') {
    const m = currentModel.value
    if (!m) return 0
    return (m.costPoint ?? 0) * resolutionScaleOf(m, imageRes.value) * imageCount.value
  }
  if (currentMode.value === 'video') {
    if (!videoCostPoint.value) return 0
    const m = currentModel.value
    if (!m) return 0
    return (
      videoCostPoint.value *
      resolutionScaleOf(m, videoRes.value) *
      videoDurationNum.value *
      videoCount.value
    )
  }
  return 0.05
}

const estimatedPoints = computed(() => currentEstimatedPoints().toFixed(2))

const canGenerate = computed(() => {
  if (buildGenerationPrompt(promptText.value, displayAssets.value, nodes.value)) return true
  if (currentMode.value === 'image') return collectRefImages().length > 0
  if (currentMode.value === 'video') {
    return (
      collectRefImages().length > 0 ||
      collectRefVideos().length > 0 ||
      collectRefAudios().length > 0
    )
  }
  return false
})

watch(
  [
    videoRatio,
    videoDuration,
    videoRes,
    videoCount,
    promptText,
    uploadedAssets,
    assets,
    selectedModel,
  ],
  () => {
    if (currentMode.value !== 'video') {
      videoCostPoint.value = 0
      return
    }
    const model =
      videoModels.value.find((m) => m.id === selectedModel.value) || videoModels.value[0]
    if (!model) {
      videoCostPoint.value = 0
      return
    }
    const req = buildVideoEstimateReq({
      prompt: promptText.value,
      aspect: videoRatio.value,
      duration: videoDuration.value,
      resolution: videoRes.value,
      refImages: collectRefImages(),
      refVideos: collectRefVideos(),
      refAudios: collectRefAudios(),
      modelId: model.modelId,
      model: model.model,
      mediaLimits: model.mediaLimits,
    })
    videoCostPoint.value = req ? model.costPoint : 0
  },
  { immediate: true, deep: true }
)

watch([selectedModel, imageCount], () => {
  const m = gptImageModels.value.find((x) => x.id === selectedModel.value)
  if (m) imageCostPoint.value = m.costPoint
})

// ── Generate ─────────────────────────────────────────────────────────────────
/** 按节点进度；批量生成时汇总下游占位节点的 generating */
const genProgressByNode = reactive({})

const batchOutputNodeIds = computed(() => {
  const id = primaryNode.value?.id
  if (!id) return []
  return edges.value
    .filter((e) => e.source === id && e.data?.role === 'generation-output')
    .map((e) => e.target)
})

const taskWaitNow = ref(Date.now())
const serverVideoTasksByNode = computed(
  () => new Map(props.serverVideoTasks.map((task) => [String(task.nodeId), task]))
)
function effectiveGenerationData(node) {
  return videoTaskDisplayData(node, serverVideoTasksByNode.value.get(String(node?.id)), {
    now: taskWaitNow.value,
  })
}
const isBatchGenerating = computed(() =>
  batchOutputNodeIds.value.some((cid) => {
    const n = nodes.value.find((item) => item.id === cid)
    const data = effectiveGenerationData(n)
    return (
      !data.genWaitTimedOut &&
      (!!n?.data?.generating || !!data.generating || (!!data.genTaskId && !data.src))
    )
  })
)

const isNodeGenerating = computed(
  () =>
    (!effectiveGenerationData(primaryNode.value).genWaitTimedOut &&
      (!!primaryNode.value?.data?.generating ||
        !!effectiveGenerationData(primaryNode.value).generating)) ||
    isBatchGenerating.value
)

// Stopping the spinner must not enable another paid submission while this task is unresolved.
const referenceDurationHint = computed(() => {
  if (currentMode.value !== 'video') return ''
  const model = videoModels.value.find((item) => item.id === selectedModel.value)
  if (!model) return ''
  try {
    const minimum = resolveMinSingleVideoDuration(model)
    const urls = submittedVideoReferences(
      collectRefVideos(),
      resolveMediaLimits(model.mediaLimits).videos
    )
    const short = displayAssets.value.find((asset) => {
      if (asset.kind !== 'video' || !urls.includes(assetMediaUrl(asset))) return false
      const duration = Number(
        asset.duration ?? nodes.value.find((n) => n.id === asset.nodeId)?.data?.duration
      )
      return Number.isFinite(duration) && duration > 0 && duration < minimum
    })
    return short ? `当前模型要求每个参考视频至少 ${minimum} 秒，请检查参考素材` : ''
  } catch (error) {
    return error.message
  }
})

const isGenerationPending = computed(() => {
  const targets = [
    primaryNode.value,
    ...batchOutputNodeIds.value.map((id) => nodes.value.find((n) => n.id === id)),
  ]
  return (
    preflightingNodes.has(primaryNode.value?.id) ||
    isNodeGenerating.value ||
    targets.some((node) => {
      const data = effectiveGenerationData(node)
      const requestPending =
        !!data.genRequestId &&
        (!(Number(data.genRequestedAt) > 0) ||
          taskWaitNow.value - Number(data.genRequestedAt) < 120000)
      return !!data.genTaskId || requestPending
    })
  )
})

const genProgress = computed(() => {
  const id = primaryNode.value?.id
  if (!id) return 0
  if (genProgressByNode[id] != null) return genProgressByNode[id]

  const childIds = batchOutputNodeIds.value
  if (!childIds.length) return 0
  const vals = childIds.map((cid) => {
    if (genProgressByNode[cid] != null) return genProgressByNode[cid]
    const n = nodes.value.find((item) => item.id === cid)
    return n?.data?.generating || (!!n?.data?.genTaskId && !n?.data?.src) ? 0 : 100
  })
  return Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length)
})

const NODE_GAP = 24
const resumingTaskIds = new Set()
const claimingTaskIds = new Set()
const submittingTaskIds = new Set()
let discoveryBusy = false
let lastDiscoveryAt = 0
const discoveryTimer = setInterval(() => {
  taskWaitNow.value = Date.now()
  if (!document.hidden) void resumePendingGenTasks()
}, 5000)
const retryAfterByNode = new Map()

function videoTaskErrorPatch(nodeId, err) {
  const data = nodes.value.find((node) => node.id === nodeId)?.data
  if ((!data?.genTaskId && !data?.genRequestId) || err?.generationFailed) {
    return {
      ...buildGenFailPatch('video', err),
      genAppliedTaskId: data?.genTaskId || data?.genAppliedTaskId || '',
      genTaskState: 30,
    }
  }
  if (err?.waitTimedOut || data?.genWaitTimedOut) {
    retryAfterByNode.set(nodeId, Date.now() + 30000)
    return videoWaitState({ ...data, genWaitTimedOut: true })
  }
  retryAfterByNode.set(nodeId, Date.now() + 30000)
  return buildVideoQueryInterruptedPatch(err)
}

function recoveredLabelPatch(nodeId, mode) {
  const node = getNodes.value.find((item) => item.id === nodeId)
  const label = clearGenFailLabel(mode, node?.data?.label)
  return label ? { label } : {}
}

function markGenTask(nodeId, taskId, kind) {
  if (!isPersistedVideoTaskId(taskId)) return
  const data = nodes.value.find((node) => node.id === nodeId)?.data
  const genRequestedAt = data?.genRequestedAt || Date.now()
  flowStore.updateNodeResult(
    nodeId,
    {
      genTaskId: String(taskId),
      genTaskKind: kind,
      generating: true,
      genError: '',
      ...(kind === 'video' ? { genRequestedAt, ...videoWaitState({ genRequestedAt }) } : {}),
      ...recoveredLabelPatch(nodeId, kind),
    },
    getNodes.value
  )
}

function applyImageResult(nodeId, result) {
  emit('generation-complete')
  flowStore.updateNodeResult(
    nodeId,
    {
      src: result.resultUrl,
      outputValue: result.resultUrl,
      generating: false,
      genError: '',
      genTaskId: '',
      genTaskKind: '',
      dimensions: result.width && result.height ? `${result.width} x ${result.height}` : undefined,
      ...recoveredLabelPatch(nodeId, 'image'),
    },
    getNodes.value
  )
}

function applyVideoResult(nodeId, result, { dimensions } = {}) {
  emit('generation-complete')
  const completedTaskId = nodes.value.find((node) => node.id === nodeId)?.data?.genTaskId
  const patch = {
    genAppliedTaskId: completedTaskId || '',
    genTaskState: 20,
    src: result.resultUrl,
    outputValue: result.resultUrl,
    poster: result.coverUrl || '',
    generating: false,
    genError: '',
    genTaskId: '',
    genTaskKind: '',
    genRequestId: '',
    genRequestedAt: 0,
    genWaitTimedOut: false,
    ...recoveredLabelPatch(nodeId, 'video'),
  }
  // 成片尺寸属于本次结果；settings/prompt/assetWall 属于用户的下一次生成草稿。
  if (dimensions) patch.dimensions = dimensions
  flowStore.updateNodeResult(nodeId, patch, getNodes.value)
}

async function pollImageForNode(nodeId, taskId, onProgress, resultExtra = {}) {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  resumingTaskIds.add(nodeId)
  try {
    markGenTask(nodeId, taskId, 'image')
    const result = await scope.wait(pollImageTask(taskId, scope.progress(onProgress)))
    if (!scope.isActive()) return
    applyImageResult(nodeId, result, resultExtra)
    return result
  } finally {
    resumingTaskIds.delete(nodeId)
  }
}

async function pollVideoForNode(nodeId, taskId, onProgress, resultExtra = {}) {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  resumingTaskIds.add(nodeId)
  try {
    markGenTask(nodeId, taskId, 'video')
    // A refresh can happen before the normal debounced autosave writes the task ID.
    let saved
    try {
      saved = await scope.wait(props.saveSubmittedTask?.())
    } catch {
      if (!scope.isActive()) return
      saved = false
    }
    if (saved === false) {
      message.warning('视频任务已提交，但画布保存失败；请先重试保存再刷新页面')
    }
    if (!scope.isActive()) return
    const result = await scope.wait(
      pollVideoTask(taskId, scope.progress(onProgress), {
        requestedAt: nodes.value.find((node) => node.id === nodeId)?.data?.genRequestedAt,
      })
    )
    if (!scope.isActive()) return
    applyVideoResult(nodeId, result, resultExtra)
    return result
  } finally {
    resumingTaskIds.delete(nodeId)
  }
}

async function runImageGenForNode(nodeId, taskParams, onProgress, resultExtra = {}) {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  const taskId = await scope.wait(
    submitImageTask({
      ...taskParams,
      ...canvasGenerationContext(props.projectId, nodeId, props.recordHistory),
    })
  )
  if (!scope.isActive()) return
  return pollImageForNode(nodeId, taskId, onProgress, resultExtra)
}

async function runVideoGenForNode(
  nodeId,
  taskParams,
  onProgress,
  resultExtra = {},
  assertInputs = () => {}
) {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  const context = canvasGenerationContext(props.projectId, nodeId, props.recordHistory)
  const requestId = context.canvasProjectId ? crypto.randomUUID() : ''
  const previousData = nodes.value.find((item) => item.id === nodeId)?.data || {}
  const previousTask = Object.fromEntries(
    [
      'genRequestId',
      'genRequestedAt',
      'genWaitTimedOut',
      'genTaskId',
      'genTaskKind',
      'genError',
    ].map((key) => [key, previousData[key]])
  )
  submittingTaskIds.add(nodeId)
  try {
    // A saved request marker survives even when refresh cancels the POST response.
    flowStore.updateNodeResult(
      nodeId,
      {
        genRequestId: requestId,
        genRequestedAt: Date.now(),
        genWaitTimedOut: false,
        genTaskId: '',
        genTaskKind: 'video',
        generating: true,
        genError: '',
      },
      getNodes.value
    )
    const taskId = await submitPersistedVideoRequest({
      save: async () => {
        const saved = await scope.wait(props.saveSubmittedTask?.())
        if (saved === false) {
          flowStore.updateNodeResult(
            nodeId,
            { genRequestId: '', genRequestedAt: 0 },
            getNodes.value
          )
        }
        return saved
      },
      submit: () => {
        assertInputs()
        return scope.wait(
          submitVideoTask({
            ...taskParams,
            ...context,
            canvasRequestId: requestId || undefined,
          })
        )
      },
    })
    if (!scope.isActive()) return
    return await pollVideoForNode(nodeId, taskId, onProgress, resultExtra)
  } catch (error) {
    if (error?.preSubmissionCancelled && scope.isActive()) {
      flowStore.updateNodeResult(nodeId, { ...previousTask, generating: false }, getNodes.value)
      try {
        await scope.wait(props.saveSubmittedTask?.())
      } catch {
        /* Keep the known pre-submit cancellation. */
      }
    }
    throw error
  } finally {
    submittingTaskIds.delete(nodeId)
  }
}

let urgentDiscoveryQueued = false
let videoTaskListKnown = false
async function discoverSubmittedVideoTasks(force = false) {
  if (force && discoveryBusy) {
    urgentDiscoveryQueued = true
    return
  }
  if (!props.recordHistory || !props.projectId || discoveryBusy) return
  if (!force && videoTaskListKnown && !needsVideoTaskSync(nodes.value, props.serverVideoTasks))
    return
  if (!force && Date.now() - lastDiscoveryAt < 5000) return
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  discoveryBusy = true
  lastDiscoveryAt = Date.now()
  let snapshotLoaded = false
  try {
    const tasks = await scope.wait(generationApi.videoTasks(props.projectId))
    if (!scope.isActive()) return
    snapshotLoaded = true
    videoTaskListKnown = true
    emit('video-tasks-loaded', tasks || [])
    for (const task of findRecoverableVideoTasks(nodes.value, tasks || [])) {
      const nodeId = task.nodeId
      if (
        submittingTaskIds.has(nodeId) ||
        claimingTaskIds.has(nodeId) ||
        resumingTaskIds.has(nodeId)
      )
        continue
      if (!flowStore.canEditNode(nodeId)) continue
      if (!scope.isActive()) return
      // A new request may have replaced the task while the query was in flight.
      if (!findRecoverableVideoTasks(nodes.value, [task]).length) continue
      const current = nodes.value.find((node) => node.id === nodeId)
      flowStore.updateNodeResult(nodeId, videoTaskPatch(current, task), getNodes.value)
      await scope.wait(props.saveSubmittedTask?.())
    }
    for (const task of tasks || []) {
      const node = nodes.value.find((item) => String(item.id) === String(task.nodeId))
      const patch = appliedVideoWaitPatch(node, task)
      if (!patch || submittingTaskIds.has(node.id) || resumingTaskIds.has(node.id)) continue
      if (!flowStore.canEditNode(node.id)) continue
      flowStore.updateNodeResult(node.id, patch, getNodes.value)
    }
    for (const node of nodes.value) {
      if (
        submittingTaskIds.has(node.id) ||
        tasks?.some((task) => task.requestId === node.data?.genRequestId)
      )
        continue
      const patch = unconfirmedVideoRequestPatch(node.data)
      if (!patch) continue
      if (!flowStore.canEditNode(node.id)) continue
      if (!scope.isActive()) return
      const current = nodes.value.find((item) => item.id === node.id)
      if (current?.data?.genRequestId !== node.data.genRequestId) continue
      const currentPatch = unconfirmedVideoRequestPatch(current.data)
      if (currentPatch) flowStore.updateNodeResult(node.id, currentPatch, getNodes.value)
    }
  } catch {
    // Keep the last known task state and retry. A failed query must not look like no tasks.
    if (!snapshotLoaded) videoTaskListKnown = false
    if (scope.isActive() && !snapshotLoaded) emit('video-tasks-error')
  } finally {
    discoveryBusy = false
    if (urgentDiscoveryQueued && scope.isActive()) {
      urgentDiscoveryQueued = false
      void discoverSubmittedVideoTasks(true)
    }
  }
}

async function resumeGenTaskForNode(node) {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  const taskId = node.data?.genTaskId
  const kind = node.data?.genTaskKind
  if (!isPersistedVideoTaskId(taskId)) return
  const genRequestedAt = node.data?.genRequestedAt || Date.now()
  const waitState = kind === 'video' ? videoWaitState({ ...node.data, genRequestedAt }) : null
  const timedOut = !!waitState?.genWaitTimedOut
  // The 15-minute flag only stops the spinner. Still ask get-my once; a finished row clears it.
  if (!timedOut) {
    genProgressByNode[node.id] = 0
    flowStore.updateNodeData(
      node.id,
      {
        generating: true,
        genError: '',
        ...(waitState ? { genRequestedAt, ...waitState } : {}),
        ...recoveredLabelPatch(node.id, kind),
      },
      getNodes.value
    )
  }

  try {
    if (kind === 'image') {
      const result = await scope.wait(
        pollImageTask(taskId, (p) => {
          if (scope.isActive()) genProgressByNode[node.id] = p
        })
      )
      if (!scope.isActive()) return
      applyImageResult(node.id, result)
    } else if (kind === 'video') {
      const result = await scope.wait(
        pollVideoTask(
          taskId,
          (p) => {
            if (scope.isActive()) genProgressByNode[node.id] = p
          },
          { requestedAt: genRequestedAt, checkOnce: timedOut }
        )
      )
      if (!scope.isActive()) return
      applyVideoResult(node.id, result)
    }
  } catch (err) {
    if (!scope.isActive()) return
    flowStore.updateNodeResult(
      node.id,
      kind === 'video' ? videoTaskErrorPatch(node.id, err) : buildGenFailPatch('image', err),
      getNodes.value
    )
  } finally {
    if (scope.isActive()) {
      delete genProgressByNode[node.id]
    }
  }
}

/** 画布加载后恢复未完成任务轮询 */
async function resumePendingGenTasks() {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  await discoverSubmittedVideoTasks()
  if (!scope.isActive()) return
  const resumed = await recoverPendingGenerationTasks({
    nodes: nodes.value,
    getCurrentNode: (id) => nodes.value.find((node) => node.id === id),
    canEditNode: (id) => flowStore.canEditNode(id),
    resumeTask: (node) => scope.isActive() && resumeGenTaskForNode(node),
    claimingTaskIds,
    resumingTaskIds,
    retryAfterByNode,
    // A timed-out video can still finish on the server. Check get-my once per retry.
    skipTimedOutVideoTasks: false,
  })
  if (!scope.isActive()) return
  if (resumed) userPointsStore.fetchUserPoints()
}

function overlapsRect(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax < bx + bw + NODE_GAP &&
    ax + aw + NODE_GAP > bx &&
    ay < by + bh + NODE_GAP &&
    ay + ah + NODE_GAP > by
  )
}

function findFreePosition(startX, startY, newW, newH) {
  const all = getNodes.value
  let y = startY
  for (let i = 0; i < 20; i++) {
    const blocked = all.some((n) => {
      const nw = n.dimensions?.width ?? 220
      const nh = n.dimensions?.height ?? 120
      return overlapsRect(startX, y, newW, newH, n.position.x, n.position.y, nw, nh)
    })
    if (!blocked) return { x: startX, y }
    y += newH + NODE_GAP
  }
  // 超过上限仍有冲突，直接用 startY（轻微重叠优于跑到画布底部）
  return { x: startX, y: startY }
}

function getOutputBaseY(sourceId) {
  const outputNodes = edges.value
    .filter((e) => e.source === sourceId && e.data?.role === 'generation-output')
    .map((e) => getNodes.value.find((n) => n.id === e.target))
    .filter(Boolean)
  if (!outputNodes.length) return null
  return Math.max(
    ...outputNodes.map((n) => n.position.y + (n.dimensions?.height ?? 160) + NODE_GAP)
  )
}

function spawnResultNode(sourceNode, outputType, data, slotIndex = 0, baseY = null) {
  const live = findNode(sourceNode.id) ?? sourceNode
  const w = live.dimensions?.width ?? 244
  const newW = outputType.includes('video') ? 280 : 244
  const newH = 160
  const pos = findFreePosition(
    live.position.x + w + 80,
    (baseY ?? live.position.y) + slotIndex * (newH + NODE_GAP),
    newW,
    newH
  )
  const newNode = flowStore.addNodeOfType(outputType, pos, getNodes.value)
  if (!newNode) return null
  flowStore.updateNodeData(newNode.id, data, getNodes.value)
  flowStore.addEdge({
    id: `edge-${sourceNode.id}-${newNode.id}-${Date.now()}-${slotIndex}`,
    source: sourceNode.id,
    sourceHandle: 'sr',
    target: newNode.id,
    targetHandle: 'tl',
    data: { role: 'generation-output' },
  })
  return newNode
}

/** 积分校验 — 与 UserInfo 同源：userPointsStore + getUserPoint API，发送前刷新余额 */
async function ensurePointsEnough(cost) {
  if (cost <= 0) return true
  await userPointsStore.fetchUserPoints()
  return await userPointsStore.checkPoints(cost)
}

async function generate() {
  const scope = generationScopes.capture()
  if (!scope.isActive()) return
  const node = primaryNode.value
  if (!node || !flowStore.canEditNode(node.id)) return
  if (!node || isGenerationPending.value || preflightingNodes.has(node.id)) return
  const generationMode = currentMode.value

  flushPanelToNode(node)

  const refImages = collectRefImages()
  let refVideos = collectRefVideos()
  const refAudios = collectRefAudios()

  let finalPrompt = buildGenerationPrompt(promptText.value, displayAssets.value, nodes.value)
  if (!finalPrompt) {
    if (generationMode === 'image' && refImages.length) {
      finalPrompt = '根据参考图生成'
    } else if (
      generationMode === 'video' &&
      (refImages.length || refVideos.length || refAudios.length)
    ) {
      finalPrompt = '根据参考素材生成'
    } else {
      return
    }
  }

  // 首次 await 前固定完整配置，之后即使用户切换面板，请求也只属于点击时的节点。
  const settings = JSON.parse(JSON.stringify(buildSettingsSnapshot()))
  const modelList = generationMode === 'image' ? gptImageModels.value : videoModels.value
  const selected = modelList.find((m) => m.id === settings.selectedModel)
  // 前置校验失败不能进入任务失败回写，否则会清空节点已有的成片。
  if (generationMode !== 'text' && !selected) {
    message.error('所选模型不可用，请重新选择模型')
    return
  }
  const model = selected ? JSON.parse(JSON.stringify(selected)) : null
  const cost = currentEstimatedPoints()
  let assertVideoInputsCurrent = () => {}
  let stopVideoInputWatch = () => {}
  if (generationMode === 'video') {
    refVideos = submittedVideoReferences(refVideos, resolveMediaLimits(model.mediaLimits).videos)
  }
  if (generationMode === 'video' && refVideos.length) {
    // Normalize a historical result's draft before observing subsequent input changes.
    flowStore.updateNodeData(node.id, { settings }, getNodes.value)
    const revision = referenceRevision
    const snapshot = referenceInputSnapshot(node.id)
    const controller = new AbortController()
    let inputsChanged = false
    stopVideoInputWatch = watch(
      () => referenceInputSnapshot(node.id),
      () => {
        inputsChanged = true
        controller.abort()
      },
      { flush: 'sync' }
    )
    assertVideoInputsCurrent = () => {
      if (primaryNode.value?.id === node.id) flushPanelToNode(node)
      if (
        !scope.isActive() ||
        !flowStore.canEditNode(node.id) ||
        !nodes.value.some((item) => item.id === node.id) ||
        referenceRevision !== revision ||
        inputsChanged ||
        referenceInputSnapshot(node.id) !== snapshot
      ) {
        const error = new Error('素材或模型已改变，请重新生成')
        error.preSubmissionCancelled = true
        throw error
      }
    }
    preflightingNodes.add(node.id)
    preflightControllers.set(node.id, controller)
    try {
      const names = refVideos.map((url) => {
        const asset = displayAssets.value.find((item) => assetMediaUrl(item) === url)
        return asset?.label || asset?.name || ''
      })
      await referencePreflight.validate(refVideos, model, { signal: controller.signal, names })
      assertVideoInputsCurrent()
    } catch (error) {
      stopVideoInputWatch()
      if (scope.isActive())
        message.error(controller.signal.aborted ? '素材或模型已改变，请重新生成' : error.message)
      return
    } finally {
      if (preflightControllers.get(node.id) === controller) preflightControllers.delete(node.id)
      preflightingNodes.delete(node.id)
    }
  }

  const nodeId = node.id
  genProgressByNode[nodeId] = 0
  flowStore.updateNodeData(
    nodeId,
    { generating: true, genError: '', ...recoveredLabelPatch(nodeId, generationMode) },
    getNodes.value
  )

  try {
    // 点击生成也是明确的用户操作，历史成片此时可以拥有新的生成草稿。
    if (generationMode !== 'text') {
      flowStore.updateNodeData(node.id, { settings }, getNodes.value)
    }

    if (generationMode === 'image') {
      if (imageCostPoint.value < 0) {
        message.error('当前会员等级无法使用该模型')
        flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)
        return
      }
      if (!(await scope.wait(ensurePointsEnough(cost)))) {
        if (!scope.isActive()) return
        flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)
        return
      }
      if (!scope.isActive()) return

      const count = settings.imageCount
      const childImageSettings = {
        ...settings,
        imageCount: 1,
      }
      const childImageDimensions = resolveImageDimensionsFromSettings(childImageSettings)
      if (count > 1) {
        // 先铺全部生成中占位节点，再并行请求
        const placeholders = []
        const batchBaseY = getOutputBaseY(nodeId)
        for (let i = 0; i < count; i++) {
          placeholders.push(
            spawnResultNode(
              node,
              'imageGenNode',
              {
                src: '',
                outputValue: '',
                prompt: finalPrompt,
                label: '图片节点',
                generating: true,
                assetWall: [],
                settings: childImageSettings,
                dimensions: childImageDimensions,
              },
              i,
              batchBaseY
            )
          )
        }
        // 用户可能已经转去编辑其他节点，不重选源节点，也不覆盖其新草稿。
        flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)

        const done = { n: 0 }
        await scope.wait(
          Promise.all(
            placeholders.map(async (target) => {
              try {
                await scope.wait(
                  runImageGenForNode(
                    target.id,
                    {
                      prompt: finalPrompt,
                      modelId: model.modelId,
                      model: model.model,
                      aspect: settings.imageRatio,
                      resolution: settings.imageRes,
                      refImages,
                    },
                    () => {
                      if (target) genProgressByNode[target.id] = Math.round((done.n / count) * 100)
                    }
                  )
                )
                if (!scope.isActive()) return
              } catch (err) {
                if (!scope.isActive()) return
                if (target) {
                  flowStore.updateNodeResult(
                    target.id,
                    buildGenFailPatch('image', err),
                    getNodes.value
                  )
                }
              } finally {
                if (scope.isActive()) {
                  done.n += 1
                  if (target) {
                    genProgressByNode[target.id] = 100
                    delete genProgressByNode[target.id]
                  }
                }
              }
            })
          )
        )
        if (!scope.isActive()) return
        userPointsStore.fetchUserPoints()
      } else {
        await scope.wait(
          runImageGenForNode(
            node.id,
            {
              prompt: finalPrompt,
              modelId: model.modelId,
              model: model.model,
              aspect: settings.imageRatio,
              resolution: settings.imageRes,
              refImages,
            },
            (p) => {
              genProgressByNode[nodeId] = p
            }
          )
        )
        if (!scope.isActive()) return
        userPointsStore.fetchUserPoints()
      }
    } else if (generationMode === 'video') {
      // if (!refImages.length && !refVideos.length && !refAudios.length) {
      //   message.warning('请至少添加一张参考图、一个参考视频或一个参考音频')
      //   flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)
      //   return
      // }
      if (!(await scope.wait(validateVideoRefImages(refImages)))) {
        if (!scope.isActive()) return
        flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)
        return
      }
      if (!scope.isActive()) return
      if (!(await scope.wait(ensurePointsEnough(cost)))) {
        if (!scope.isActive()) return
        flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)
        return
      }
      if (!scope.isActive()) return

      assertVideoInputsCurrent()
      const count = settings.videoCount
      const childVideoSettings = { ...settings, videoCount: 1 }
      const childVideoDimensions = resolveVideoDimensionsFromSettings(childVideoSettings)
      const singleVideoResultExtra = {
        dimensions: resolveVideoDimensionsFromSettings(settings),
      }
      if (count > 1) {
        const placeholders = []
        const batchBaseY = getOutputBaseY(nodeId)
        for (let i = 0; i < count; i++) {
          placeholders.push(
            spawnResultNode(
              node,
              'videoGenNode',
              {
                src: '',
                outputValue: '',
                poster: '',
                prompt: finalPrompt,
                label: '视频节点',
                generating: true,
                assetWall: [],
                settings: childVideoSettings,
                dimensions: childVideoDimensions,
              },
              i,
              batchBaseY
            )
          )
        }
        flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)

        const done = { n: 0 }
        await scope.wait(
          Promise.all(
            placeholders.map(async (target) => {
              try {
                await scope.wait(
                  runVideoGenForNode(
                    target.id,
                    {
                      prompt: finalPrompt,
                      aspect: settings.videoRatio,
                      duration: settings.videoDuration,
                      resolution: settings.videoRes,
                      refImages,
                      refVideos,
                      refAudios,
                      modelId: model.modelId,
                      model: model.model,
                      mediaLimits: model.mediaLimits,
                    },
                    () => {
                      if (target) genProgressByNode[target.id] = Math.round((done.n / count) * 100)
                    },
                    { dimensions: childVideoDimensions },
                    assertVideoInputsCurrent
                  )
                )
                if (!scope.isActive()) return
              } catch (err) {
                if (!scope.isActive()) return
                if (target) {
                  if (err?.preSubmissionCancelled) {
                    flowStore.removeNodeById(target.id)
                    try {
                      await scope.wait(props.saveSubmittedTask?.())
                    } catch {
                      /* Preserve cancellation if saving fails. */
                    }
                    message.error(err.message)
                    return
                  }
                  flowStore.updateNodeResult(
                    target.id,
                    videoTaskErrorPatch(target.id, err),
                    getNodes.value
                  )
                  await discoverSubmittedVideoTasks(true)
                }
              } finally {
                if (scope.isActive()) {
                  done.n += 1
                  if (target) {
                    genProgressByNode[target.id] = 100
                    delete genProgressByNode[target.id]
                  }
                }
              }
            })
          )
        )
        if (!scope.isActive()) return
        userPointsStore.fetchUserPoints()
      } else {
        await scope.wait(
          runVideoGenForNode(
            node.id,
            {
              prompt: finalPrompt,
              aspect: settings.videoRatio,
              duration: settings.videoDuration,
              resolution: settings.videoRes,
              refImages,
              refVideos,
              refAudios,
              modelId: model.modelId,
              model: model.model,
              mediaLimits: model.mediaLimits,
            },
            (p) => {
              genProgressByNode[nodeId] = p
            },
            singleVideoResultExtra,
            assertVideoInputsCurrent
          )
        )
        if (!scope.isActive()) return
        userPointsStore.fetchUserPoints()
      }
    } else {
      const result = await scope.wait(
        multiModalSend({
          content: finalPrompt,
          imageUrls: refImages,
          videoUrls: refVideos,
        })
      )
      if (!scope.isActive()) return
      flowStore.updateNodeResult(
        node.id,
        {
          content: result,
          outputValue: result,
          generating: false,
          genError: '',
          ...recoveredLabelPatch(node.id, 'text'),
        },
        getNodes.value
      )
    }
  } catch (e) {
    if (!scope.isActive()) return
    if (e?.preSubmissionCancelled) {
      flowStore.updateNodeData(node.id, { generating: false }, getNodes.value)
      message.error(e.message)
      return
    }
    flowStore.updateNodeResult(
      node.id,
      generationMode === 'video'
        ? videoTaskErrorPatch(node.id, e)
        : buildGenFailPatch(generationMode, e),
      getNodes.value
    )
    if (generationMode === 'video') await discoverSubmittedVideoTasks(true)
  } finally {
    stopVideoInputWatch()
    if (scope.isActive()) {
      delete genProgressByNode[nodeId]
    }
  }
}

// ── Panel position: below selected node ──────────────────────────────────────

const DRAWER_GAP = 14
const panelRef = ref(null)
const panelHeight = ref(0)
useResizeObserver(panelRef, ([entry]) => {
  panelHeight.value = entry.target.getBoundingClientRect().height
})

function getNodeRectInWrap(nodeId) {
  const wrap = document.querySelector('.canvas-wrap')
  const el =
    wrap?.querySelector(`.vue-flow__node[data-id="${nodeId}"] .canvas-node`) ??
    wrap?.querySelector(`.vue-flow__node[data-id="${nodeId}"]`)
  if (!wrap || !el) return null
  const wrapRect = wrap.getBoundingClientRect()
  const nodeRect = el.getBoundingClientRect()
  return {
    centerX: nodeRect.left - wrapRect.left + nodeRect.width / 2,
    bottom: nodeRect.bottom - wrapRect.top,
  }
}

const panelStyle = computed(() => {
  void viewportTick.value
  const node = primaryNode.value
  if (!node) return { display: 'none' }

  const rect = getNodeRectInWrap(node.id)
  if (rect) {
    return {
      '--panel-anchor-y': `${rect.bottom + DRAWER_GAP}px`,
      '--panel-height': `${panelHeight.value}px`,
      '--panel-anchor-x': `${rect.centerX}px`,
      transform: 'translateX(-50%)',
      bottom: 'auto',
    }
  }

  const live = findNode(node.id) ?? node
  const { x: vpX, y: vpY, zoom } = getViewport()
  const nw = live.dimensions?.width ?? node.dimensions?.width ?? 244
  const nh = live.dimensions?.height ?? node.dimensions?.height ?? 120
  return {
    '--panel-anchor-y': `${(live.position.y + nh) * zoom + vpY + DRAWER_GAP}px`,
    '--panel-height': `${panelHeight.value}px`,
    '--panel-anchor-x': `${(live.position.x + nw / 2) * zoom + vpX}px`,
    transform: 'translateX(-50%)',
    bottom: 'auto',
  }
})
</script>

<style lang="scss" scoped>
.ai-panel {
  --drawer-gap: 14px;
  --panel-width: min(54rem, calc(100% - 32px));
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: var(--panel-width);
  // 跟随节点居中；靠近画布边缘时内移，并随容器宽度自动收缩。
  left: clamp(
    calc(16px + var(--panel-width) / 2),
    var(--panel-anchor-x),
    calc(100% - 16px - var(--panel-width) / 2)
  );
  // 靠近底边时整体上移，避免提交按钮落在视口外。
  top: clamp(16px, var(--panel-anchor-y), calc(100% - var(--panel-height) - 16px));
  min-height: 13rem;
  height: auto;
  overflow: visible;
  background: #292927;
  border: 1px solid $border-default;
  border-radius: 10px;
  box-shadow: 0 0 0 0.0625rem rgba(0, 0, 0, 0.016),
    0 0.125rem 1.25rem -0.25rem rgba(15, 23, 42, 0.06),
    0 0.875rem 2.375rem -1rem rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(16px);
  z-index: 100;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 0 0 0.0625rem rgba(0, 0, 0, 0.024),
      0 0.125rem 1.25rem -0.25rem rgba(15, 23, 42, 0.1),
      0 0.875rem 2.375rem -1rem rgba(15, 23, 42, 0.22);
  }
}

// ── Asset wall ───────────────────────────────────────────────────────────────
.asset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 10px 14px 10px;
  // 一行放不下换行展示第二行；超两行内部滚动（卡片高约64px）
  max-height: 160px;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.asset-card {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 52px;
  cursor: pointer;
  border-radius: $radius-md;
  padding: 3px;
  transition: background 0.12s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    .asset-remove {
      opacity: 1;
    }
  }
}

.asset-thumb {
  width: 44px;
  height: 44px;
  border-radius: $radius-sm;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid $border-default;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.asset-card.uploading {
  cursor: default;
  opacity: 0.7;
}

.asset-loading {
  font-size: 14px;
}

.asset-play {
  position: absolute;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.asset-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-placeholder {
  font-size: 18px;
  opacity: 0.4;
}

.asset-name {
  font-size: 12px;
  color: $text-dim;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50px;
  text-align: center;
}

.asset-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: rgba(#ff4d4d, 0.85);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 8px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ── Prompt ────────────────────────────────────────────────────────────────────
.prompt-wrap {
  position: relative;
  margin: 0 14px 8px;
  min-width: 0;
  background: #20201f;
  border: 1px solid #45453f;
  border-radius: $radius-md;

  &:focus-within {
    border-color: #9aaeff;
    box-shadow: 0 0 0 2px rgba(147, 151, 165, 0.16);
  }
}

.prompt-highlight,
.prompt-input {
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.6;
  font-family: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  box-sizing: border-box;
}

.prompt-highlight {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  color: #f1f0ed;

  :deep(.mention-chip) {
    border-radius: 4px;
    padding: 0 3px;
    margin: 0 -3px;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }

  :deep(.mention-chip--image) {
    color: #8fd0b0;
    background: rgba(66, 184, 131, 0.22);
  }

  :deep(.mention-chip--video) {
    color: #e2c98a;
    background: rgba(181, 143, 63, 0.28);
  }

  :deep(.mention-chip--audio) {
    color: #f0b48a;
    background: rgba(255, 140, 75, 0.2);
  }

  :deep(.mention-chip--text) {
    color: #b7c4ff;
    background: rgba($accent-primary, 0.28);
  }

  :deep(.mention-chip--document) {
    color: #d2cdc4;
    background: rgba(184, 178, 169, 0.2);
  }
}

.prompt-input {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  resize: none;
  min-height: 56px;
  max-height: 280px;
  color: transparent;
  -webkit-text-fill-color: transparent;
  background: transparent;
  border: none;
  border-radius: $radius-md;
  box-shadow: none;
  caret-color: $accent-primary;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &::placeholder {
    color: #9aaeff;
    -webkit-text-fill-color: #9aaeff;
    opacity: 1;
  }

  &:focus {
    outline: none;
  }
}

.mention-drop {
  position: absolute;
  z-index: 20;
  min-width: 180px;
  max-width: 280px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
  background: #292927;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.mention-drop-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover,
  &.active {
    background: rgba(255, 255, 255, 0.06);
  }
}

.mention-drop-thumb {
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  object-fit: cover;
  flex-shrink: 0;
}

.mention-drop-icon {
  font-size: 18px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.mention-drop-label {
  font-size: 12px;
  color: $text-secondary;
}

.duration-slider-wrap {
  position: relative;
  padding-top: 30px;
}

.duration-tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(35, 38, 48, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: $text-secondary;
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
}

.duration-slider {
  :deep(.el-slider__runway) {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  :deep(.el-slider__bar) {
    background: $accent-primary;
  }

  :deep(.el-slider__button) {
    width: 14px;
    height: 14px;
    border: none;
    background: $accent-primary;
  }
}

.duration-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: $text-dim;
}

.video-settings-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 140px;
}

.video-settings-icon {
  font-size: 12px;
  color: $text-dim;
  flex-shrink: 0;
}

.video-settings-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-settings-chevron {
  font-size: 12px;
  color: $text-dim;
  flex-shrink: 0;
}

// ── Progress ──────────────────────────────────────────────────────────────────
.gen-progress {
  height: 2px;
  background: rgba($accent-primary, 0.15);
  margin: 0 14px;
  border-radius: 1px;
  overflow: hidden;
}

.gen-progress-fill {
  height: 100%;
  background: $accent-primary;
  transition: width 0.4s ease;
}

// ── Bottom toolbar ─────────────────────────────────────────────────────────────
.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid $border-default;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.model-select {
  background: #33332f;
  border: 1px solid #565650;
  border-radius: $radius-sm;
  color: #f1f0ed;
  font-size: 12px;
  padding: 0 32px 0 12px;
  height: 34px;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  font-family: inherit;
  max-width: 160px;

  &:focus {
    border-color: #9aaeff;
  }
}

select.model-select,
select.param-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='m3 4.5 3 3 3-3' fill='none' stroke='%23c9cdd8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.model-icon {
  width: 18px;
  height: 18px;
  color: #deddd7;
  flex-shrink: 0;
}
.model-select option,
.param-select option {
  background: #33332f;
  color: #f1f0ed;
}
.model-select option:disabled,
.param-select option:disabled {
  color: #aaa9a4;
}
.submit-btn:focus-visible {
  outline: 2px solid #9aaeff;
  outline-offset: 3px;
}

.mode-hint {
  font-size: 12px;
  color: $text-dim;
}

.reference-duration-hint {
  padding: 0 14px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: $text-dim;
  overflow-wrap: anywhere;
}

.toolbar-mid {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}

.param-select {
  background: #33332f;
  border: 1px solid #565650;
  border-radius: $radius-sm;
  color: #f1f0ed;
  font-size: 12px;
  padding: 0 32px 0 12px;
  height: 34px;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  font-family: inherit;

  &:focus {
    border-color: #9aaeff;
  }
}

.count-select {
  min-width: 64px;
}

.param-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-default;
  border-radius: $radius-sm;
  color: $text-dim;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-secondary;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.points-estimate {
  font-size: 12px;
  color: $accent-text;
  white-space: nowrap;
}

.points-prefix {
  color: $text-dim;
  margin-right: 2px;
}

.submit-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: $accent-primary;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: $accent-hover;
    transform: scale(1.05);
  }

  &:disabled {
    background: #41444e;
    color: #bcc0cb;
    cursor: not-allowed;
  }

  &.generating {
    background: rgba($accent-primary, 0.3);
    cursor: wait;
  }
}

.submit-icon {
  width: 20px;
  height: 20px;
}

.submit-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style lang="scss">
.canvas-video-settings-popover.ant-popover {
  .ant-popover-inner {
    background: #000;
    border: 1px solid $border-default;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  }

  .ant-popover-arrow::before {
    background: #000;
  }
}

.video-settings-pop {
  padding: 14px;
  background: #000;
}

.video-settings-section + .video-settings-section {
  margin-top: 16px;
}

.video-settings-title {
  font-size: 12px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 10px;
}

.ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ratio-option,
.res-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 52px;
  padding: 8px 6px;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  background: rgba(255, 255, 255, 0.03);
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s, background 0.12s;

  &:hover {
    border-color: rgba($accent-primary, 0.35);
  }

  &.active {
    border-color: $accent-primary;
    background: rgba($accent-primary, 0.08);
    color: $text-primary;
  }
}

.ratio-preview {
  display: block;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
}

.ratio-label {
  line-height: 1;
}

.ratio-check {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 12px;
  color: $accent-text;
  line-height: 1;
}

.res-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.res-option {
  min-height: 36px;
}
</style>
