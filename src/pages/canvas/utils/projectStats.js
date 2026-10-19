export function computeProjectStats(graphOrDoc) {
  let doc = graphOrDoc
  if (!doc) return { nodeCount: 0, estimatedPoints: 0 }
  if (typeof doc === 'string') {
    try { doc = JSON.parse(doc) } catch { return { nodeCount: 0, estimatedPoints: 0 } }
  }
  const nodes = doc.nodes ?? []
  let estimatedPoints = 0
  for (const n of nodes) {
    const v = Number(n.meta?.costPoints ?? n.data?.costPoints ?? 0)
    if (Number.isFinite(v)) estimatedPoints += v
  }
  estimatedPoints = Math.round(estimatedPoints * 100) / 100
  return { nodeCount: nodes.length, estimatedPoints }
}
