const DEFAULT_GEN_LABELS = {
  image: '图片节点',
  video: '视频节点',
  text: '文本节点'
}

export function defaultGenLabel(mode) {
  return DEFAULT_GEN_LABELS[mode] || '节点'
}

/** 成功或重试开始时，去掉 label 里的失败后缀 */
export function clearGenFailLabel(mode, label) {
  if (!/（失败）/.test(label || '')) return null
  return defaultGenLabel(mode)
}

/**
 * 再次生成失败时的节点 data patch。
 * 必须清掉旧 src/content，否则 Image/Video 模板仍优先渲染旧结果。
 */
export function buildGenFailPatch(mode, err) {
  const failLabel = `${defaultGenLabel(mode)}（失败）`
  return {
    generating: false,
    genTaskId: '',
    genTaskKind: '',
    genRequestId: '',
    genRequestedAt: 0,
    genWaitTimedOut: false,
    label: failLabel,
    genError: err?.message || '生成失败，请重试',
    src: '',
    outputValue: '',
    content: '',
    poster: ''
  }
}

/** The submit succeeded, but polling could not confirm the final video status. */
export function buildVideoQueryInterruptedPatch(err) {
  return {
    generating: false,
    genError: `视频任务状态暂时无法确认，系统会继续查询：${err?.message || '查询失败'}`
  }
}
