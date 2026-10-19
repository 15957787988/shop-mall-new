// Only result fields change. Prompts, settings and reference inputs are never rolled back.
const mediaDefaults = {
  src: '',
  outputValue: '',
  poster: '',
  dimensions: '',
  duration: 0,
  fileName: '',
  genError: ''
}
const snapshot = (node) =>
  Object.fromEntries(
    Object.entries(mediaDefaults).map(([key, value]) => [key, node.data?.[key] ?? value])
  )
// The saved graph omits empty optional fields and restores task IDs as strings.
const fingerprint = (node) =>
  JSON.stringify([
    node?.data?.src || '',
    node?.data?.outputValue || '',
    node?.data?.poster || '',
    String(node?.data?.genAppliedTaskId || ''),
    String(node?.data?.genTaskId || ''),
    String(node?.data?.genRequestId || ''),
    !!node?.data?.generating,
    !!node?.data?.uploading
  ])
export function historyNodeBusy(node) {
  const data = node?.data || {}
  return !!(data.generating || data.uploading || data.genTaskId || data.genRequestId)
}
export function historyMediaKind(node) {
  return /^image/i.test(node?.type || '')
    ? 'image'
    : /^video/i.test(node?.type || '')
      ? 'video'
      : null
}

/** User selection is saved through the existing owner-only graph save path, never the paid generation API. */
export function createHistorySelection(deps) {
  let busy = false,
    previous = null
  function check(scope, id, expected) {
    const node = deps.getNode(id)
    if (!scope || deps.getScope() !== scope || !node)
      throw new Error('画布或节点已变化，请重新打开历史')
    if (!deps.canEditNode(id)) throw new Error('节点暂时无法编辑，请稍后重试')
    if (node.data?.genRequestId && !node.data?.genTaskId)
      throw new Error('本次视频请求待确认，状态确认后可切换历史')
    if (historyNodeBusy(node)) throw new Error('节点正在生成或上传，完成后再切换')
    if (expected && fingerprint(node) !== expected) throw new Error('节点已有新的改动，请重新选择')
    return node
  }
  async function change({ id, kind, result, expected, undoing = false }) {
    if (busy) throw new Error('正在保存，请稍候')
    busy = true
    const scope = deps.getScope()
    let applied, before, acknowledged
    try {
      let node = check(scope, id, expected)
      if (historyMediaKind(node) !== kind) throw new Error('历史成果与节点类型不匹配')
      const start = fingerprint(node)
      if (!(await deps.save())) throw new Error('画布尚未保存，请先重试保存')
      node = check(scope, id, start)
      if (kind === 'video') {
        const task = await deps.getLatestVideoTask(id)
        node = check(scope, id, start)
        if (task && ([10, 11].includes(task.status) || (task.status === 20 && !task.videoUrl))) {
          throw new Error('新视频正在生成，完成后再切换')
        }
        // genAppliedTaskId is an acknowledgement watermark, not the displayed version.
        // Preserve it on undo too: polling must not replay a completed task over a manual selection.
        acknowledged =
          task?.taskId != null ? String(task.taskId) : node.data?.genAppliedTaskId || ''
        if (undoing && acknowledged !== (node.data?.genAppliedTaskId || ''))
          throw new Error('已有新的视频任务，无法撤销上次切换')
      }
      before = snapshot(node)
      const patch = { ...result, ...(kind === 'video' ? { genAppliedTaskId: acknowledged } : {}) }
      deps.update(id, patch)
      node = check(scope, id)
      if (node.data?.src !== patch.src) throw new Error('节点暂时无法编辑，未切换成果')
      applied = fingerprint(node)
      if (!(await deps.save())) throw new Error('切换保存失败，请重试')
      check(scope, id, applied)
      previous = undoing ? null : { scope, id, kind, result: before, expected: applied }
      return true
    } catch (error) {
      // Do not undo a new generation, upload or another user's edit arriving during save.
      if (applied && deps.getScope() === scope && fingerprint(deps.getNode(id)) === applied) {
        deps.update(id, {
          ...before,
          ...(kind === 'video' ? { genAppliedTaskId: acknowledged } : {})
        })
      }
      previous = null
      throw error
    } finally {
      busy = false
    }
  }
  return {
    async select(item) {
      if (!item?.nodeId || !item.url || !['image', 'video'].includes(item.kind))
        throw new Error('历史成果不可用')
      return change({
        id: item.nodeId,
        kind: item.kind,
        result: {
          src: item.url,
          outputValue: item.url,
          poster: item.kind === 'video' ? item.poster || '' : '',
          dimensions: item.width && item.height ? `${item.width} x ${item.height}` : '',
          duration: 0,
          fileName: item.name || '',
          genError: ''
        }
      })
    },
    async undo() {
      if (!previous || deps.getScope() !== previous.scope) throw new Error('没有可撤销的切换')
      return change({ ...previous, undoing: true })
    },
    canUndo: () =>
      !!previous &&
      deps.getScope() === previous.scope &&
      !historyNodeBusy(deps.getNode(previous.id)) &&
      fingerprint(deps.getNode(previous.id)) === previous.expected,
    isBusy: () => busy
  }
}
