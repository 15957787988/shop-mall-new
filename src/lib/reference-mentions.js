/** 素材变化时按 URL 保持引用身份，删除失效引用，并同步后续编号。 */
export function remapReferenceMentions(text, previous, current) {
  const previousByLabel = new Map(previous.map((item) => [item.label, item]))
  return text.replace(/@(图片|视频|音频)\d+/g, (token) => {
    const old = previousByLabel.get(token.slice(1))
    if (!old) return token
    const next = current.find((item) => item.kind === old.kind && item.url === old.url)
    return next ? `@${next.label}` : ''
  })
}
