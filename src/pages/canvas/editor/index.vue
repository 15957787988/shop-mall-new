<template>
  <div class="app-shell" @keydown="onKeydown" tabindex="0">
    <!-- ─── Top bar ─────────────────────────────────────────────────── -->
    <div class="canvas-topbar">
      <div class="topbar-left">
        <button class="topbar-icon-btn" @click="exitCanvas" title="返回">←</button>
        <div class="topbar-name-pill">
          <input
            v-if="editingName"
            ref="nameInputRef"
            v-model="projectName"
            class="topbar-name-input"
            @blur="commitName"
            @keydown.enter="commitName"
            @keydown.escape="editingName = false"
          />
          <span v-else class="topbar-name" @click="startEditName" title="点击重命名">{{
            projectName
          }}</span>
        </div>
        <div
          v-if="canEdit"
          class="canvas-save-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{{
            saveStatus === 'saving'
              ? '正在保存…'
              : saveError && isDirty
                ? '未保存'
                : isDirty
                  ? '等待保存…'
                  : '已保存'
          }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn" @click="doFitView" title="适应视图">⊙</button>
        <!-- <button class="topbar-icon-btn" @click="toggleTheme" title="切换主题">☀</button> -->
        <div class="topbar-points-pill" title="算力余额">
          <span>✦</span>
          <span>{{ displayPoints }}</span>
        </div>
      </div>
    </div>

    <div v-if="saveError" class="canvas-error" role="alert">
      {{ saveError }}
      <button v-if="isDirty && !saveConflict" @click="saveProject">重试保存</button>
      <button v-if="isDirty" @click="downloadDraft">下载草稿</button>
      <button @click="reloadCanvas">重新加载</button>
    </div>
    <div
      v-if="taskSyncError || taskSyncLoading"
      class="video-sync-notice"
      role="status"
      aria-live="polite"
      :aria-busy="taskSyncLoading"
    >
      <div class="video-sync-copy">
        <strong>{{ taskSyncLoading ? '正在同步视频生成进度…' : taskSyncError }}</strong>
        <span
          >这里同步当前画布的视频生成进度和结果。查询失败不代表生成失败；系统会继续尝试同步。</span
        >
      </div>
      <button type="button" :disabled="taskSyncLoading" @click="retryVideoTasks">
        {{ taskSyncLoading ? '正在同步…' : '重试同步' }}
      </button>
    </div>
    <div v-if="videoRecoveryChoices.length" class="video-recovery-notice" role="status">
      发现 {{ videoRecoveryChoices.length }} 个已完成的视频，已保留画布当前内容。
      <button type="button" @click="mediaPanel = 'history'">查看</button>
    </div>
    <!-- ─── Canvas body ─────────────────────────────────────────────── -->
    <div class="canvas-body">
      <div
        ref="canvasRef"
        class="canvas-wrap"
        :class="{ 'is-viewport-pending': !viewportReady, 'is-video-playing': videoPlaying }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div v-if="!viewportReady" class="canvas-loading" role="status"
          >正在加载画布与生成任务…</div
        >
        <AssetLibraryPanel
          v-if="canEdit && showAssetLibrary"
          ref="assetLibraryRef"
          :can-edit="canEdit"
          :visible="showAssetLibrary"
          @insert-asset="usePersonalAsset"
          @asset-dragging="onAssetDragging"
          @close="showAssetLibrary = false"
        />
        <Toolbar
          v-if="canEdit"
          v-model:active-tool="canvasTool"
          v-model:show-minimap="showMinimap"
          v-model:show-asset-library="showAssetLibrary"
          v-model:media-panel="mediaPanel"
          :history-enabled="canEdit"
          @add-node="addNodeAtCenter"
        />
        <VueFlow
          :nodes="visibleNodes"
          :edges="edges"
          :node-types="nodeTypes"
          :snap-to-grid="snapEnabled"
          :snap-grid="[gridSize, gridSize]"
          :min-zoom="0.08"
          :max-zoom="4"
          :delete-key-code="null"
          :selection-mode="SelectionMode.Partial"
          :multi-selection-key-code="'Meta'"
          :pan-on-drag="!canEdit || canvasTool === 'move'"
          :selection-on-drag="canEdit && canvasTool === 'select'"
          :pan-on-scroll="true"
          pan-on-scroll-mode="free"
          :zoom-on-scroll="false"
          :zoom-on-pinch="true"
          :zoom-on-double-click="false"
          :prevent-scrolling="true"
          elevate-edges-on-select
          @pane-ready="onPaneReady"
          @node-drag-start="store.isDragging = true"
          @node-drag="onNodeDrag"
          @node-drag-stop="onNodeDragStop"
          @nodes-change="store.handleNodesChange"
          @edges-change="store.handleEdgesChange"
          @pane-context-menu="(e) => openCtxMenu(e, null, 'pane')"
          @node-context-menu="({ event, node }) => openCtxMenu(event, node, 'node')"
          @edge-context-menu="({ event, edge }) => openCtxMenu(event, edge, 'edge')"
          @pane-click="onPaneClick"
          @node-click="onNodeClick"
          @move-end="onViewportMoveEnd"
        >
          <!-- Dot-only background (science/tech feel) -->
          <Background
            v-if="showGrid"
            :variant="BackgroundVariant.Dots"
            :gap="24"
            :size="1.2"
            color="#2e2e2b"
          />

          <Controls
            :show-interactive="false"
            @zoom-in="onControlsViewportChange"
            @zoom-out="onControlsViewportChange"
            @fit-view="onControlsFitView"
          />
          <MiniMap
            v-if="showMinimap"
            :node-color="() => '#8e8a82'"
            :node-stroke-color="() => '#000'"
            :node-border-radius="4"
            mask-color="rgba(0,0,0,0.75)"
          />
        </VueFlow>

        <!-- AI Panel floats inside canvas-wrap so it doesn't overlay topbar -->
        <AIPanel
          v-if="canEdit"
          v-show="!mediaPanel"
          ref="aiPanelRef"
          :project-id="currentProjectId"
          :record-history="canEdit"
          :server-video-tasks="serverVideoTasks"
          @video-tasks-loaded="onVideoTasksLoaded"
          @video-tasks-error="taskSyncError = videoTaskSyncErrorMessage"
          :save-submitted-task="flushAndSave"
          @generation-complete="historyRefreshKey++"
        />
        <GenerationHistoryPanel
          v-if="canEdit && mediaPanel && currentProjectId"
          :key="`${currentProjectId}:${mediaPanel}`"
          :project-id="currentProjectId"
          :refresh-key="historyRefreshKey"
          :node-ids="nodes.map((node) => node.id)"
          :recoverable-video-task-ids="videoRecoveryChoices.map((task) => String(task.taskId))"
          :use-video="useRecoveredVideo"
          @close="mediaPanel = ''"
          @locate="locateHistoryNode"
        />
        <NodeActionBar v-if="!mediaPanel" :readonly="!canEdit" />
      </div> </div
    ><!-- /canvas-body -->

    <ContextMenu v-bind="ctxMenu" @close="closeCtxMenu" @action="onCtxAction" />

    <!-- Ghost line -->
    <Teleport to="body">
      <svg v-if="ghostLine.visible" class="ghost-line-svg" style="pointer-events: none">
        <defs>
          <marker id="ghost-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8e8a8288" />
          </marker>
        </defs>
        <path
          :d="ghostLinePath(ghostLine.x1, ghostLine.y1, ghostLine.x2, ghostLine.y2)"
          stroke="#8e8a8288"
          stroke-width="2"
          stroke-dasharray="6 4"
          fill="none"
          marker-end="url(#ghost-arrow)"
        />
      </svg>
    </Teleport>

    <!-- Edge-drop picker -->
    <Teleport to="body">
      <template v-if="edgeDrop.visible">
        <div class="edrop-backdrop" @click.stop="closeEdgeDrop" @mousedown.stop @pointerdown.stop />
        <div
          class="edrop-picker"
          :style="{ top: edgeDrop.y + 'px', left: edgeDrop.x + 'px' }"
          @click.stop
          @mousedown.stop
        >
          <div class="edrop-title">创建节点并连接</div>
          <button
            v-for="opt in edgeDropOptions"
            :key="opt.type"
            class="edrop-item"
            :class="{ disabled: opt.disabled }"
            :disabled="opt.disabled"
            @click="createFromEdgeDrop($event, opt.type, opt.disabled)"
            @mousedown.stop
          >
            <span class="edrop-icon" :style="{ color: opt.disabled ? undefined : opt.color }">{{
              opt.icon
            }}</span>
            <span class="edrop-label">{{ opt.label }}</span>
          </button>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<script setup>
