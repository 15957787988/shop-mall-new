/** 资产墙序列化 / 连线继承 — 节点 data.assetWall */

function getNodeKind(type) {
  if (!type) return null
  if (type.includes('image')) return 'image'
  if (type.includes('video')) return 'video'
  if (type.includes('audio')) return 'audio'
  if (type === 'textNode') return 'text'
  return null
}

export function buildNodeAssetEntry(node) {
  if (!node) return null
  const kind = getNodeKind(node.type)
  if (!kind) return null

  if (kind === 'text') {
    const content = node.data?.content || node.data?.outputValue
    if (!content) return null
    return {
      nodeId: node.id,
      label: node.data?.label || '文本',
      thumb: '',
      kind: 'text',
      source: 'node',
    }
  }

  const thumb = node.data?.src || node.data?.poster || ''
  const prefix = kind === 'image' ? '图片' : kind === 'video' ? '视频' : '音频'
  return {
    nodeId: node.id,
    label: node.data?.label || prefix,
    thumb,
    kind,
    source: 'node',
  }
}

/** 直连上游节点 → 资产条目（仅 immediate source 的生成结果） */
export function collectDirectUpstreamAssets(nodeId, nodes, edges) {
  const result = []
  const seen = new Set()
  let imageNum = 0
  let videoNum = 0
  let audioNum = 0
  for (const e of edges) {
    if (e.target !== nodeId) continue
    // 生成产出边：结果节点不继承源节点提示词/资产墙
    if (e.data?.role === 'generation-output') continue
    const src = nodes.find((n) => n.id === e.source)
    const entry = buildNodeAssetEntry(src)
    if (!entry || seen.has(entry.nodeId)) continue
    if (entry.kind !== 'text' && !entry.thumb) continue
    seen.add(entry.nodeId)
    if (entry.kind === 'image') {
      imageNum += 1
      entry.label = `图片${imageNum}`
    } else if (entry.kind === 'video') {
      videoNum += 1
      entry.label = `视频${videoNum}`
    } else if (entry.kind === 'audio') {
      audioNum += 1
      entry.label = `音频${audioNum}`
    }
    result.push(entry)
  }
  return result
}

function wallKey(item) {
  if (item.source === 'upload') return `upload:${item.id}`
  return `node:${item.nodeId}`
}

/** 合并多份资产墙，后者不覆盖前者同 key */
export function mergeAssetWalls(...walls) {
  const map = new Map()
  for (const wall of walls) {
    for (const item of wall || []) {
      const key = wallKey(item)
      if (!map.has(key)) map.set(key, { ...item })
    }
  }
  return [...map.values()]
}

/** 从单个源节点收集可传递的资产（自身 + 直连上游 + 本地上传） */
export function collectAssetsFromSource(sourceId, nodes, edges) {
  const source = nodes.find((n) => n.id === sourceId)
  if (!source) return []

  let wall = collectDirectUpstreamAssets(source.id, nodes, edges)
  const sourceSelf = buildNodeAssetEntry(source)
  if (sourceSelf?.thumb || sourceSelf?.kind === 'text') {
    wall = mergeAssetWalls(wall, [sourceSelf])
  }
  const uploads = (source.data?.assetWall || []).filter((i) => i.source === 'upload')
  return mergeAssetWalls(wall, uploads)
}

/** 根据当前入边重算目标节点资产墙（仅直连上游输出） */
export function recomputeAssetWallFromEdges(nodeId, nodes, edges) {
  return collectDirectUpstreamAssets(nodeId, nodes, edges)
}

/**
 * Prompt @mention labels for source→target.
 * Prefer wall numbering (`图片1`) over node.data.label (`图片节点`).
 */
export function wallMentionLabels(sourceId, targetId, nodes, edges) {
  const labels = []
  const fromWall = collectDirectUpstreamAssets(targetId, nodes, edges).find(
    (a) => a.nodeId === sourceId,
  )?.label
  if (fromWall) labels.push(fromWall)

  const target = (nodes || []).find((n) => n.id === targetId)
  for (const item of target?.data?.assetWall || []) {
    if (item.nodeId === sourceId || item.linkedNodeId === sourceId) {
      if (item.label) labels.push(String(item.label))
    }
  }
  return [...new Set(labels.filter(Boolean))]
}

/** 解析节点面板应展示的资产墙 */
export function resolveAssetWallForNode(node, nodes, edges) {
  if (!node) return []
  const fromEdges = recomputeAssetWallFromEdges(node.id, nodes, edges)
  const localOnly = (node.data?.assetWall || []).filter(
    (item) => item.source === 'upload',
  )
  return mergeAssetWalls(fromEdges, localOnly)
}

/** 连线 source → target 时，把源资产墙 + 源节点自身并入目标 */
export function buildInheritedAssetWall(sourceId, targetId, nodes, edges) {
  const target = nodes.find((n) => n.id === targetId)
  if (!target) return null

  const fromEdges = recomputeAssetWallFromEdges(targetId, nodes, edges)
  const localOnly = (target.data?.assetWall || []).filter(
    (item) => item.source === 'upload',
  )
  return mergeAssetWalls(fromEdges, localOnly)
}

/** 断开后从目标节点移除某源节点贡献 */
export function stripAssetWallFromSource(targetId, sourceId, nodes, edges) {
  const remaining = edges.filter((e) => e.target === targetId)
  let wall = []
  for (const e of remaining) {
    wall = mergeAssetWalls(wall, collectAssetsFromSource(e.source, nodes, edges))
  }
  const localOnly = (nodes.find((n) => n.id === targetId)?.data?.assetWall || []).filter(
    (item) => item.source === 'upload',
  )
  return mergeAssetWalls(wall, localOnly)
}

/** 面板快照 → 存入 node.data.assetWall */
export function snapshotAssetWall(nodeAssets, uploadedAssets) {
  const nodeItems = (nodeAssets || []).map((a) => ({
    nodeId: a.nodeId,
    label: a.label,
    thumb: a.thumb || '',
    kind: a.kind,
    source: 'node',
  }))
  const uploadItems = (uploadedAssets || [])
    .filter((a) => !a.uploading && a.url)
    .map((a) => ({
      id: a.id,
      label: a.label,
      url: a.url,
      thumb: a.thumb || a.url,
      kind: a.kind,
      source: 'upload',
      linkedNodeId: a.linkedNodeId || null,
    }))
  return [...nodeItems, ...uploadItems]
}

export function splitAssetWall(wall) {
  const nodeAssets = []
  const uploads = []
  for (const item of wall || []) {
    if (item.source === 'upload') uploads.push({ ...item })
    else if (item.nodeId) {
      nodeAssets.push({
        nodeId: item.nodeId,
        label: item.label,
        thumb: item.thumb || item.url || '',
        kind: item.kind,
      })
    }
  }
  return { nodeAssets, uploads }
}
