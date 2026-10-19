/** 画布还未加载完成时拒绝发起无归属的付费任务。 */
export function canvasGenerationContext(projectId, nodeId, recordHistory = true) {
  if (!projectId || !nodeId) throw new Error('画布尚未加载完成，请稍后重试')
  if (!recordHistory) return {}
  return { canvasProjectId: String(projectId), canvasNodeId: String(nodeId) }
}
