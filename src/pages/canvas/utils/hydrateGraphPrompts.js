import builtInPrompts from './BuiltInPrompts.json'

/** @type {Map<string, string>|null} */
let _promptById = null

function getPromptMap() {
  if (_promptById) return _promptById
  const map = new Map()
  const groups = builtInPrompts?.functions || {}
  for (const list of Object.values(groups)) {
    if (!Array.isArray(list)) continue
    for (const fn of list) {
      if (fn?.id && typeof fn.prompt === 'string') map.set(fn.id, fn.prompt)
    }
  }
  _promptById = map
  return map
}

/**
 * Clone 后补齐节点 prompt：读 meta.settings.functionId → BuiltInPrompts。
 * 查到则覆盖 meta.prompt（空/非空都写）；查不到则跳过。
 * @param {object|string|null} graph
 * @returns {object|string|null}
 */
export function hydrateGraphPrompts(graph) {
  if (graph == null) return graph

  const asString = typeof graph === 'string'
  let doc = graph
  if (asString) {
    try {
      doc = JSON.parse(graph)
    } catch {
      return graph
    }
  }

  const nodes = doc?.nodes
  if (!Array.isArray(nodes) || nodes.length === 0) return graph

  const map = getPromptMap()
  for (const node of nodes) {
    const functionId = node?.meta?.settings?.functionId
    if (!functionId) continue
    const prompt = map.get(functionId)
    if (prompt == null) continue
    if (!node.meta) node.meta = {}
    node.meta.prompt = prompt
  }

  return asString ? JSON.stringify(doc) : doc
}