import {
  ref,
  markRaw,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  h,
  provide
} from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { VueFlow, useVueFlow, SelectionMode } from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { storeToRefs } from 'pinia'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

import { ElMessage, ElMessageBox } from '../shims/feedback'
import { useUserPointsStoreWithOut } from '../shims/points'
import { useFlowStore } from '../stores/flowStore'
import { useProjectStore } from '../stores/projectStore'
import { buildGraphDocument, parseGraphDocument } from '../utils/graphAdapter'
import { nextActivePanelId } from '../utils/panelActiveSwitch'
import { isCreateOptionDisabled, validateRefEdge } from '../utils/refInputConstraints'
import { shouldPersistCanvas } from '../utils/canvasSync'
import { uploadCanvasFile } from '../utils/uploadFile'
import { readVideoDuration, validateVideoUpload } from '../utils/videoConstraints'
import { detectFileKind } from '../composables/useMediaAssetUpload'
import { CANVAS_PLAYBACK, createCanvasPlayback } from '../utils/canvasPlayback'
import { projectApi } from '../api/projectApi'
import { readGraph, hasGraphChanges, applyGraphDelta } from '../utils/graphChanges'
import { getAccessToken } from '@/lib/auth/storage'
import { useAuth } from '@/composables/useAuth'
import Toolbar from './Toolbar.vue'
import ContextMenu from './ContextMenu.vue'
import AIPanel from './components/AIPanel.vue'
import { generationApi } from '../api/generationApi'
import {
  needsVideoRecoveryChoice,
  videoTaskPatch,
  videoTaskDisplayData,
  markRestoredVideoTask
} from '../utils/discoverVideoTasks'
import NodeActionBar from './components/NodeActionBar.vue'
import AssetLibraryPanel from './components/AssetLibraryPanel.vue'
import GenerationHistoryPanel from './components/GenerationHistoryPanel.vue'
import { useGenerationHistory, GENERATION_HISTORY } from '../composables/useGenerationHistory'

import TextNode from './components/TextNode.vue'
import ImageNode from './components/ImageNode.vue'
import VideoNode from './components/VideoNode.vue'
import AudioNode from './components/AudioNode.vue'
import NoteNode from './components/NoteNode.vue'
import GroupNode from './components/GroupNode.vue'

const rawNodeTypes = {
  textNode: markRaw(TextNode),
  imageNode: markRaw(ImageNode),
  imageUploadNode: markRaw(ImageNode),
  imageGenNode: markRaw(ImageNode),
  videoNode: markRaw(VideoNode),
  videoUploadNode: markRaw(VideoNode),
  videoGenNode: markRaw(VideoNode),
  audioUploadNode: markRaw(AudioNode),
  noteNode: markRaw(NoteNode),
  groupNode: markRaw(GroupNode)
}

const route = useRoute()
const router = useRouter()
const store = useFlowStore()
const projectStore = useProjectStore()
const { nodes, edges, snapEnabled, gridSize, showGrid } = storeToRefs(store)
const videoPlaying = ref(false)
const playback = createCanvasPlayback((playing) => {
  videoPlaying.value = playing
})
provide(CANVAS_PLAYBACK, playback)

// The project endpoint authorizes the owner before any mutation is enabled.
const pageLoaded = ref(false)
const canEdit = computed(() => pageLoaded.value)
const nodeTypes = Object.fromEntries(
  Object.entries(rawNodeTypes).map(([type, component]) => [
    type,
    markRaw({
      inheritAttrs: false,
      props: ['id', 'data', 'selected'],
      setup: (props) => () => h(component, { ...props, type })
    })
  ])
)
const serverVideoTasks = ref([])
const taskWaitNow = ref(Date.now())
const taskWaitTimer = setInterval(() => {
  taskWaitNow.value = Date.now()
}, 5000)
onBeforeUnmount(() => clearInterval(taskWaitTimer))
const videoTaskSyncErrorMessage = '视频生成进度暂时无法同步'
const taskSyncError = ref('')
const taskSyncLoading = ref(false)
const videoTasksByNode = computed(
  () => new Map(serverVideoTasks.value.map((task) => [String(task.nodeId), task]))
)
const videoRecoveryChoices = computed(() => {
  const byId = new Map(nodes.value.map((node) => [String(node.id), node]))
  return serverVideoTasks.value.filter((task) =>
    needsVideoRecoveryChoice(byId.get(String(task.nodeId)), task)
  )
})
function onVideoTasksLoaded(tasks) {
  if (!Array.isArray(tasks)) {
    taskSyncError.value = videoTaskSyncErrorMessage
    return
  }
  serverVideoTasks.value = tasks
  taskSyncError.value = ''
}
async function retryVideoTasks() {
  const projectId = currentProjectId.value
  if (taskSyncLoading.value || !projectId || editorDisposed) return
  taskSyncLoading.value = true
  try {
    const tasks = await generationApi.videoTasks(projectId)
    if (editorDisposed || currentProjectId.value !== projectId) return
    if (!Array.isArray(tasks)) throw new Error('Invalid video task response')
    onVideoTasksLoaded(tasks)
    ElMessage.success(tasks.length ? '视频生成进度已同步' : '已同步，当前画布暂无视频生成任务')
  } catch {
    if (!editorDisposed && currentProjectId.value === projectId) {
      taskSyncError.value = '本次同步未成功，可稍后重试'
    }
  } finally {
    taskSyncLoading.value = false
  }
}
const visibleNodes = computed((previous = []) => {
  const byId = new Map(previous.map((node) => [node.id, node]))
  const nextNodes = nodes.value.map((n) => {
    const next = {
      ...n,
      data: videoTaskDisplayData(n, videoTasksByNode.value.get(String(n.id)), {
        // Non-video nodes do not use time; avoid subscribing image-only canvases to the clock.
        now:
          n.type?.toLowerCase().includes('video') || n.data?.genTaskKind === 'video'
            ? taskWaitNow.value
            : undefined
      }),
      class: mergeNodeClass(
        n.class,
        replacementTargetNodeId.value === n.id ? 'asset-drop-target' : ''
      ),
      draggable: canEdit.value,
      connectable: canEdit.value,
      selectable: true
    }
    const old = byId.get(n.id)
    const sameData =
      old &&
      Object.keys(next.data).length === Object.keys(old.data).length &&
      Object.keys(next.data).every((key) => next.data[key] === old.data[key])
    if (
      sameData &&
      Object.keys(next).length === Object.keys(old).length &&
      Object.keys(next).every((key) => key === 'data' || next[key] === old[key])
    )
      return old
    return next
  })
  return nextNodes.length === previous.length &&
    nextNodes.every((node, index) => node === previous[index])
    ? previous
    : nextNodes
})

function mergeNodeClass(origin, extra) {
  if (!extra) return origin
  if (!origin) return extra
  if (Array.isArray(origin)) return [...origin, extra]
  return `${origin} ${extra}`
}
store.configureEditPolicy({
  create: () => canEdit.value,
  node: () => canEdit.value
})
let serverGraph = { nodes: [], edges: [] },
  displayBase = { nodes: [], edges: [] }
let deferredSavedGraph = null
let saveFlight = null,
  editorDisposed = false,
  remoteApplying = false
