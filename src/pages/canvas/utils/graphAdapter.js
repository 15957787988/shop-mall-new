// ponytail: VueFlow ↔ API graph 双向转换，后续接真实后端只换 projectStore 请求层
import { videoWaitState } from './videoTaskWait.js'

const SCHEMA_VERSION = 5

const TYPE_TO_KIND = {
  textNode: 'text',
  imageNode: 'image',
  imageUploadNode: 'image',
  imageGenNode: 'image',
  videoNode: 'video',
  videoUploadNode: 'video',
  videoGenNode: 'video',
  audioUploadNode: 'audio',
  noteNode: 'note',
  groupNode: 'group',
  shotListNode: 'breakdown',
}

const DEFAULT_DIMS = {
  textNode: { width: 220, height: 120 },
  imageNode: { width: 244, height: 262 },
  imageUploadNode: { width: 244, height: 262 },
  imageGenNode: { width: 244, height: 262 },
  videoNode: { width: 244, height: 157 },
  videoUploadNode: { width: 244, height: 157 },
  videoGenNode: { width: 244, height: 157 },
  audioUploadNode: { width: 280, height: 140 },
  noteNode: { width: 180, height: 120 },
  groupNode: { width: 420, height: 280 },
  shotListNode: { width: 760, height: 420 },
}

/** 高度由内容撑开，不锁 style.height */
export const AUTO_HEIGHT_NODE_TYPES = new Set(['imageNode', 'imageUploadNode', 'imageGenNode', 'shotListNode'])

/** 空态/占位时 header + placeholder 的近似高度，仅作保存 fallback */
const IMAGE_EMPTY_HEIGHT = 152

export function normalizeAutoHeightNode(node) {
  if (!node?.type || !AUTO_HEIGHT_NODE_TYPES.has(node.type)) return node
  const style = node.style ? { ...node.style } : undefined
  if (style) delete style.height
  return {
    ...node,
    style: style && Object.keys(style).length ? style : undefined,
  }
}

function nodeSize(node) {
  const w = parseFloat(node.style?.width) || node.dimensions?.width || DEFAULT_DIMS[node.type]?.width || 220
  if (AUTO_HEIGHT_NODE_TYPES.has(node.type)) {
    return { width: w, height: node.dimensions?.height || IMAGE_EMPTY_HEIGHT }
  }
  const h = parseFloat(node.style?.height) || node.dimensions?.height || DEFAULT_DIMS[node.type]?.height || 120
  return { width: w, height: h }
}

function kindToVueType(kind, meta = {}) {
  if (kind === 'breakdown') return 'shotListNode'
  if (kind === 'text') return 'textNode'
  if (kind === 'note') return 'noteNode'
  if (kind === 'group') return 'groupNode'
  if (kind === 'image') {
    if (meta.nodeRole === 'gen') return 'imageGenNode'
    if (meta.nodeRole === 'upload') return 'imageUploadNode'
    return meta.prompt || meta.settings?.params ? 'imageGenNode' : 'imageUploadNode'
  }
  if (kind === 'video') {
    if (meta.nodeRole === 'gen') return 'videoGenNode'
    if (meta.nodeRole === 'upload') return 'videoUploadNode'
    return meta.prompt || meta.settings?.params ? 'videoGenNode' : 'videoUploadNode'
  }
  if (kind === 'audio') return 'audioUploadNode'
  return 'textNode'
}

function vueNodeRole(type) {
  if (type === 'imageGenNode' || type === 'videoGenNode' || type === 'imageNode' || type === 'videoNode') return 'gen'
  if (type === 'imageUploadNode' || type === 'videoUploadNode' || type === 'audioUploadNode') return 'upload'
  return undefined
}

export function vueNodeToGraphNode(node) {
  const { width, height } = nodeSize(node)
  const meta = {
    content: node.data?.content ?? '',
    prompt: node.data?.prompt ?? '',
    mediaUrl: node.data?.src || node.data?.mediaUrl || '',
    ...(node.data?.poster ? { poster: node.data.poster } : {}),
    objectFit: node.data?.objectFit || 'contain',
    imageTone: node.data?.imageTone || 'soft',
    settings: node.data?.settings || {},
    dimensions: node.data?.dimensions || '',
    assetWall: node.data?.assetWall || [],
    nodeRole: vueNodeRole(node.type),
    fileName: node.data?.fileName || '',
    fromFrame: !!node.data?.fromFrame,
    costPoints: Number(node.data?.costPoints) || 0,
    genTaskId: node.data?.genTaskId || '',
    genTaskKind: node.data?.genTaskKind || '',
    genRequestId: node.data?.genRequestId || '',
    genRequestedAt: node.data?.genRequestedAt || 0,
    genWaitTimedOut: !!node.data?.genWaitTimedOut,
    genAppliedTaskId: node.data?.genAppliedTaskId || '',
    genTaskState: node.data?.genTaskState ?? null,
    genError: node.data?.genError || '',
    duration: Number(node.data?.duration) || 0,
    color: node.data?.color || '',
    scope: node.data?.scope || '',
    sourceNodeId: node.data?.sourceNodeId || '',
    breakdownId: node.data?.breakdownId || '',
    breakdownVersion: Number(node.data?.breakdownVersion) || 0,
    shotsSummary: node.data?.shotsSummary || null,
  }
  return {
    id: node.id,
    kind: TYPE_TO_KIND[node.type] || 'text',
    title: node.data?.label || '节点',
    x: node.position?.x ?? 0,
    y: node.position?.y ?? 0,
    width,
    height,
    ...(node.parentNode ? { parentNode: node.parentNode, ...(node.extent != null ? { extent: node.extent } : {}) } : {}),
    meta,
  }
}

