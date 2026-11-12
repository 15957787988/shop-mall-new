export const VIDEO_DEPTH_SAVE = Symbol('video-depth-save')

export const depthStages = {
  queued: '排队中',
  decode: '读取视频',
  infer: '提取空间深度',
  encode: '导出灰度视频',
  validate: '校验视频',
  archive: '归档结果',
  recovering: '连接中断，正在恢复',
  done: '提取完成',
}
export const isDepthActive = (task) => ['QUEUED', 'RUNNING', 'RECOVERING'].includes(task?.state)
export const depthTaskLabel = (task) => {
  if (!task) return '尚未开始'
  if (task.state === 'FAILED') return '提取失败'
  if (task.state === 'SUCCEEDED') return '提取完成'
  return depthStages[task.stage] || (isDepthActive(task) ? '处理中' : '状态待核对')
}

// 按任务编号去重，避免重复完成通知或重新打开弹窗插入第二个节点。
export function depthResultNode(nodes, taskId) {
  return nodes.find((node) => String(node.data?.depthResultTaskId || '') === String(taskId))
}

// 未产出文件的提取节点是专用任务占位，不参与普通媒体生成。
export const isDepthPendingNode = (node) => !!(
  node?.data?.depthSourceNodeId && node.data.depthRequestKey && !node.data.depthResultTaskId && !node.data.src
)
export function depthTaskPatch(node, task) {
  if (!isDepthPendingNode(node) || String(node.data.depthTaskId) !== String(task.id)) return null
  const patch = { depthState: task.state, depthStage: task.stage, depthError: task.errorMessage || '' }
  if (task.state === 'SUCCEEDED' && task.resultUrl) {
    let metadata = {}
    try { metadata = JSON.parse(task.metadataJson || '{}') } catch { /* 文件仍可播放 */ }
    Object.assign(patch, {
      src: task.resultUrl, outputValue: task.resultUrl, fileName: `depth-${task.id}.mp4`,
      duration: metadata.duration || 0,
      dimensions: metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : '',
      depthResultTaskId: task.id,
    })
  }
  return patch
}