const saveError = ref('')
const saveConflict = ref(false)
function captureGraph() {
  return buildGraphDocument({
    title: projectName.value,
    ...store.getCanvasSnapshot(),
    viewport: getViewport()
  })
}
function normalizedGraph(raw) {
  const graph = readGraph(raw)
  return buildGraphDocument({
    title: graph.title || projectName.value,
    ...parseGraphDocument(graph)
  })
}
function installGraph(raw) {
  const selected = new Set(store.nodes.filter((n) => n.selected).map((n) => n.id))
  const transient = new Map(store.nodes.map((n) => [n.id, n.data]))
  remoteApplying = true
  store.loadCanvas(raw)
  store.nodes = store.nodes.map((n) => ({
    ...n,
    selected: selected.has(n.id),
    data: {
      ...n.data,
      ...(transient.get(n.id)?.generating ? { generating: true } : {}),
      ...(transient.get(n.id)?.uploading ? { uploading: true } : {}),
      ...(transient.get(n.id)?.genRestoredTaskMarker
        ? { genRestoredTaskMarker: transient.get(n.id).genRestoredTaskMarker }
        : {})
    }
  }))
  aiPanelRef.value?.reloadPanel?.()
  remoteApplying = false
  refreshAllNodeInternals()
}
function receiveRemote(project) {
  if (!project || (Number(project.revision) || 0) < baseRevision) return
  if (
    !watchReady ||
    editorDisposed ||
    saveFlight ||
    isDirty.value ||
    editingName.value ||
    store.isDragging
  )
    return
  if (hasGraphChanges(serverGraph, readGraph(project.graph))) {
    serverGraph = readGraph(project.graph)
    displayBase = normalizedGraph(serverGraph)
    projectName.value = project.title
    installGraph(serverGraph)
  }
  rememberRemoteVersion(project)
}
async function reloadCanvas() {
  if (saveFlight) await saveFlight
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm('重新加载会放弃当前尚未保存的修改。确定继续？', '重新加载', {
        type: 'warning'
      })
    } catch {
      return
    }
  }
  const id = currentProjectId.value || route.query.projectId
  loadedViewport = await loadProject(id)
  if (editorDisposed) return
  viewportRestoreStarted = false
  await tryRestoreViewport()
}

// ─── Project state ─────────────────────────────────────────────────────────────
const currentProjectId = ref(null)
const projectName = ref('未命名项目')
const editingName = ref(false)
const nameInputRef = ref(null)
const saveStatus = ref('saved')
/** 本会话是否有未落库的本地编辑；干净离开禁止写回，避免覆盖其他窗口更新 */
const isDirty = ref(false)
/** 上次确认的保存版本，防止旧窗口覆盖已保存内容 */
let baseRevision = 0

const userPointsStore = useUserPointsStoreWithOut()
const displayPoints = computed(() => {
  const p = userPointsStore.points
  return typeof p === 'number' ? Math.round(p * 100) / 100 : p
})

const isLight = ref(false)
function toggleTheme() {
  isLight.value = !isLight.value
  document.documentElement.classList.toggle('canvas-light', isLight.value)
}

function startEditName() {
  if (!canEdit.value) return
  editingName.value = true
  setTimeout(() => nameInputRef.value?.select(), 0)
}
async function commitName() {
  editingName.value = false
  projectName.value = (projectName.value || '').trim() || '未命名项目'
  scheduleSave(300)
}

function rememberRemoteVersion(project) {
  baseRevision = Number(project?.revision) || 0
}

function applyRemoteProject(project) {
  if (!project) return null
  currentProjectId.value = String(project.id)
  projectName.value = project.title || project.name || '未命名项目'
  rememberRemoteVersion(project)
  isDirty.value = false
  saveStatus.value = 'saved'
  const raw = project.graph
  serverGraph = readGraph(raw)
  displayBase = normalizedGraph(serverGraph)
  if (raw) {
    const result = store.loadCanvas(raw)
    store.nodes = store.nodes.map((node) =>
      markRestoredVideoTask(node, serverVideoTasks.value, !taskSyncError.value)
    )
    return result?.viewport ?? null
  }
  store.resetCanvas()
  return null
}

async function saveProject() {
  if (saveFlight) return saveFlight
  // The new server baseline is not installed until the active drag finishes.
  // Saving now would turn its unseen additions into apparent local deletions.
  if (deferredSavedGraph) return false
  if (saveConflict.value) return false
  if (!currentProjectId.value || !canEdit.value || editorDisposed) return !isDirty.value
  const submittedView = captureGraph()
  if (!hasGraphChanges(displayBase, submittedView)) {
    isDirty.value = false
    if (!saveError.value) saveStatus.value = 'saved'
    return true
  }
  const submitted = applyGraphDelta(displayBase, submittedView, serverGraph)
  const id = currentProjectId.value
  saveStatus.value = 'saving'
  saveFlight = (async () => {
    try {
      const saved = await projectApi.autosaveCanvas(id, {
        expectedRevision: baseRevision,
        graph: JSON.stringify(submitted),
        title: submitted.title,
        clientUpdatedAt: new Date().toISOString()
      })
      if (editorDisposed || id !== currentProjectId.value) return false
      const latestView = captureGraph()
      const merged = readGraph(saved.graph)
      const pending = applyGraphDelta(submittedView, latestView, merged)
      serverGraph = merged
      displayBase = normalizedGraph(merged)
      // A normal acknowledgement has no display delta. Reinstalling identical
      // nodes would reset VueFlow's drag and reapply stale transient flags.
      if (hasGraphChanges(latestView, normalizedGraph(pending))) {
        if (store.isDragging) deferredSavedGraph = { base: latestView, graph: pending }
        else installGraph(pending)
      }
      projectName.value = pending.title || saved.title
      rememberRemoteVersion(saved)
      isDirty.value = hasGraphChanges(displayBase, captureGraph())
      saveStatus.value = isDirty.value ? 'unsaved' : 'saved'
      saveError.value = ''
      if (isDirty.value && !store.isDragging) {
        clearTimeout(autoSaveTimer)
        autoSaveTimer = setTimeout(saveProject, 400)
      }
      return true
    } catch (e) {
      if (editorDisposed || id !== currentProjectId.value) return false
      saveStatus.value = 'unsaved'
      saveConflict.value = Number(e?.code) === 1040050011
      saveError.value = saveConflict.value
        ? '此画布已在其他窗口更新。请先下载草稿保留当前修改，再重新加载。'
        : e?.message || '保存失败，当前修改仍保留，请重试'
      return false
    } finally {
      saveFlight = null
    }
  })()
  return saveFlight
}

