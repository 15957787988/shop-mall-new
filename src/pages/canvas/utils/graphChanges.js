import { graphNodeToVueNode, graphEdgeToVueEdge } from './graphAdapter.js'
export function readGraph(input) {
  return typeof input === 'string' ? JSON.parse(input || '{}') : input || { nodes: [], edges: [] }
}
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable(value[k])])
    )
  return value
}
const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b))
export function hasGraphChanges(base, graph) {
  return !equal(readGraph(base), readGraph(graph))
}
// Apply changes from the rendered graph only. Default fields added by the view
// adapter must not turn every untouched server node into an apparent edit.
export function applyGraphDelta(baseInput, localInput, sourceInput) {
  let base = readGraph(baseInput),
    local = readGraph(localInput)
  const source = readGraph(sourceInput)
  // Keep old VueFlow documents in their original format; migrating untouched nodes
  // must not rewrite unrelated legacy node metadata during an ordinary save.
  if ((source.nodes || []).some((n) => n.position != null && n.type)) {
    const legacy = (doc) => ({
      ...doc,
      nodes: (doc.nodes || []).map((n) =>
        n.position != null && n.type
          ? n
          : { ...graphNodeToVueNode(n), dimensions: { width: n.width, height: n.height } }
      ),
      edges: (doc.edges || []).map((e) => (e.source != null ? e : graphEdgeToVueEdge(e)))
    })
    base = legacy(base)
    local = legacy(local)
  }
  function patch(b, l, r) {
    if (equal(b, l)) return clone(r)
    if (
      b &&
      l &&
      !Array.isArray(b) &&
      !Array.isArray(l) &&
      typeof b === 'object' &&
      typeof l === 'object'
    ) {
      const out = clone(r || {})
      for (const k of new Set([...Object.keys(b), ...Object.keys(l)])) {
        if (!equal(b[k], l[k])) {
          const value = patch(b[k], l[k], r?.[k])
          if (value === undefined) delete out[k]
          else out[k] = value
        }
      }
      return out
    }
    return clone(l)
  }
  const out = patch(base, local, source)
  for (const key of ['nodes', 'edges', 'groups']) {
    // Unchanged collections keep their original shape, including legacy entries
    // whose metadata does not use the current ID-based representation.
    if (equal(base[key], local[key])) continue
    if (!(key in base) && !(key in local)) continue
    const b = new Map((base[key] || []).map((n) => [n.id, n]))
    const l = new Map((local[key] || []).map((n) => [n.id, n]))
    const r = new Map((source[key] || []).map((n) => [n.id, n]))
    out[key] = [...new Set([...r.keys(), ...l.keys()])]
      .map((id) => {
        if (b.has(id) && !l.has(id)) return null
        if (!b.has(id) && l.has(id)) return clone(l.get(id))
        return patch(b.get(id), l.get(id), r.get(id))
      })
      .filter(Boolean)
  }
  return out
}
