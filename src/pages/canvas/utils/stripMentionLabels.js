function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Remove `@label` tokens (optional trailing space) from prompt. Longest label first. */
export function stripMentionLabels(prompt, labels) {
  let result = prompt == null ? '' : String(prompt)
  const uniq = [...new Set((labels || []).filter(Boolean).map(String))]
  uniq.sort((a, b) => b.length - a.length)
  for (const label of uniq) {
    result = result.replace(new RegExp(`@${escapeRegExp(label)} ?`, 'g'), '')
  }
  return result
}

/** Mention token label — matches AIPanel asset wall (`data.label` or kind fallback). */
export function mentionLabelFromNode(node) {
  if (!node) return ''
  const labeled = node.data?.label
  if (labeled) return String(labeled)
  const t = node.type || ''
  if (t.includes('image')) return '图片'
  if (t.includes('video')) return '视频'
  if (t.includes('audio')) return '音频'
  if (t === 'textNode') return '文本'
  return ''
}