function downloadDraft() {
  const draft = applyGraphDelta(displayBase, captureGraph(), serverGraph)
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `canvas-${currentProjectId.value || 'draft'}-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function exitCanvas() {
  try {
    if (!(await flushAndSave())) return
  } catch {
    return
  }
  router.push('/canvas/index')
}

onBeforeRouteUpdate(async (to, from) => {
  if (to.query.projectId === from.query.projectId && to.query.shareToken === from.query.shareToken)
    return true
  if (!(await flushAndSave())) return false
  // The editor owns long-running media jobs. Remount for another canvas.
  window.location.assign(router.resolve(to).href)
  return false
})

onBeforeRouteLeave(async () => {
  clearTimeout(autoSaveTimer)
  return await flushAndSave()
})

// ─── VueFlow ────────────────────────────────────────────────────────────────────
const {
  onConnect,
  onConnectStart,
  onConnectEnd,
  project,
  fitView,
  getNodes,
  getViewport,
  setViewport,
  updateNodeInternals
} = useVueFlow()

function selectAll() {
  store.nodes = store.nodes.map((n) => ({ ...n, selected: true }))
  store.edges = store.edges.map((e) => ({ ...e, selected: true }))
}

// ─── Connect ───────────────────────────────────────────────────────────────────
let connectHandled = false
onConnect((params) => {
  if (!canEdit.value) return
  connectHandled = true
  let { source, sourceHandle, target, targetHandle } = params
  const isSource = (id) => id === 'sr',
    isTarget = (id) => id === 'tl'
  if (isSource(sourceHandle) && isSource(targetHandle)) targetHandle = 'tl'
  else if (isTarget(sourceHandle) && isTarget(targetHandle)) {
    ;[source, target] = [target, source]
    sourceHandle = 'sr'
    targetHandle = 'tl'
  }
  const UPLOAD_TYPES = new Set(['videoUploadNode', 'audioUploadNode'])
  const sourceNode = store.nodes.find((n) => n.id === source)
  const targetNode = store.nodes.find((n) => n.id === target)
  const check = validateRefEdge({
    sourceType: sourceNode?.type,
    sourceId: source,
    targetType: targetNode?.type,
    targetId: target,
    nodes: store.nodes,
    edges: store.edges
  })
  if (!check.ok) {
    if (check.reason) ElMessage.warning(check.reason)
    return
  }
  if (UPLOAD_TYPES.has(targetNode?.type)) return
  store.addEdge({
    source,
    sourceHandle,
    target,
    targetHandle,
    id: `edge-${source}-${sourceHandle}-${target}-${targetHandle}-${Date.now()}`
  })
})

// ─── Edge-drop ─────────────────────────────────────────────────────────────────
const edgeDrop = ref({ visible: false, x: 0, y: 0, canvasPos: { x: 0, y: 0 }, sourceType: null })
let dropSource = null
const ghostLine = ref({ visible: false, x1: 0, y1: 0, x2: 0, y2: 0 })
let connectStartInfo = null

const EDGE_DROP_TYPES = [
  { type: 'textNode', icon: 'T', label: '文本节点', color: '#B5B3AC' },
  { type: 'imageGenNode', icon: '🎨', label: '图片节点', color: '#8e8a82' },
  { type: 'videoGenNode', icon: '🎬', label: '视频节点', color: '#B58F3F' },
  { type: 'audioUploadNode', icon: '🎧', label: '音频节点', color: '#C4A484' },
  { type: 'noteNode', icon: '📝', label: '便签', color: '#8e8a82' }
]

const edgeDropOptions = computed(() => {
  const sourceType = edgeDrop.value.sourceType
  return EDGE_DROP_TYPES.map((opt) => ({
    ...opt,
    disabled: sourceType ? isCreateOptionDisabled(sourceType, opt.type) : false
  }))
})

function ghostLinePath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1) * 0.5
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
}

onConnectStart(({ event, nodeId, handleId }) => {
  if (!canEdit.value) return
  connectHandled = false
  const handle = event?.target?.closest?.('.vue-flow__handle') ?? event?.target
  const r = handle?.getBoundingClientRect()
  connectStartInfo = {
    nodeId,
    handleId,
    hx: r ? r.left + r.width / 2 : (event?.clientX ?? 0),
    hy: r ? r.top + r.height / 2 : (event?.clientY ?? 0),
    startX: event?.clientX ?? 0,
    startY: event?.clientY ?? 0
  }
})

onConnectEnd((event) => {
  if (!canEdit.value) return
  const info = connectStartInfo
  connectStartInfo = null
  if (!info || !event || edgeDrop.value.visible) return
  if (connectHandled) {
    connectHandled = false
    return
  }
  const dx = (event.clientX ?? 0) - info.startX,
    dy = (event.clientY ?? 0) - info.startY
  if (Math.sqrt(dx * dx + dy * dy) < 8) return
  if (event.target?.closest?.('.vue-flow__handle')) return
  const bounds = canvasRef.value?.getBoundingClientRect()
  const canvasPos = project({
    x: event.clientX - (bounds?.left ?? 0),
    y: event.clientY - (bounds?.top ?? 0)
  })
  ghostLine.value = {
    visible: true,
    x1: info.hx,
    y1: info.hy,
    x2: event.clientX,
    y2: event.clientY
  }
  dropSource = { nodeId: info.nodeId, handleId: info.handleId }
  const srcType = store.nodes.find((n) => n.id === info.nodeId)?.type ?? null
  edgeDrop.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    canvasPos,
    sourceType: srcType
  }
})

function closeEdgeDrop() {
  edgeDrop.value.visible = false
  ghostLine.value.visible = false
  dropSource = null
}

function createFromEdgeDrop(e, type, disabled) {
  e.stopPropagation()
  if (disabled) return
  const src = dropSource,
    canvasPos = { ...edgeDrop.value.canvasPos }
  closeEdgeDrop()
  const NEW_W =
    {
      textNode: 220,
      imageUploadNode: 200,
      imageGenNode: 200,
      videoUploadNode: 244,
      videoGenNode: 244,
      audioUploadNode: 280,
      noteNode: 180
    }[type] ?? 220
  const newNode = store.addNodeOfType(
    type,
    { x: canvasPos.x - NEW_W / 2, y: canvasPos.y - 60 },
    getNodes.value
  )
  if (!newNode) return
  activatePanelNode(newNode)
  if (src?.nodeId) {
    store.addEdge({
      id: `edge-${src.nodeId}-${newNode.id}-${Date.now()}`,
      source: src.nodeId,
      sourceHandle: src.handleId ?? 'sr',
      target: newNode.id,
      targetHandle: 'tl'
    })
  }
}

// ─── Fit view ──────────────────────────────────────────────────────────────────
function doFitView() {
  fitView({ padding: 0.15, duration: 400 })
  scheduleViewportSave(450)
}

const VIEWPORT_SAVE_MS = 600

function scheduleViewportSave() {
  if (canEdit.value) scheduleSave(VIEWPORT_SAVE_MS)
}

function onViewportMoveEnd() {
  scheduleViewportSave()
}

function onControlsViewportChange() {
  scheduleViewportSave()
}

function onControlsFitView() {
  scheduleViewportSave(450)
}

// ─── Auto save ─────────────────────────────────────────────────────────────────
// 操作（增删连移）短延迟；文本/面板输入长防抖；视口平移/缩放单独防抖保存。
const OP_SAVE_MS = 300
const CONTENT_SAVE_MS = 1000
let watchReady = false,
  autoSaveTimer = null

function scheduleSave(delay = OP_SAVE_MS) {
  if (!canEdit.value || !watchReady || remoteApplying || editorDisposed) return
  isDirty.value = true
  saveStatus.value = 'unsaved'
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => saveProject(), delay)
}

function flushCanvasState(event) {
  if (event?.type === 'beforeunload' && isDirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
  if (!canEdit.value) return
  store.syncLivePositions(getNodes.value)
  aiPanelRef.value?.flushPanel?.()
}

async function flushAndSave() {
  flushCanvasState()
  clearTimeout(autoSaveTimer)
  // 无本地编辑时禁止写回：否则无痕/多窗口离开会用旧 graph 覆盖其他端已保存内容
  if (saveFlight) await saveFlight
  if (deferredSavedGraph) return false
  if (!shouldPersistCanvas({ isDirty: isDirty.value })) return true
  return await saveProject()
}

async function syncFromRemoteIfNeeded() {
  const id = currentProjectId.value
  if (!id || !canEdit.value || editorDisposed || isDirty.value || saveFlight) return
  try {
    const project = await projectStore.fetchProject(id)
    if (editorDisposed || id !== currentProjectId.value) return
    receiveRemote(project)
  } catch (e) {
    if (!editorDisposed && id === currentProjectId.value) {
      saveError.value = e?.message || '画布同步失败，请稍后重新加载'
    }
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') syncFromRemoteIfNeeded()
}

function onNodeDrag() {
  aiPanelRef.value?.bumpPanelPosition?.()
}

function onNodeDragStop() {
  store.isDragging = false
  store.syncLivePositions(getNodes.value)
  if (deferredSavedGraph) {
    const { base, graph } = deferredSavedGraph
    deferredSavedGraph = null
    const current = captureGraph()
    const reconciled = applyGraphDelta(base, current, graph)
    if (hasGraphChanges(current, normalizedGraph(reconciled))) installGraph(reconciled)
  }
  aiPanelRef.value?.flushPanel?.()
  scheduleSave(OP_SAVE_MS)
}

store.registerDirtyHandler((kind) => {
  scheduleSave(kind === 'content' ? CONTENT_SAVE_MS : OP_SAVE_MS)
})

// ─── Load project ──────────────────────────────────────────────────────────────
// flowStore 全局共享：卸载/换项目后落地的过期响应会污染当前画布，再被 autosave
let loadSeq = 0

async function loadProject(projectId) {
  const seq = ++loadSeq
  deferredSavedGraph = null
  pageLoaded.value = false
  serverVideoTasks.value = []
  taskSyncError.value = ''
  saveError.value = ''
  store.resetCanvas()
  isDirty.value = false
  baseRevision = 0
  saveConflict.value = false
  try {
    if (!getAccessToken()) {
      useAuth().openLogin()
      return null
    }
    if (route.query.shareToken) throw new Error('画布分享链接已不再支持，请从我的画布打开')
    // Observe task failures immediately, even if the project request rejects first.
    const readTasks = async (id) => {
      try {
        return { ok: true, tasks: await generationApi.videoTasks(id) }
      } catch {
        return { ok: false }
      }
    }
    const pendingTasks = projectId ? readTasks(projectId) : null
    const project = projectId
      ? await projectStore.fetchProject(projectId)
      : await projectStore.createProject('未命名项目')
    if (editorDisposed || seq !== loadSeq || !project) return null
    const id = project.id
    const taskResult = await (pendingTasks || readTasks(id))
    if (editorDisposed || seq !== loadSeq) return null
    if (taskResult.ok) {
      onVideoTasksLoaded(taskResult.tasks || [])
    } else {
      taskSyncError.value = videoTaskSyncErrorMessage
    }
    currentProjectId.value = String(id)
    const viewport = applyRemoteProject(project)
    pageLoaded.value = true
    return viewport
  } catch (e) {
    if (editorDisposed || seq !== loadSeq) return null
    pageLoaded.value = false
    saveError.value = e?.message || '画布加载失败或没有访问权限'
    return null
  }
}

const canvasRef = ref(null)
const aiPanelRef = ref(null)
const assetLibraryRef = ref(null)
const canvasTool = ref('select')
const showMinimap = ref(false)
const showAssetLibrary = ref(false)
const mediaPanel = ref('')
const historyRefreshKey = ref(0)
const generationHistory = useGenerationHistory({
  projectId: currentProjectId,
  canEdit,
  isReady: () => watchReady,
  videoTasks: serverVideoTasks,
  refreshKey: historyRefreshKey,
  store,
  liveNodes: getNodes,
  save: flushAndSave,
  onVideoTasksLoaded
})
provide(GENERATION_HISTORY, generationHistory)
watch(mediaPanel, (value) => {
  if (value && showAssetLibrary.value) showAssetLibrary.value = false
  if (value) {
    generationHistory.openNodeId.value = ''
    void generationHistory.refresh()
  }
})

async function useRecoveredVideo(item) {
  if (!canEdit.value || editorDisposed) return false
  const projectId = currentProjectId.value
  const freshTasks = await generationApi.videoTasks(projectId)
  if (editorDisposed || !canEdit.value || currentProjectId.value !== projectId) return false
  if (!Array.isArray(freshTasks)) throw new Error('视频任务状态暂时无法确认，请重试')
  onVideoTasksLoaded(freshTasks)
  const node = nodes.value.find((node) => String(node.id) === String(item.nodeId))
  const task = videoTasksByNode.value.get(String(item.nodeId))
  if (
    String(task?.taskId) !== String(item.taskId) ||
    videoTaskDisplayData(node, task).generating ||
    node?.data?.uploading ||
    !needsVideoRecoveryChoice(node, task)
  ) {
    ElMessage.info('节点状态已变化，请重新查看生成历史')
    return false
  }
  store.updateNodeResult(node.id, videoTaskPatch(node, task, { useResult: true }), getNodes.value)
  if (!(await flushAndSave())) return false
  ElMessage.success('已使用此视频')
  return true
}

function locateHistoryNode(item) {
  const node = nodes.value.find((node) => node.id === item.nodeId)
  if (!node) {
    ElMessage.info('原节点已删除，仍可预览和下载历史成果')
    return
  }
  mediaPanel.value = ''
  fitView({ nodes: [node.id], padding: 0.5, duration: 300, maxZoom: 1 })
}

const viewportReady = ref(false)
const paneReady = ref(false)

watch(showAssetLibrary, async (visible) => {
  if (!visible || !canEdit.value) return
  if (mediaPanel.value) mediaPanel.value = ''
  await nextTick()
  void assetLibraryRef.value?.reload?.()
})
/** undefined=未加载, null=无保存视口, object=已保存视口 */
let loadedViewport = undefined
let viewportRestoreStarted = false

async function tryRestoreViewport() {
  if (viewportRestoreStarted || !paneReady.value || loadedViewport === undefined) return
  viewportRestoreStarted = true
  if (loadedViewport) {
    await setViewport(loadedViewport, { duration: 0 })
  } else {
    await fitView({ padding: 0.15, duration: 0 })
  }
  viewportReady.value = true
  if (!watchReady) {
    watchReady = true
    refreshAllNodeInternals()
    if (canEdit.value) void aiPanelRef.value?.resumePendingGenTasks?.()
  }
}

function onPaneReady() {
  paneReady.value = true
  void tryRestoreViewport()
}

function activatePanelNode(node) {
  if (!node || !isPanelNodeType(node.type)) return
  store.setActivePanelNode(node.id)
  store.nodes = store.nodes.map((n) => ({ ...n, selected: n.id === node.id }))
}

function addNodeAtCenter(type) {
  const liveNodes = getNodes.value
  const NODE_W = 260
  const NODE_H = 180
  const GAP = 80

  const vp = getViewport()
  const bounds = canvasRef.value?.getBoundingClientRect()

  // 视口中心（flow 坐标）作为兜底
  const cx = bounds ? (bounds.width / 2 - vp.x) / vp.zoom : 0
  const cy = bounds ? (bounds.height / 2 - vp.y) / vp.zoom : 0

  // 有选中节点时，放到其左侧；否则用视口中心
  const selected = liveNodes.find((n) => n.selected)
  let pos
  if (selected) {
    const sh = selected.dimensions?.height ?? 120
    pos = {
      x: selected.position.x - NODE_W - GAP,
      y: selected.position.y + sh / 2 - NODE_H / 2
    }
  } else {
    pos = { x: cx - NODE_W / 2, y: cy - NODE_H / 2 }
  }

  const node = store.addNodeOfType(type, pos, liveNodes)
  activatePanelNode(node)
}

function refreshAllNodeInternals() {
  nextTick(() => {
    getNodes.value.forEach((n) => updateNodeInternals(n.id))
  })
}

// ─── Mac trackpad: block browser back/forward swipe ────────────────────────────
// Chrome/Safari promote two-finger horizontal overscroll to history navigation
// before (or instead of) Vue Flow pan. Lock document overscroll + non-passive
// preventDefault on the canvas, while still allowing nested scroll areas.
const CANVAS_OVERSCROLL_CLASS = 'canvas-overscroll-lock'

function nearestScrollableCanConsume(el, deltaX, deltaY, root) {
  let node = el instanceof Element ? el : el?.parentElement
  while (node && node !== root) {
    if (node.nodeType === 1) {
      const style = getComputedStyle(node)
      const ox = style.overflowX
      const oy = style.overflowY
      const scrollX = ox === 'auto' || ox === 'scroll' || ox === 'overlay'
      const scrollY = oy === 'auto' || oy === 'scroll' || oy === 'overlay'
      if (scrollY && Math.abs(deltaY) >= Math.abs(deltaX)) {
        const top = node.scrollTop
        const max = node.scrollHeight - node.clientHeight
        if ((deltaY < 0 && top > 0) || (deltaY > 0 && top < max - 1)) return true
      }
      if (scrollX && Math.abs(deltaX) > 0) {
        const left = node.scrollLeft
        const max = node.scrollWidth - node.clientWidth
        if ((deltaX < 0 && left > 0) || (deltaX > 0 && left < max - 1)) return true
      }
    }
    node = node.parentElement
  }
  return false
}

function onCanvasWheel(e) {
  const root = canvasRef.value
  if (!root || !root.contains(e.target)) return
  if (nearestScrollableCanConsume(e.target, e.deltaX, e.deltaY, root)) return
  e.preventDefault()
}

function onCanvasGesture(e) {
  e.preventDefault()
}

function bindCanvasGestureGuards() {
  const root = canvasRef.value
  if (!root) return
  document.documentElement.classList.add(CANVAS_OVERSCROLL_CLASS)
  // capture + non-passive: must run before browser history-swipe promotion
  root.addEventListener('wheel', onCanvasWheel, { passive: false, capture: true })
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    root.addEventListener(type, onCanvasGesture, { passive: false, capture: true })
  }
}

function unbindCanvasGestureGuards() {
  const root = canvasRef.value
  document.documentElement.classList.remove(CANVAS_OVERSCROLL_CLASS)
  if (!root) return
  root.removeEventListener('wheel', onCanvasWheel, { capture: true })
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    root.removeEventListener(type, onCanvasGesture, { capture: true })
  }
}

onMounted(async () => {
  store.registerLiveNodesGetter(() => getNodes.value)
  if (getAccessToken()) userPointsStore.fetchUserPoints()
  bindCanvasGestureGuards()
  loadedViewport = await loadProject(route.query.projectId)
  if (editorDisposed) return
  await tryRestoreViewport()
  if (editorDisposed) return

  window.addEventListener('beforeunload', flushCanvasState)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', syncFromRemoteIfNeeded)
})

onBeforeUnmount(() => {
  loadSeq++
  editorDisposed = true
  playback.dispose()
  pageLoaded.value = false
  store.configureEditPolicy({ create: () => false, node: () => false })
  clearTimeout(autoSaveTimer)
  store.registerDirtyHandler(null)
  unbindCanvasGestureGuards()
  window.removeEventListener('beforeunload', flushCanvasState)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', syncFromRemoteIfNeeded)
})

async function usePersonalAsset(asset) {
  if (!canEdit.value) return
  addAssetNode(asset)
}

// ─── Drag-and-drop ─────────────────────────────────────────────────────────────
const ASSET_DRAG_MIME = 'application/x-canvas-asset'
const MEDIA_DROP_GAP_X = 220
const draggingAsset = ref(null)
const replacementTargetNodeId = ref('')

function onAssetDragging(asset) {
  draggingAsset.value = asset || null
  if (!asset) replacementTargetNodeId.value = ''
}

function isFileDrag(e) {
  return Array.from(e.dataTransfer?.types || []).includes('Files')
}

function isAssetDrag(e) {
  return Array.from(e.dataTransfer?.types || []).includes(ASSET_DRAG_MIME)
}

function resolveAssetKind(asset) {
  if (asset?.kind === 'video') return 'video'
  if (asset?.kind === 'image') return 'image'
  const source = String(asset?.url || '')
  return /\.(mp4|mov|webm|m4v|ogg)(\?.*)?$/i.test(source) ? 'video' : 'image'
}

function addAssetNode(asset, dropPos = null) {
  const kind = resolveAssetKind(asset)
  const nodeType = kind === 'video' ? 'videoUploadNode' : 'imageUploadNode'
  if (!dropPos) {
    addNodeAtCenter(nodeType)
    const node = store.nodes.at(-1)
    if (!node) return
    store.updateNodeData(node.id, {
      src: asset.url,
      outputValue: asset.url,
      fileName: asset.name,
      poster: asset.poster,
      ...(asset.duration ? { duration: asset.duration } : {})
    })
    return
  }

  const nodeWidth = kind === 'video' ? 280 : 244
  const pos = {
    x: dropPos.x - nodeWidth / 2,
    y: dropPos.y - 88
  }
  const node = store.addNodeOfType(nodeType, pos, getNodes.value)
  if (!node) return
  store.updateNodeData(
    node.id,
    {
      src: asset.url,
      outputValue: asset.url,
      fileName: asset.name,
      poster: asset.poster,
      ...(asset.duration ? { duration: asset.duration } : {})
    },
    getNodes.value
  )
  activatePanelNode(node)
}

function parseAssetDragPayload(e) {
  const raw = e.dataTransfer?.getData(ASSET_DRAG_MIME)
  if (!raw) return null
  try {
    const payload = JSON.parse(raw)
    if (!payload?.url) return null
    return payload
  } catch {
    return null
  }
}

function getCompatibleReplaceTarget(e, assetKind) {
  const nodeEl = e.target?.closest?.('.vue-flow__node')
  const nodeId = nodeEl?.getAttribute?.('data-id')
  if (!nodeId) return null
  const node = store.nodes.find((n) => n.id === nodeId)
  if (!node || !canEdit.value) return null
  if (assetKind === 'image' && !node.type?.includes('image')) return null
  if (assetKind === 'video' && !node.type?.includes('video')) return null
  return node
}

function replaceNodeAsset(node, asset) {
  const patch = {
    src: asset.url,
    outputValue: asset.url,
    fileName: asset.name,
    uploading: false
  }
  if (asset.kind === 'video') {
    patch.poster = asset.poster || ''
    if (asset.duration) patch.duration = asset.duration
  }
  store.updateNodeData(node.id, patch, getNodes.value)
  activatePanelNode(node)
}

function onDragOver(e) {
  e.preventDefault()
  if (isAssetDrag(e) && draggingAsset.value) {
    const target = getCompatibleReplaceTarget(e, draggingAsset.value.kind)
    replacementTargetNodeId.value = target?.id || ''
  } else {
    replacementTargetNodeId.value = ''
  }
  if (isFileDrag(e) || isAssetDrag(e)) {
    e.dataTransfer.dropEffect = 'copy'
    return
  }
  e.dataTransfer.dropEffect = 'move'
}

function onDragLeave(e) {
  const related = e.relatedTarget
  if (canvasRef.value && related && canvasRef.value.contains(related)) return
  replacementTargetNodeId.value = ''
}

function onDrop(e) {
  e.preventDefault()
  if (!canEdit.value) return

  if (e.target?.closest?.('.ai-panel, .toolbar, .node-action-bar, .asset-library-panel')) return

  const bounds = canvasRef.value?.getBoundingClientRect()
  const pos = project({
    x: e.clientX - (bounds?.left ?? 0),
    y: e.clientY - (bounds?.top ?? 0)
  })

  const type = e.dataTransfer.getData('application/vueflow')
  if (type) {
    store.addNodeOfType(type, pos, getNodes.value)
    return
  }

  const draggedAsset = parseAssetDragPayload(e)
  if (draggedAsset) {
    const target = getCompatibleReplaceTarget(e, draggedAsset.kind)
    if (target) {
      replaceNodeAsset(target, draggedAsset)
      replacementTargetNodeId.value = ''
      draggingAsset.value = null
      return
    }
    addAssetNode(draggedAsset, pos)
    replacementTargetNodeId.value = ''
    draggingAsset.value = null
    return
  }

  const files = Array.from(e.dataTransfer?.files || [])
  replacementTargetNodeId.value = ''
  if (!files.length) return
  void dropMediaFiles(files, e)
}

async function dropMediaFiles(files, e) {
  const projectId = currentProjectId.value
  const generation = loadSeq
  const active = () =>
    !editorDisposed &&
    canEdit.value &&
    generation === loadSeq &&
    projectId === currentProjectId.value
  if (!active()) return
  const bounds = canvasRef.value?.getBoundingClientRect()
  const base = project({
    x: e.clientX - (bounds?.left ?? 0),
    y: e.clientY - (bounds?.top ?? 0)
  })

  let placed = 0
  for (const file of files) {
    if (!active()) return
    const kind = detectFileKind(file)
    if (kind !== 'image' && kind !== 'video') {
      ElMessage.error(`${file.name} 不支持，请拖入图片（jpg/png/webp）或视频（mp4/mov）`)
      continue
    }

    let duration = 0
    if (kind === 'video') {
      try {
        duration = await readVideoDuration(file)
        if (!active()) return
      } catch {
        if (!active()) return
        ElMessage.error(`${file.name} 无法读取视频时长，请更换文件后重试`)
        continue
      }
      const err = validateVideoUpload(duration, 0)
      if (err) {
        ElMessage.error(err)
        continue
      }
    }

    const pos = { x: base.x + placed * MEDIA_DROP_GAP_X, y: base.y }
    placed += 1

    const nodeType = kind === 'image' ? 'imageUploadNode' : 'videoUploadNode'
    const node = store.addNodeOfType(nodeType, pos, getNodes.value)
    if (!node) continue

    store.updateNodeData(node.id, { uploading: true, fileName: file.name }, getNodes.value)
    activatePanelNode(node)

    void (async () => {
      try {
        const url = await uploadCanvasFile(file)
        if (!active()) return
        const patch = {
          uploading: false,
          src: url,
          outputValue: url,
          fileName: file.name
        }
        if (kind === 'video' && duration > 0) patch.duration = duration
        store.updateNodeResult(node.id, patch, getNodes.value)
      } catch {
        if (!active()) return
        store.updateNodeResult(node.id, { uploading: false }, getNodes.value)
        ElMessage.error(`${file.name} 上传失败`)
      }
    })()
  }
}

// ─── Context menu ──────────────────────────────────────────────────────────────
const ctxMenu = ref({ visible: false, x: 0, y: 0, target: null, targetType: 'pane' })
const ctxDropPos = ref({ x: 0, y: 0 })

function openCtxMenu(e, target, targetType) {
  if (!canEdit.value) {
    e.preventDefault()
    return
  }
  e.preventDefault()
  e.stopPropagation()
  ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, target, targetType }
  const bounds = canvasRef.value?.getBoundingClientRect()
  ctxDropPos.value = project({
    x: e.clientX - (bounds?.left ?? 0),
    y: e.clientY - (bounds?.top ?? 0)
  })
}
function closeCtxMenu() {
  ctxMenu.value.visible = false
}

function isPanelNodeType(type) {
  return type?.includes('image') || type?.includes('video') || type === 'textNode'
}

/** selection-on-drag 等路径只改 selected、不保证 node-click → 面板跟选中同步 */
watch(
  () =>
    nodes.value
      .filter((n) => n.selected)
      .map((n) => `${n.id}:${n.type}`)
      .sort()
      .join('|'),
  () => {
    const selectedPanelIds = nodes.value
      .filter((n) => n.selected && isPanelNodeType(n.type))
      .map((n) => n.id)
    const next = nextActivePanelId(selectedPanelIds, store.activePanelNodeId)
    if (next === store.activePanelNodeId) return
    if (next) store.setActivePanelNode(next)
    else store.clearActivePanelNode()
  }
)

function clearNodeSelection() {
  store.nodes = store.nodes.map((n) => ({ ...n, selected: false }))
}

function onPaneClick(e) {
  closeCtxMenu()
  aiPanelRef.value?.flushPanel?.()
  store.clearActivePanelNode()
  clearNodeSelection()
}

function onNodeClick({ node }) {
  closeCtxMenu()
  if (mediaPanel.value) mediaPanel.value = ''
  store.setActivePanelNode(node.id)
  if (canEdit.value) void aiPanelRef.value?.resumePendingGenTasks?.()
}

function onCtxAction(action) {
  if (!canEdit.value) return
  const { target, targetType } = ctxMenu.value
  const pos = ctxDropPos.value
  if (targetType === 'node' && target) {
    if (action === 'delete') store.confirmRemoveNodeById(target.id)
    else if (action === 'duplicate') {
      const orig = nodes.value.find((n) => n.id === target.id)
      if (orig) {
        store.addNodeOfType(
          orig.type,
          { x: orig.position.x + 30, y: orig.position.y + 30 },
          getNodes.value
        )
        const newNode = nodes.value[nodes.value.length - 1]
        store.updateNodeData(newNode.id, { ...orig.data })
      }
    }
  } else if (targetType === 'edge' && target) {
    // Must go through handleEdgesChange — strips @mentions + refreshes asset wall
    if (action === 'delete') store.handleEdgesChange([{ type: 'remove', id: target.id }])
    else if (action === 'toggle-animated')
      store.updateEdgeData(target.id, { animated: !target.animated })
  } else {
    if (action === 'select-all') selectAll()
    else if (action === 'fit-view') doFitView()
    else if (action === 'add-text') store.addNodeOfType('textNode', pos, getNodes.value)
    else if (action === 'add-image') store.addNodeOfType('imageUploadNode', pos, getNodes.value)
    else if (action === 'add-audio') store.addNodeOfType('audioUploadNode', pos, getNodes.value)
    else if (action === 'add-note') store.addNodeOfType('noteNode', pos, getNodes.value)
  }
}

// ─── Keyboard shortcuts ─────────────────────────────────────────────────────────
function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true
  if (target.isContentEditable) return true
  return false
}

function onKeydown(e) {
  if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return
  if (e.key === 'f' || e.key === 'F') doFitView()
  if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    selectAll()
  }
  if (canEdit.value && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault()
    store.confirmRemoveSelectedNodes()
  }
}
</script>

<style lang="scss" scoped>

.collab-caption {
  font-size: 12px;
  color: #bcbac9;
}
.canvas-error,
.video-recovery-notice {
  padding: 10px 18px;
  background: #513827;
  color: #ffdfb5;
  display: flex;
  gap: 12px;
  align-items: center;
}
.video-recovery-notice {
  background: #242331;
  color: #e0c077;
  font-size: 12px;
  flex-shrink: 0;
}
.canvas-error button,
.video-recovery-notice button {
  color: inherit;
  background: transparent;
  border: 1px solid currentColor;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
}

.video-sync-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 14px 20px;
  flex-shrink: 0;
  background: #23202b;
  border-bottom: 1px solid #514354;
  color: #f7e7c6;
}
.video-sync-copy {
  display: flex;
  flex: 1 1 320px;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  overflow-wrap: anywhere;
  strong {
    font-size: 14px;
    font-weight: 600;
  }
  span {
    color: #d9c9b0;
    font-size: 13px;
    line-height: 1.6;
  }
}
.video-sync-notice button {
  flex-shrink: 0;
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid #cbb58e;
  border-radius: 6px;
  background: #f2d9a6;
  color: #292118;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #ffe9c1;
  }
  &:focus-visible {
    outline: 2px solid #f2d9a6;
    outline-offset: 3px;
  }
  &:disabled {
    background: #3a3440;
    color: #ddd1bd;
    border-color: #776879;
    cursor: wait;
  }
}

.app-shell {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
  outline: none;
  background: $bg-base;
}

// ── Top bar ──────────────────────────────────────────────────────────────────
.canvas-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  background: rgba(#11100e, 0.97);
  border-bottom: 1px solid $border-default;
  flex-shrink: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-default;
  border-radius: 999px;
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  transition: $transition-fast;
  font-family: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: $text-primary;
  }
}

.canvas-save-status {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: $text-secondary;
  white-space: nowrap;
}

.topbar-name-pill {
  display: flex;
  align-items: center;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-default;
}

.topbar-name {
  font-size: 13px;
  font-weight: 600;
  color: #deddd7;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 999px;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.topbar-name-input {
  font-size: 13px;
  font-weight: 600;
  color: #deddd7;
  background: $bg-surface;
  border: 1px solid $accent-primary;
  border-radius: 999px;
  padding: 6px 12px;
  outline: none;
  width: 220px;
  text-align: center;
  font-family: inherit;
}
.topbar-btn {
  padding: 5px 10px;
  background: none;
  border: 1px solid $border-default;
  border-radius: $radius-sm;
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: $text-primary;
  }
}

.topbar-points-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-default;
  color: $text-primary;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  span:first-child {
    color: $accent-text;
  }
}

// ── Canvas layout ─────────────────────────────────────────────────────────────
.canvas-body {
  flex: 1;
  overflow: hidden;
}

.canvas-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #aaa;
  pointer-events: none;
}

.canvas-wrap {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: $bg-base;
  touch-action: none;
  overscroll-behavior: none;

  &.is-viewport-pending :deep(.vue-flow) {
    visibility: hidden;
  }
}
</style>

<style lang="scss">
/* Document-level lock: Chrome swipe-back often fires at viewport, not the canvas node */
html.canvas-overscroll-lock,
html.canvas-overscroll-lock body {
  overscroll-behavior: none;
  overscroll-behavior-x: none;
}
</style>

<style lang="scss">

// ── Node global styles ────────────────────────────────────────────────────────
.canvas-node {
  background: rgba(#131312, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  overflow: visible;

  &.selected {
    border-color: $accent-primary;
    box-shadow:
      0 0 0 1px rgba($accent-primary, 0.35),
      0 0 20px rgba($accent-primary, 0.2),
      0 0 40px rgba($accent-primary, 0.08);
    animation: node-glow 2.4s ease-in-out infinite;
  }
}

@keyframes node-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba($accent-primary, 0.35),
      0 0 18px rgba($accent-primary, 0.18),
      0 0 40px rgba($accent-primary, 0.06);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba($accent-primary, 0.6),
      0 0 28px rgba($accent-primary, 0.32),
      0 0 60px rgba($accent-primary, 0.14);
  }
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 9px 9px 0 0;
}

.node-icon {
  font-size: 12px;
  flex-shrink: 0;
}
.node-label {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-del {
  background: none;
  border: none;
  color: $text-dim;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  border-radius: $radius-sm;
  transition:
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
  &:hover {
    color: #b23b3b;
    background: rgba(#b23b3b, 0.09);
  }
}
.node-body {
  padding: 10px;
}

// ── Handle ────────────────────────────────────────────────────────────────────
.vue-flow__handle {
  width: 10px !important;
  height: 10px !important;
  border-radius: 50% !important;
  background: #262523 !important;
  border: 2px solid #6b6861 !important;
  transition:
    background 0.15s,
    transform 0.15s !important;
  z-index: 1;

  &:hover {
    background: #8e8a82 !important;
  }

  // 保留 Vue Flow 默认 translate(±50%)，只加 scale，避免 hover 把连接点拽回节点内
  &.vue-flow__handle-left:hover {
    transform: translate(-50%, -50%) scale(1.3) !important;
  }
  &.vue-flow__handle-right:hover {
    transform: translate(50%, -50%) scale(1.3) !important;
  }
}

.vue-flow__handle-connecting {
  background: $accent-green !important;
  border-color: $accent-green !important;
}

// ── Edges — flowing ant-line animation ────────────────────────────────────────
.vue-flow__edge-path {
  stroke: #5b5953 !important;
  stroke-width: 1.25;
  stroke-dasharray: 5 5;
  filter: none;
}

.vue-flow__edge .vue-flow__edge-text {
  fill: $text-secondary;
}

.vue-flow__edge.animated .vue-flow__edge-path {
  stroke-dasharray: 5 5;
  animation: none;
}

.canvas-wrap.is-video-playing .vue-flow__edge.animated .vue-flow__edge-path {
  animation-play-state: paused;
}

@keyframes flow-edge {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #8e8a82 !important;
  stroke-width: 1.5;
  filter: none;
}

.vue-flow__node.asset-drop-target {
  outline: 2px dashed $accent-text;
  outline-offset: 3px;
  box-shadow:
    0 0 0 2px rgba($accent-primary, 0.3),
    0 0 18px rgba($accent-primary, 0.16);
}

// ── Selection box ─────────────────────────────────────────────────────────────
.vue-flow__selection {
  background: rgba($accent-primary, 0.05) !important;
  border: 1px dashed rgba($accent-primary, 0.5) !important;
}

// ── Controls ──────────────────────────────────────────────────────────────────
.vue-flow__controls {
  background: #292927 !important;
  border: 1px solid $border-default !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
  backdrop-filter: blur(8px) !important;
}

.vue-flow__controls-button {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid $border-default !important;
  color: #e1e3eb !important;

  svg {
    fill: currentColor !important;
  }

  &:focus-visible {
    outline: 2px solid #a9adba;
    outline-offset: -3px;
  }

  &:hover {
    background: rgba($accent-primary, 0.12) !important;
    color: $accent-primary !important;
  }
  &:last-child {
    border-bottom: none !important;
  }
}

// ── MiniMap ───────────────────────────────────────────────────────────────────
.vue-flow__minimap {
  background: rgba(#111110, 0.9) !important;
  border: 1px solid $border-default !important;
  border-radius: 10px !important;
}

// ── Group node ────────────────────────────────────────────────────────────────
.vue-flow__node-groupNode {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

// 图片节点高度由内容撑开，不锁 style.height
.vue-flow__node-imageNode,
.vue-flow__node-imageUploadNode,
.vue-flow__node-imageGenNode {
  height: auto !important;
}

// ── Node resizer ──────────────────────────────────────────────────────────────
.vue-flow__resize-control {
  background: $accent-primary !important;
  border-color: $accent-text !important;
}

// ── Ghost line ────────────────────────────────────────────────────────────────
.ghost-line-svg {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 8999;
  overflow: visible;
}

// ── Edge-drop picker ──────────────────────────────────────────────────────────
.edrop-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
}

.edrop-picker {
  position: fixed;
  z-index: 9001;
  transform: translate(-50%, 8px);
  background: rgba(#1b1b19, 0.97);
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  padding: 4px;
  min-width: 160px;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba($accent-primary, 0.1);
  backdrop-filter: blur(12px);
  animation: edrop-in 0.12s ease;
}

@keyframes edrop-in {
  from {
    opacity: 0;
    transform: translate(-50%, 0px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 8px) scale(1);
  }
}

.edrop-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: $text-dim;
  padding: 4px 8px 6px;
}

.edrop-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #b5b3ac;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  margin-bottom: 2px;
  font-family: inherit;
  &:last-child {
    margin-bottom: 0;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    color: $text-primary;
  }
  &.disabled,
  &:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    color: $text-dim;
    &:hover {
      background: none;
      color: $text-dim;
    }
  }
}

.edrop-icon {
  width: 16px;
  text-align: center;
  font-size: 13px;
  flex-shrink: 0;
}
.edrop-label {
  flex: 1;
  font-size: 12px;
}
</style>

<style lang="scss">

.canvas-node-delete-msgbox.el-message-box {
  background: #20201f;
  border: 1px solid $border-default;
  border-radius: $radius-xl;
  padding: 20px 22px 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);

  .el-message-box__header {
    padding: 0 0 10px;
  }

  .el-message-box__title {
    color: $text-primary;
    font-size: 15px;
    font-weight: 600;
  }

  .el-message-box__content {
    padding: 0 0 18px;
    color: $text-secondary;
    font-size: 13px;
    line-height: 1.55;
  }

  .el-message-box__btns {
    padding: 0;

    .el-button {
      border: none;
      background: transparent;
      color: $text-secondary;
      font-size: 13px;
      padding: 8px 14px;
      height: auto;

      &:hover {
        color: $text-primary;
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .canvas-node-delete-msgbox__confirm {
      background: #e53935;
      color: #fff;
      border-radius: 999px;
      padding: 8px 22px;
      font-weight: 600;

      &:hover {
        background: #ef5350;
        color: #fff;
      }
    }
  }
}
</style>
