// 画布核心 Store：VueFlow 节点/边的数据源，所有节点操作均通过此 store 进行
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { applyNodeChanges, applyEdgeChanges } from '@vue-flow/core'
import { parseGraphDocument, normalizeAutoHeightNode } from '../utils/graphAdapter'
import { recomputeAssetWallFromEdges, mergeAssetWalls, wallMentionLabels } from '../utils/assetWall'
import { flushBeforePanelSwitch } from '../utils/panelActiveSwitch'
import { validateRefEdge } from '../utils/refInputConstraints'
import { confirmRemoveNodes } from '../utils/confirmRemoveNodes.js'
import { stripMentionLabels, mentionLabelFromNode } from '../utils/stripMentionLabels'
import { ElMessage } from '../shims/feedback'

// ─── 唯一 ID 生成器 ──────────────────────────────────────────────────────────
let _uid = 0
// 每次调用返回 "prefix-自增序号-时间戳"，确保同一会话内全局唯一
const uid = (prefix = 'node') => `${prefix}-${++_uid}-${Date.now()}`

// 节点类型 → 显示名称映射（用于 changeNodeType 更新 label）
const TYPE_LABELS = {
  textNode: '文本节点',
  imageUploadNode: '图片上传',
  imageGenNode: '图片节点',
  videoUploadNode: '视频上传',
  videoGenNode: '视频节点',
  audioUploadNode: '音频节点',
  noteNode: '备注',
  groupNode: '分组',
  // legacy 兼容旧项目数据
  imageNode: '图片节点',
  videoNode: '视频节点'
}

// 节点类型 → 默认宽度映射（用于计算新节点的连接位置偏移）
const NODE_WIDTHS = {
  textNode: 220,
  imageUploadNode: 244,
  imageGenNode: 244,
  videoUploadNode: 280,
  videoGenNode: 280,
  audioUploadNode: 280,
  noteNode: 180,
  groupNode: 0,
  // legacy
  imageNode: 244,
  videoNode: 280
}

