/** Resume saved generation tasks while the owning editor is loaded. */
export async function recoverPendingGenerationTasks({
  nodes,
  getCurrentNode = (id) => nodes.find((node) => node.id === id),
  canEditNode,
  resumeTask,
  claimingTaskIds,
  resumingTaskIds,
  retryAfterByNode,
  skipTimedOutVideoTasks = true,
  now = Date.now
}) {
  const pending = nodes.filter(
    (node) =>
      node.data?.genTaskId &&
      node.data?.genTaskKind &&
      !(skipTimedOutVideoTasks && node.data.genTaskKind === 'video' && node.data.genWaitTimedOut) &&
      !claimingTaskIds.has(node.id) &&
      !resumingTaskIds.has(node.id) &&
      (retryAfterByNode.get(node.id) || 0) <= now()
  )
  const resumed = await Promise.all(
    pending.map(async (node) => {
      claimingTaskIds.add(node.id)
      try {
        if (!canEditNode(node.id)) {
          retryAfterByNode.set(node.id, now() + 3000)
          return false
        }
        retryAfterByNode.delete(node.id)
        const currentNode = getCurrentNode(node.id)
        if (
          !currentNode ||
          currentNode.data?.genTaskId !== node.data.genTaskId ||
          currentNode.data?.genTaskKind !== node.data.genTaskKind ||
          (skipTimedOutVideoTasks && currentNode.data?.genTaskKind === 'video' && currentNode.data.genWaitTimedOut)
        )
          return false
        resumingTaskIds.add(node.id)
        await resumeTask(currentNode)
        return true
      } catch {
        // A transient query failure can be retried on the next recovery pass.
        retryAfterByNode.set(node.id, now() + 3000)
        return false
      } finally {
        claimingTaskIds.delete(node.id)
        resumingTaskIds.delete(node.id)
      }
    })
  )
  return resumed.some(Boolean)
}
