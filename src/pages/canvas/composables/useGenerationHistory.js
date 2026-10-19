import { computed, h, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from '../shims/feedback'
import { generationApi } from '../api/generationApi'
import { createHistorySelection } from '../utils/generationHistorySelection'

export const GENERATION_HISTORY = Symbol('canvas-generation-history')

export function useGenerationHistory({
  projectId,
  canEdit,
  isReady,
  videoTasks,
  refreshKey,
  store,
  liveNodes,
  save,
  onVideoTasksLoaded
}) {
  const counts = ref(new Map()),
    openNodeId = ref(''),
    selecting = ref(false),
    summaryError = ref(false)
  let revision = 0,
    disposed = false,
    notice
  const scope = computed(() =>
    canEdit.value && projectId.value && !disposed ? String(projectId.value) : null
  )
  async function refresh() {
    const id = scope.value,
      request = ++revision
    if (!id) {
      counts.value = new Map()
      return
    }
    try {
      const rows = await generationApi.nodes(id)
      if (disposed || request !== revision || id !== scope.value) return
      if (!Array.isArray(rows)) throw new Error('Invalid history summary')
      counts.value = new Map(
        rows.map((row) => [`${row.kind}:${row.nodeId}`, Number(row.total) || 0])
      )
      summaryError.value = false
    } catch {
      if (disposed || request !== revision) return
      summaryError.value = true
    }
  }
  watch(
    scope,
    () => {
      counts.value = new Map()
      openNodeId.value = ''
      notice?.close()
      void refresh()
    },
    { immediate: true }
  )
  watch(refreshKey, () => void refresh())
  // Discovery after reload does not emit generation-complete. Refresh once per new success,
  // not on every poll of the same task snapshot.
  watch(
    () =>
      videoTasks.value
        .filter((task) => task.status === 20 && task.videoUrl)
        .map((task) => `${task.nodeId}:${task.taskId}`)
        .sort()
        .join('|'),
    () => void refresh()
  )
  watch(
    () => store.activePanelNodeId,
    (id) => {
      if (String(id || '') !== openNodeId.value) openNodeId.value = ''
      if (summaryError.value) void refresh()
    }
  )
  const selection = createHistorySelection({
    getScope: () => scope.value,
    getNode: (id) => store.nodes.find((node) => String(node.id) === String(id)),
    canEditNode: () => canEdit.value && isReady() && !disposed,
    update: (id, patch) => store.updateNodeData(id, patch, liveNodes.value),
    async save() {
      // Let the active downstream panel consume new references before flushPanel writes them.
      await nextTick()
      return await save()
    },
    async getLatestVideoTask(id) {
      const project = scope.value
      const tasks = await generationApi.videoTasks(project)
      if (project !== scope.value || !Array.isArray(tasks))
        throw new Error('视频任务状态暂时无法确认，请重试')
      onVideoTasksLoaded(tasks)
      return tasks.find((task) => String(task.nodeId) === String(id))
    }
  })
  async function undo() {
    if (selecting.value) return
    selecting.value = true
    try {
      await selection.undo()
      notice?.close()
      ElMessage.success('已撤销切换')
    } catch (e) {
      ElMessage.warning(e.message || '撤销失败，请重试')
    } finally {
      selecting.value = false
    }
  }
  async function select(item) {
    if (selecting.value) return false
    selecting.value = true
    try {
      await selection.select(item)
      openNodeId.value = ''
      notice?.close()
      notice = ElMessage({
        type: 'success',
        duration: 8000,
        message: h('span', [
          `已切换${item.kind === 'image' ? '图片' : '视频'} `,
          h(
            'button',
            {
              type: 'button',
              onClick: undo,
              style:
                'margin-left:12px;border:0;background:transparent;color:inherit;text-decoration:underline;cursor:pointer'
            },
            '撤销'
          )
        ])
      })
      return true
    } catch (e) {
      ElMessage.error(e.message || '切换失败，请重试')
      return false
    } finally {
      selecting.value = false
    }
  }
  onBeforeUnmount(() => {
    disposed = true
    revision++
    notice?.close()
  })
  return {
    scope,
    openNodeId,
    selecting,
    summaryError,
    refresh,
    select,
    count: (kind, id) => counts.value.get(`${kind}:${id}`) || 0
  }
}
