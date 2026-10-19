/**
 * 把资产墙里的文本内容并入最终提示词。
 * - 若 prompt 含 `@标签`，替换为对应文本节点 content
 * - 未 @ 的文本资产追加到末尾（已包含则跳过）
 */
export function buildGenerationPrompt(prompt, assets, nodes) {
  let result = (prompt || '').trim()
  const pending = []

  for (const asset of assets || []) {
    if (asset.uploading || asset.kind !== 'text') continue
    const node = nodes?.find((n) => n.id === asset.nodeId)
    const content = (node?.data?.content || node?.data?.outputValue || '').trim()
    if (!content) continue

    const token = `@${asset.label}`
    if (result.includes(token)) {
      result = result.split(token).join(content)
    } else if (!result.includes(content)) {
      pending.push(content)
    }
  }

  if (pending.length) {
    result = [result, ...pending].filter(Boolean).join('\n\n')
  }
  return result.trim()
}