export const useFlowStore = defineStore('flow', () => {
  // ─── 画布设置 ────────────────────────────────────────────────────────────
  const snapEnabled = ref(true) // 是否开启对齐网格
  const gridSize = ref(20) // 网格尺寸（px）
  const showGrid = ref(true) // 是否显示背景网格

  // ─── 画布核心数据（VueFlow 受控模式数据源）────────────────────────────────
  const nodes = ref([]) // 所有节点，直接绑定到 <VueFlow :nodes>
  const edges = ref([]) // 所有边，直接绑定到 <VueFlow :edges>
  const isDragging = ref(false)
  /** 当前激活 AI 面板的节点 id（与 VueFlow selected 解耦，保证切换/取消选中行为正确） */
  const activePanelNodeId = ref(null)

  // 页面加载和卸载期间的统一写入保护，不涉及节点租约。
  let editPolicy = null
  function configureEditPolicy(policy) {
    editPolicy = policy
  }
  function canEditNode(id) {
    return !editPolicy || editPolicy.node(id)
  }
  function canCreate() {
    return !editPolicy || editPolicy.create()
  }
  function allowNodes(ids) {
    return [...new Set(ids.filter(Boolean))].every(canEditNode)
  }
  function collectRemovalIds(ids) {
    const all = new Set(ids)
    // Saved graphs may list children before their parents, including nested groups.
    let previousSize
    do {
      previousSize = all.size
      for (const node of nodes.value) if (all.has(node.parentNode)) all.add(node.id)
    } while (previousSize !== all.size)
    return all
  }
  function affectedByRemoval(ids) {
    const removed = collectRemovalIds(ids)
    const affected = new Set(removed)
    for (const edge of edges.value) {
      if (removed.has(edge.source) || removed.has(edge.target)) {
        affected.add(edge.source)
        affected.add(edge.target)
      }
    }
    return [...affected]
  }

  /** VueFlow getNodes — 注册后 updateNodeData 自动合并拖拽中的最新坐标 */
  let _getLiveNodes = null
  function registerLiveNodesGetter(fn) {
    _getLiveNodes = fn
  }
  function resolveLiveNodes(explicit) {
    const live = explicit ?? _getLiveNodes?.() ?? null
    return live?.length ? live : null
  }

  // ─── 计算属性 ────────────────────────────────────────────────────────────
  const selectedNodes = computed(() => nodes.value.filter((n) => n.selected))
  const selectedEdges = computed(() => edges.value.filter((e) => e.selected))

  // ─── VueFlow 变更处理器（受控模式必须实现）────────────────────────────────
  // VueFlow 内部产生变更（拖拽/选中/删除）后触发 @nodes-change，
  // 通过 applyNodeChanges 将变更应用到 store，保持数据一致性
  function handleNodesChange(changes) {
    changes = changes.filter((c) => c.type !== 'dimensions' || typeof c.resizing === 'boolean')
    const mutations = changes.filter((c) => c.type !== 'select')
    const removals = mutations.filter((c) => c.type === 'remove').map((c) => c.id)
    const affected = [...mutations.map((c) => c.id ?? c.item?.id), ...affectedByRemoval(removals)]
    if (!allowNodes(affected) || (mutations.some((c) => c.type === 'add') && !canCreate())) return
    if (removals.length) removeNodes(removals)
    // Store nodes are plain nodes, not VueFlow GraphNodes: applyNodeChanges
    // ignores their dimensions/position. Commit each resize batch together so
    // left/top handles cannot feed an old position back into the live node.
    const geometryIds = new Set(
      changes.filter((c) => c.type === 'position' || c.type === 'dimensions').map((c) => c.id)
    )
    nodes.value = applyNodeChanges(
      changes.filter(
        (c) => c.type !== 'remove' && c.type !== 'dimensions' && c.type !== 'position'
      ),
      nodes.value
    )
    nodes.value = nodes.value.map((node) => {
      if (!geometryIds.has(node.id)) return node
      let next = node
      for (const change of changes) {
        if (change.id !== node.id) continue
        if (
          change.type === 'position' &&
          Number.isFinite(change.position?.x) &&
          Number.isFinite(change.position?.y)
        ) {
          next = { ...next, position: { ...change.position } }
        }
        if (change.type === 'dimensions' && change.dimensions) {
          next = withNodeSize(next, change.dimensions)
        }
      }
      return next
    })
    // 忽略 select / 拖拽中 position；仅在增删、拖完、缩放结束时标脏
    const dirty = changes.some((c) => {
      if (c.type === 'remove' || c.type === 'add') return true
      if (c.type === 'position' && c.dragging === false) return true
      if (c.type === 'dimensions' && c.resizing === false) return true
      return false
    })
    if (dirty) markDirty('op')
  }
  /** AIPanel 注册：切节点前把共享面板状态写回旧节点，避免 watch 顺序互相覆盖 */
  let _panelFlusher = null

  function handleEdgesChange(changes) {
    const affected = changes
      .filter((c) => c.type !== 'select')
      .flatMap((c) => {
        const e = c.item || edges.value.find((e) => e.id === c.id)
        return e ? [e.source, e.target] : []
      })
    if (!allowNodes(affected)) return
    const removedEdges = changes
      .filter((c) => c.type === 'remove')
      .map((c) => edges.value.find((e) => e.id === c.id))
      .filter(Boolean)
    const labelsByTarget = new Map()
    for (const edge of removedEdges) {
      const labels = labelsByTarget.get(edge.target) || []
      labels.push(...labelsForSourceTarget(edge.source, edge.target))
      labelsByTarget.set(edge.target, labels)
    }
    for (const [targetId, labels] of labelsByTarget) {
      if (activePanelNodeId.value === targetId) _panelFlusher?.(targetId)
      scrubPromptMentions(targetId, labels)
    }
    edges.value = applyEdgeChanges(changes, edges.value)
    for (const target of labelsByTarget.keys()) refreshNodeAssetWall(target)
    if (changes.some((c) => c.type === 'remove' || c.type === 'add')) markDirty('op')
  }

  function refreshNodeAssetWall(nodeId, edgeList = edges.value, liveNodes) {
    if (!canEditNode(nodeId)) return
    const node = nodes.value.find((n) => n.id === nodeId)
    if (!node) return
    const fromEdges = recomputeAssetWallFromEdges(nodeId, nodes.value, edgeList)
    const localOnly = (node.data?.assetWall || []).filter((item) => item.source === 'upload')
    updateNodeData(nodeId, { assetWall: mergeAssetWalls(fromEdges, localOnly) }, liveNodes)
  }

  /** Wall `@图片1` + fallback `data.label` — matches AIPanel mentions. */
  function labelsForSourceTarget(sourceId, targetId) {
    const wall = wallMentionLabels(sourceId, targetId, nodes.value, edges.value)
    const fallback = mentionLabelFromNode(nodes.value.find((n) => n.id === sourceId))
    return [...new Set([...wall, fallback].filter(Boolean))]
  }

  function scrubPromptMentions(targetId, labels, liveNodes) {
    if (!labels?.length) return
    const node = nodes.value.find((n) => n.id === targetId)
    if (!node) return
    const prev = node.data?.prompt ?? ''
    const next = stripMentionLabels(prev, labels)
    if (next === prev) return
    updateNodeData(targetId, { prompt: next }, liveNodes)
  }

  // ─── 节点工厂（各类型初始数据）─────────────────────────────────────────
  const nodeDefaults = {
    textNode: (pos) => ({
      id: uid('text'),
      type: 'textNode',
      position: pos,
      style: { width: '240px', height: '160px' },
      data: { label: '文本节点', content: '双击编辑内容...', outputValue: '' }
    }),
    imageNode: (pos) => ({
      id: uid('image'),
      type: 'imageNode',
      position: pos,
      data: { label: '图片节点', src: '', alt: '图片' }
    }),
    imageUploadNode: (pos) => ({
      id: uid('image'),
      type: 'imageUploadNode',
      position: pos,
      data: { label: '图片节点', src: '', alt: '图片' }
    }),
    imageGenNode: (pos) => ({
      id: uid('image'),
      type: 'imageGenNode',
      position: pos,
      data: { label: '图片节点', src: '', alt: '图片' }
    }),
    videoNode: (pos) => ({
      id: uid('video'),
      type: 'videoNode',
      position: pos,
      data: { label: '视频节点', src: '', poster: '' }
    }),
    videoUploadNode: (pos) => ({
      id: uid('video'),
      type: 'videoUploadNode',
      position: pos,
      data: { label: '视频节点', src: '', poster: '' }
    }),
    videoGenNode: (pos) => ({
      id: uid('video'),
      type: 'videoGenNode',
      position: pos,
      data: { label: '视频节点', src: '', poster: '' }
    }),
    shotListNode: (pos) => ({
      id: uid('shots'),
      type: 'shotListNode',
      position: pos,
      style: { width: '760px' },
      data: {
        label: '拉片',
        sourceNodeId: '',
        breakdownId: '',
        breakdownStage: 'idle',
        breakdownVersion: 0,
        shotsSummary: null
      }
    }),
    audioUploadNode: (pos) => ({
      id: uid('audio'),
      type: 'audioUploadNode',
      position: pos,
      data: { label: '音频节点', src: '', outputValue: '', fileName: '', duration: 0 }
    }),
    noteNode: (pos) => ({
      id: uid('note'),
      type: 'noteNode',
      position: pos,
      data: { content: '备注内容...', color: '#f5c542' }
    }),
    groupNode: (pos, w = 420, h = 280) => ({
      id: uid('group'),
      type: 'groupNode',
      position: pos,
      style: { width: `${w}px`, height: `${h}px` },
      data: { label: '分组' },
      zIndex: -1, // 分组节点渲染在子节点下层
      class: 'group-node-parent'
    })
  }

  /** 只构造节点对象，不写入 nodes.value */
  function createNode(type, position) {
    return nodeDefaults[type]?.(position) ?? null
  }

  /** 图片节点高度由内容撑开，拉伸时不要写死 style.height */
  const AUTO_HEIGHT_TYPES = new Set(['imageNode', 'imageUploadNode', 'imageGenNode'])

  function withNodeSize(node, dimensions) {
    const style = { ...(node.style || {}) }
    const size = { ...node.dimensions }
    for (const key of ['width', 'height']) {
      const value = dimensions[key]
      if (!Number.isFinite(value) || value <= 0) continue
      size[key] = value
      if (key !== 'height' || !AUTO_HEIGHT_TYPES.has(node.type)) style[key] = `${value}px`
    }
    return { ...node, dimensions: size, style }
  }

  /** 将 VueFlow 内部最新坐标合并进节点列表，避免受控模式 prop 回写重置拖拽位置 */
  function withLivePositions(liveNodes, list = nodes.value) {
    if (!liveNodes?.length) return list
    // Preserve find's first-match semantics while indexing the live snapshot once.
    const liveById = new Map()
    for (const live of liveNodes) {
      if (!liveById.has(live.id)) liveById.set(live.id, live)
    }
    return list.map((n) => {
      const live = liveById.get(n.id)
      if (!live || !canEditNode(n.id)) return n
      const next = { ...n, position: { x: live.position.x, y: live.position.y } }
      if (live.dimensions?.width || live.dimensions?.height) {
        next.dimensions = { ...n.dimensions, ...live.dimensions }
      }
      // 拉伸后把实测宽高写回 style，保证保存/重载同步
      const w = live.dimensions?.width
      const h = live.dimensions?.height
      if (w || h) {
        const style = { ...(n.style || {}) }
        if (w) style.width = `${w}px`
        if (h && !AUTO_HEIGHT_TYPES.has(n.type)) style.height = `${h}px`
        next.style = style
      }
      return next
    })
  }

  /** 图片节点渲染后同步实测尺寸，并去掉锁死的 style.height */
  function syncNodeDimensions(id, liveNodes) {
    if (!canEditNode(id)) return
    const live = resolveLiveNodes(liveNodes)
    const vf = live?.find((n) => n.id === id)
    if (!vf?.dimensions) return
    const cur = nodes.value.find((n) => n.id === id)
    if (!cur) return
    const w = vf.dimensions.width
    const h = vf.dimensions.height
    const sameSize = cur.dimensions?.width === w && cur.dimensions?.height === h
    const heightLocked =
      cur.style != null && Object.prototype.hasOwnProperty.call(cur.style, 'height')
    if (sameSize && !heightLocked) return
    nodes.value = nodes.value.map((n) => {
      if (n.id !== id) return n
      const style = n.style ? { ...n.style } : undefined
      if (style) delete style.height
      return {
        ...n,
        dimensions: { ...n.dimensions, ...vf.dimensions },
        style: style && Object.keys(style).length ? style : undefined
      }
    })
  }

  /** 拖拽/缩放结束后，把 VueFlow 内部坐标与尺寸写回 store */
  function syncLivePositions(liveNodes) {
    const live = resolveLiveNodes(liveNodes)
    if (!live?.length) return
    nodes.value = withLivePositions(live)
  }

  function registerPanelFlusher(fn) {
    _panelFlusher = fn
  }

  // ponytail: autosave 只跟操作走，不 deep-watch；content=输入防抖，op=增删连移立刻排程
  let _dirtyHandler = null
  function registerDirtyHandler(fn) {
    _dirtyHandler = fn
  }
  function markDirty(kind = 'op') {
    _dirtyHandler?.(kind)
  }

  const TRANSIENT_DATA_KEYS = new Set(['generating', 'breakdownStage'])
  const CONTENT_DATA_KEYS = new Set([
    'prompt',
    'content',
    'outputValue',
    'label',
    'settings',
    'assetWall',
    'color',
    'shotsSummary'
  ])

  function setActivePanelNode(id) {
    flushBeforePanelSwitch(activePanelNodeId.value, id, (prevId) => {
      _panelFlusher?.(prevId)
    })
    activePanelNodeId.value = id
  }

  function clearActivePanelNode() {
    flushBeforePanelSwitch(activePanelNodeId.value, null, (prevId) => {
      _panelFlusher?.(prevId)
    })
    activePanelNodeId.value = null
  }

  function getActivePanelNode() {
    if (!activePanelNodeId.value) return null
    return nodes.value.find((n) => n.id === activePanelNodeId.value) ?? null
  }

  /** 构造节点对象并追加到 nodes 数组；liveNodes 传 getNodes.value 可保留已拖拽坐标 */
  function addNodeOfType(type, position, liveNodes) {
    if (!canCreate()) return null
    const node = createNode(type, position)
    if (!node) return null
    nodes.value = [...withLivePositions(liveNodes), node]
    markDirty('op')
    return node
  }

  // ─── 节点数据更新 ─────────────────────────────────────────────────────
  /**
   * 更新指定节点的 data 字段，并将 outputValue/content 传播到下游边标签
   * liveNodes：VueFlow 内部节点快照（含最新拖拽坐标），异步操作后传入以避免位置重置
   */
  function updateNodeData(id, patch, liveNodes) {
    if (!canEditNode(id)) return
    writeNodeData(id, patch, liveNodes)
  }
  function updateNodeResult(id, patch, liveNodes) {
    if (!canEditNode(id)) return
    writeNodeData(id, patch, liveNodes)
  }
  function writeNodeData(id, patch, liveNodes) {
    const current = nodes.value.find((n) => n.id === id)
    if (
      current &&
      Object.keys(patch).every(
        (k) => JSON.stringify(current.data?.[k]) === JSON.stringify(patch[k])
      )
    )
      return
    const live = resolveLiveNodes(liveNodes)
    const base = live ? withLivePositions(live) : nodes.value
    const idx = base.findIndex((n) => n.id === id)
    if (idx === -1) return
    const updated = {
      ...base[idx],
      data: { ...base[idx].data, ...patch }
    }
    nodes.value = [...base.slice(0, idx), updated, ...base.slice(idx + 1)]
    // 数据流：当节点输出值变化时，同步更新其所有出边的标签（显示数据流向）
    if ('outputValue' in patch || 'content' in patch || 'src' in patch) {
      const val = patch.outputValue ?? patch.content ?? patch.src ?? ''
      edges.value = edges.value.map((e) =>
        e.source === id
          ? { ...e, label: val ? String(val).slice(0, 30) : '', data: { ...e.data, value: val } }
          : e
      )
      for (const e of edges.value) {
        if (e.source === id) refreshNodeAssetWall(e.target, edges.value, live)
      }
    }
    const keys = Object.keys(patch)
    if (!keys.length || keys.every((k) => TRANSIENT_DATA_KEYS.has(k))) return
    markDirty(keys.some((k) => CONTENT_DATA_KEYS.has(k)) ? 'content' : 'op')
  }

  /** 更新边的属性（如样式、标签） */
  function updateEdgeData(id, patch) {
    const edge = edges.value.find((e) => e.id === id)
    if (!edge || !allowNodes([edge.source, edge.target])) return
    edges.value = edges.value.map((e) => (e.id === id ? { ...e, ...patch } : e))
    markDirty('op')
  }

  function countNodesForRemoval(id) {
    const ids = collectRemovalIds([id])
    return nodes.value.filter((n) => ids.has(n.id)).length
  }

  function isLegacyVideoWithoutHistory(node) {
    if (!node?.type?.toLowerCase().includes('video')) return false
    const data = node.data || {}
    if (!data.src) return false
    if (data.settings?.mode === 'video') return false
    if (data.genTaskId || data.genRequestId || data.genAppliedTaskId) return false
    return true
  }

  function hasProtectedLegacyVideo(ids) {
    for (const id of ids) {
      const node = nodes.value.find((n) => n.id === id)
      if (isLegacyVideoWithoutHistory(node)) return true
    }
    return false
  }

  function warnProtectedLegacyVideo() {
    ElMessage.warning('无历史数据的老视频节点不支持删除，请保留该节点')
  }

  /** 所有删除入口共享递归清理，先验证整批变更再修改图。 */
  function removeNodes(nodeIds) {
    const ids = collectRemovalIds(nodeIds)
    if (hasProtectedLegacyVideo(ids)) {
      warnProtectedLegacyVideo()
      return
    }
    if (!nodes.value.some((n) => ids.has(n.id)) || !allowNodes(affectedByRemoval(nodeIds))) return
    const scrubMap = new Map()
    for (const edge of edges.value) {
      if (!ids.has(edge.source) || ids.has(edge.target)) continue
      const labels = scrubMap.get(edge.target) || []
      labels.push(...labelsForSourceTarget(edge.source, edge.target))
      scrubMap.set(edge.target, labels)
    }
    for (const [targetId, labels] of scrubMap) {
      if (activePanelNodeId.value === targetId) _panelFlusher?.(targetId)
      scrubPromptMentions(targetId, labels)
    }
    nodes.value = nodes.value.filter((n) => !ids.has(n.id))
    edges.value = edges.value.filter((e) => !ids.has(e.source) && !ids.has(e.target))
    if (ids.has(activePanelNodeId.value)) activePanelNodeId.value = null
    for (const targetId of scrubMap.keys()) refreshNodeAssetWall(targetId)
    markDirty('op')
  }

  function removeNodeById(id) {
    removeNodes([id])
  }

  function removeSelectedNodes() {
    removeNodes(selectedNodes.value.map((n) => n.id))
  }

  async function confirmRemoveNodeById(id) {
    const node = nodes.value.find((n) => n.id === id)
    if (isLegacyVideoWithoutHistory(node)) {
      warnProtectedLegacyVideo()
      return
    }
    if (node?.type === 'noteNode') {
      removeNodeById(id)
      return
    }
    if (!(await confirmRemoveNodes(countNodesForRemoval(id)))) return
    removeNodeById(id)
  }

  async function confirmRemoveSelectedNodes() {
    const selected = selectedNodes.value
    const ids = collectRemovalIds(selected.map((n) => n.id))
    if (hasProtectedLegacyVideo(ids)) {
      warnProtectedLegacyVideo()
      return
    }
    const count = nodes.value.filter((n) => ids.has(n.id)).length
    if (!count) return
    if (selected.every((n) => n.type === 'noteNode')) {
      removeSelectedNodes()
      return
    }
    if (!(await confirmRemoveNodes(count))) return
    removeSelectedNodes()
  }

  // ─── 边操作 ──────────────────────────────────────────────────────────
  /** 添加一条边，自动去重（同 source→target 不重复添加）*/
  function addEdge(edge) {
    if (!allowNodes([edge.source, edge.target])) return
    // 防止重复连线
    const exists = edges.value.find((e) => e.source === edge.source && e.target === edge.target)
    if (exists) return

    const sourceNode = nodes.value.find((n) => n.id === edge.source)
    const targetNode = nodes.value.find((n) => n.id === edge.target)
    const check = validateRefEdge({
      sourceType: sourceNode?.type,
      sourceId: edge.source,
      targetType: targetNode?.type,
      targetId: edge.target,
      nodes: nodes.value,
      edges: edges.value,
      edgeRole: edge.data?.role
    })
    if (!check.ok) {
      if (check.reason) ElMessage.warning(check.reason)
      return
    }

    edges.value = [
      ...edges.value,
      {
        ...edge,
        animated: true,
        type: 'default',
        data: { value: null, ...edge.data }
      }
    ]
    applyAssetWallInherit(edge.source, edge.target)
    markDirty('op')
  }

  function applyAssetWallInherit(sourceId, targetId) {
    refreshNodeAssetWall(targetId)
  }

  // ─── 快速创建下一连接节点 ─────────────────────────────────────────────
  /**
   * 在 sourceId 节点右侧创建新节点并自动连边
   * currentPositions：当前节点位置快照（key: nodeId, value: position），
   * 防止更新 nodes 数组时丢失已拖拽节点的位置
   */
  function addConnectedNode(sourceId, newType, position, currentPositions) {
    if (!canCreate() || !allowNodes([sourceId])) return
    const factory = nodeDefaults[newType]
    if (!factory) return

    let newPos = position
    if (!newPos) {
      // 没有指定位置时，自动放置在源节点右侧（宽度 + 80px 间距）
      const source = nodes.value.find((n) => n.id === sourceId)
      if (!source) return
      newPos = {
        x: source.position.x + (NODE_WIDTHS[source.type] ?? 220) + 80,
        y: source.position.y
      }
    }

    const newNode = factory(newPos)
    const base = currentPositions
      ? nodes.value.map((n) =>
          currentPositions[n.id] ? { ...n, position: currentPositions[n.id] } : n
        )
      : nodes.value
    nodes.value = [...base, newNode]

    // 自动连接源节点右侧 handle 到新节点左侧 handle
    addEdge({
      id: `edge-${sourceId}-${newNode.id}-${Date.now()}`,
      source: sourceId,
      sourceHandle: 'sr', // source right
      target: newNode.id,
      targetHandle: 'tl' // target left
    })
  }

  // ─── 节点分组 / 取消分组 ─────────────────────────────────────────────
  /** 将选中的节点（>=2个，非 groupNode 且未被分组）包裹进一个新 groupNode */
  function groupSelectedNodes() {
    if (!canCreate() || !allowNodes(selectedNodes.value.map((n) => n.id))) return
    // 只对顶层非分组节点操作
    const sel = selectedNodes.value.filter((n) => n.type !== 'groupNode' && !n.parentNode)
    if (sel.length < 2) return

    const PAD = 30 // 分组容器的内边距
    // 计算选中节点的包围盒
    const minX = Math.min(...sel.map((n) => n.position.x)) - PAD
    const minY = Math.min(...sel.map((n) => n.position.y)) - PAD - 24 // 额外 24px 留给标题头部
    const maxX = Math.max(...sel.map((n) => n.position.x + (n.dimensions?.width || 220))) + PAD
    const maxY = Math.max(...sel.map((n) => n.position.y + (n.dimensions?.height || 120))) + PAD

    const gid = uid('group')
    const groupNode = {
      id: gid,
      type: 'groupNode',
      position: { x: minX, y: minY },
      style: { width: `${maxX - minX}px`, height: `${maxY - minY}px` },
      data: { label: '分组' },
      zIndex: -1, // 分组节点置于子节点底层
      class: 'group-node-parent',
      selected: false
    }

    const selIds = new Set(sel.map((n) => n.id))
    nodes.value = [
      groupNode, // 先插入 groupNode 确保子节点能找到 parentNode
      ...nodes.value.map((n) => {
        if (!selIds.has(n.id)) return n
        return {
          ...n,
          parentNode: gid, // 设置父节点
          extent: 'parent', // 限制拖拽范围在父容器内
          // 将坐标转换为相对于 groupNode 的局部坐标
          position: { x: n.position.x - minX, y: n.position.y - minY },
          selected: false
        }
      })
    ]
    markDirty('op')
  }

  /** 解散分组：删除 groupNode，子节点转换为局部坐标回到全局坐标 */
  function ungroupNodes(groupId) {
    if (
      !allowNodes(
        nodes.value.filter((n) => n.id === groupId || n.parentNode === groupId).map((n) => n.id)
      )
    )
      return
    const group = nodes.value.find((n) => n.id === groupId)
    if (!group) return
    nodes.value = nodes.value
      .filter((n) => n.id !== groupId) // 移除 groupNode
      .map((n) => {
        if (n.parentNode !== groupId) return n
        return {
          ...n,
          parentNode: undefined, // 脱离父节点
          extent: undefined, // 解除范围限制
          // 将局部坐标转换回全局坐标
          position: {
            x: n.position.x + group.position.x,
            y: n.position.y + group.position.y
          }
        }
      })
    markDirty('op')
  }

  // ─── 节点类型切换（原地替换，保留位置）────────────────────────────────
  /** 将指定节点的类型改为 newType，尽量保留旧节点的内容数据 */
  function changeNodeType(id, newType, livePosition) {
    if (!allowNodes([id])) return
    const idx = nodes.value.findIndex((n) => n.id === id)
    if (idx === -1) return

    const n = nodes.value[idx]
    // 从旧数据中提取可复用的字段
    const { content = '', src = '', outputValue = '' } = n.data
    const label = TYPE_LABELS[newType] ?? '节点'

    // 根据新类型构造对应的 data 结构
    let newData
    switch (newType) {
      case 'textNode':
        // 文本节点优先使用旧 content，其次是 src（如从图片切换过来）
        newData = { label, content: content || src || '双击编辑内容...', outputValue }
        break
      case 'imageNode':
      case 'imageUploadNode':
      case 'imageGenNode':
        newData = { label, src, alt: '图片' }
        break
      case 'videoNode':
      case 'videoUploadNode':
      case 'videoGenNode':
        newData = { label, src, poster: '' }
        break
      case 'audioUploadNode':
        newData = { label, src, outputValue: src || outputValue, fileName: '', duration: 0 }
        break
      case 'noteNode':
        newData = { content: content || label, color: '#f5c542' }
        break
      default:
        newData = n.data // 未知类型保留原始 data
    }

    // 优先使用 livePosition（VueFlow 最新坐标），避免坐标回退
    const position = livePosition ?? n.position
    // 原地替换节点（保持数组顺序稳定，避免 z-index 变化）
    nodes.value = [
      ...nodes.value.slice(0, idx),
      { ...n, type: newType, data: newData, position },
      ...nodes.value.slice(idx + 1)
    ]
    markDirty('op')
  }

  // ─── 上游上下文收集（数据流分析）────────────────────────────────────────
  /**
   * 收集当前节点的上游参考上下文（用于 AI 生成的 context 参数）
   * - 直连节点（1 跳）：无论该节点 scope 为何，均纳入
   * - 间接节点（>1 跳）：仅当该节点 scope === 'global' 时纳入，并继续向上遍历
   * 返回 [{ nodeId, label, content, scope }]
   */
  function getUpstreamContext(nodeId) {
    const allEdges = edges.value
    // 构建 id → node 的快速查找表
    const nodesById = {}
    for (const n of nodes.value) nodesById[n.id] = n

    const result = []
    const visited = new Set() // 防止环形边导致无限递归

    function traverse(id, isDirect) {
      for (const edge of allEdges) {
        if (edge.target !== id) continue // 只关注以当前节点为目标的边
        const srcId = edge.source
        if (visited.has(srcId)) continue // 避免重复访问
        visited.add(srcId)

        const src = nodesById[srcId]
        if (!src) continue

        const scope = src.data?.scope ?? 'direct'
        const content = src.data?.outputValue || src.data?.content || ''

        if (isDirect) {
          // 直连节点：有内容就纳入
          if (content)
            result.push({ nodeId: srcId, label: src.data?.label || src.type, content, scope })
          // 直连节点若是 global scope，继续向上收集（透传上下文）
          if (scope === 'global') traverse(srcId, false)
        } else if (scope === 'global') {
          // 间接节点：只有 global scope 才纳入并继续向上
          if (content)
            result.push({ nodeId: srcId, label: src.data?.label || src.type, content, scope })
          traverse(srcId, false)
        }
      }
    }

    traverse(nodeId, true)
    return result
  }

  // ─── 画布加载 / 快照 ──────────────────────────────────────────────────
  // 图片/视频节点的出边不显示 label（避免干扰 URL 显示）
  const NO_LABEL_TYPES = new Set([
    'imageNode',
    'imageUploadNode',
    'imageGenNode',
    'videoNode',
    'videoUploadNode',
    'videoGenNode',
    'audioUploadNode'
  ])

  /** 从保存的项目数据还原画布，返回 viewport 供编辑器恢复视角 */
  function loadCanvas(canvasData) {
    if (!canvasData) return null
    const { nodes: loadedNodes, edges: loadedEdges, viewport } = parseGraphDocument(canvasData)
    const nodeTypeMap = Object.fromEntries(loadedNodes.map((n) => [n.id, n.type]))
    nodes.value = loadedNodes.map(normalizeAutoHeightNode)
    edges.value = (loadedEdges ?? []).map((e) => {
      const normalized = {
        ...e,
        sourceHandle: e.sourceHandle || 'sr',
        targetHandle: e.targetHandle || 'tl',
        label: NO_LABEL_TYPES.has(nodeTypeMap[e.source]) ? '' : e.label
      }
      if (normalized.style?.stroke) {
        const { stroke, ...restStyle } = normalized.style
        normalized.style = Object.keys(restStyle).length ? restStyle : undefined
      }
      if (normalized.markerEnd?.color) {
        normalized.markerEnd = { ...normalized.markerEnd, color: undefined }
      }
      // Vue Flow 内置贝塞尔边是 `default`，`bezier` 会 EDGE_TYPE_MISSING 刷屏
      if (normalized.type === 'bezier') normalized.type = 'default'
      return normalized
    })
    return { viewport }
  }

  /** 获取当前画布快照（用于保存到服务端） */
  function getCanvasSnapshot() {
    return { nodes: nodes.value, edges: edges.value }
  }

  /** 重置为空画布（新建项目或切换项目时使用） */
  function resetCanvas() {
    nodes.value = []
    edges.value = []
  }

  // ─── 对外暴露 ─────────────────────────────────────────────────────────
  return {
    configureEditPolicy,
    canEditNode,
    nodes,
    edges,
    isDragging,
    activePanelNodeId,
    setActivePanelNode,
    clearActivePanelNode,
    registerPanelFlusher,
    registerDirtyHandler,
    getActivePanelNode,
    registerLiveNodesGetter,
    syncLivePositions,
    syncNodeDimensions,
    snapEnabled,
    gridSize,
    showGrid,
    selectedNodes,
    selectedEdges,
    handleNodesChange,
    handleEdgesChange,
    createNode,
    addNodeOfType,
    updateNodeData,
    updateNodeResult,
    updateEdgeData,
    removeNodeById,
    removeSelectedNodes,
    confirmRemoveNodeById,
    confirmRemoveSelectedNodes,
    addEdge,
    addConnectedNode,
    groupSelectedNodes,
    ungroupNodes,
    changeNodeType,
    getUpstreamContext,
    loadCanvas,
    getCanvasSnapshot,
    resetCanvas
  }
})