export function graphNodeToVueNode(gNode) {
  const meta = gNode.meta || {}
  const type = kindToVueType(gNode.kind, meta)
  const videoWait = meta.genTaskId && meta.genTaskKind === 'video' ? videoWaitState(meta) : null
  const width = gNode.width ?? DEFAULT_DIMS[type]?.width ?? 220
  const style = { width: `${width}px` }
  if (!AUTO_HEIGHT_NODE_TYPES.has(type)) {
    style.height = `${gNode.height ?? DEFAULT_DIMS[type]?.height ?? 120}px`
  }
  return {
    id: gNode.id,
    type,
    position: { x: gNode.x ?? 0, y: gNode.y ?? 0 },
    ...(gNode.parentNode ? { parentNode: gNode.parentNode, ...(gNode.extent != null ? { extent: gNode.extent } : {}) } : {}),
    ...(type === 'groupNode' ? { zIndex: -1, class: 'group-node-parent' } : {}),
    style,
    // Preserve the measured auto-height hint without locking the rendered height.
    ...(AUTO_HEIGHT_NODE_TYPES.has(type) ? { dimensions: { width, height: gNode.height ?? IMAGE_EMPTY_HEIGHT } } : {}),
    data: {
      label: gNode.title || '节点',
      content: meta.content ?? '',
      prompt: meta.prompt ?? '',
      src: meta.mediaUrl ?? '',
      ...(meta.poster ? { poster: meta.poster } : {}),
      outputValue: meta.mediaUrl || meta.content || '',
      objectFit: meta.objectFit,
      imageTone: meta.imageTone,
      settings: meta.settings || {},
      dimensions: meta.dimensions,
      assetWall: meta.assetWall || [],
      fileName: meta.fileName || '',
      fromFrame: !!meta.fromFrame,
      costPoints: Number(meta.costPoints) || 0,
      genTaskId: meta.genTaskId || '',
      genTaskKind: meta.genTaskKind || '',
      genRequestId: meta.genRequestId || '',
      genRequestedAt: meta.genRequestedAt || 0,
      genWaitTimedOut: !!meta.genWaitTimedOut,
      genAppliedTaskId: meta.genAppliedTaskId || '',
      genTaskState: meta.genTaskState ?? null,
      genError: meta.genError || '',
      generating: !!(meta.genTaskId || meta.genRequestId) && !meta.genWaitTimedOut,
      ...(videoWait?.genWaitTimedOut ? videoWait : {}),
      duration: Number(meta.duration) || 0,
      color: meta.color || (gNode.kind === 'note' ? '#f5c542' : undefined),
      scope: meta.scope || undefined,
      sourceNodeId: meta.sourceNodeId || '',
      breakdownId: meta.breakdownId || '',
      breakdownStage: meta.breakdownId ? 'queued' : 'idle',
      breakdownVersion: Number(meta.breakdownVersion) || 0,
      shotsSummary: meta.shotsSummary || null,
    },
  }
}

export function vueEdgeToGraphEdge(edge) {
  const out = { id: edge.id, from: edge.source, to: edge.target }
  if (edge.data?.order != null) out.order = edge.data.order
  return out
}

export function graphEdgeToVueEdge(edge) {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: 'sr',
    targetHandle: 'tl',
    animated: true,
    type: 'default',
    style: { stroke: '#00d4c8', strokeWidth: 1.5 },
    data: { order: edge.order ?? null, value: null },
  }
}

export function buildGraphDocument({ title, nodes, edges, viewport }) {
  return {
    title: title || '未命名项目',
    nodes: (nodes || []).map(vueNodeToGraphNode),
    edges: (edges || []).map(vueEdgeToGraphEdge),
    groups: [],
    stickers: [],
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
    schemaVersion: SCHEMA_VERSION,
  }
}

export function stringifyGraph(doc) {
  return JSON.stringify(doc)
}

/** 解析 graph 字符串 / API graph 对象 / 旧版 { nodes, edges } VueFlow 快照 */
export function parseGraphDocument(input) {
  if (!input) return { nodes: [], edges: [], viewport: null }

  let doc = input
  if (typeof doc === 'string') {
    try { doc = JSON.parse(doc) } catch { return { nodes: [], edges: [], viewport: null } }
  }

  // 旧版本地格式：节点带 position + type
  if (doc.nodes?.length && doc.nodes[0]?.position != null) {
    return {
      nodes: doc.nodes.map((raw) => {
        const node = normalizeAutoHeightNode(raw)
        if (node.type?.toLowerCase().includes('video') && node.data?.generating &&
            !node.data.genTaskId && !node.data.genRequestId) {
          // A reload cannot resume a transient callback with no persisted task identity.
          return { ...node, data: { ...node.data, generating: false,
            genError: node.data.genError || '未找到可恢复的视频任务，当前媒体已保留，请查看生成记录' } }
        }
        return node
      }),
      edges: doc.edges ?? [],
      viewport: doc.viewport ?? null,
    }
  }

  return {
    nodes: (doc.nodes ?? []).map(graphNodeToVueNode),
    edges: (doc.edges ?? []).map(graphEdgeToVueEdge),
    viewport: doc.viewport ?? null,
    title: doc.title,
  }
}

export function extractCoverFromGraph(graphDoc) {
  const doc = typeof graphDoc === 'string' ? JSON.parse(graphDoc) : graphDoc
  for (const n of doc.nodes ?? []) {
    const url = n.meta?.mediaUrl
    if (url && /\.(webp|png|jpe?g|gif)/i.test(url)) return url
  }
  return null
}
