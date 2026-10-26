import { onBeforeUnmount, ref } from 'vue'
import { breakdownApi } from '../api/breakdownApi'

export function useShotBreakdown({ projectId, nodeId, getData, updateNodeData }) {
  const stage = ref(getData()?.breakdownId ? 'queued' : (getData()?.breakdownStage || 'idle'))
  const stageDetail = ref('')
  const error = ref(getData()?.breakdownStage === 'failed' ? '拉片失败' : '')
  const doc = ref(null)
  const gates = ref(null)
  const frames = ref({})
  const stats = ref(null)
  let timer = null
  let stopped = false

  function patch(next) {
    const current = getData() || {}
    const diff = {}
    for (const [key, value] of Object.entries(next)) {
      if (current[key] !== value) diff[key] = value
    }
    if (Object.keys(diff).length) updateNodeData(diff)
  }

  async function load() {
    const id = getData()?.breakdownId
    const pid = projectId.value
    if (!id || !pid) return
    const result = await breakdownApi.get(pid, id)
    doc.value = result.shots || null
    gates.value = result.gates || null
    frames.value = result.frames || {}
    stats.value = result.stats || null
    const summary = stats.value
      ? {
          count: stats.value.count,
          avgSeconds: stats.value.avgSeconds,
          cutsPerMinute: stats.value.cutsPerMinute,
          gateFailed: (result.gates?.failed || []).length,
          gateHints: (result.gates?.hints || []).length
        }
      : null
    patch({
      breakdownStage: 'done',
      breakdownVersion: result.version || 0,
      shotsSummary: summary
    })
    stage.value = 'done'
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function startPolling() {
    stop()
    const tick = async () => {
      if (stopped) return
      const pid = projectId.value
      if (!pid) return
      try {
        const status = await breakdownApi.status(pid, nodeId)
        if (!status?.stage) return
        stage.value = status.stage
        stageDetail.value = status.stageDetail || ''
        patch({
          breakdownId: status.breakdownId,
          breakdownStage: status.stage,
          breakdownVersion: status.version || 0
        })
        if (status.stage === 'done') {
          stop()
          await load()
          return
        }
        if (status.stage === 'failed') {
          stop()
          error.value = status.errorMessage || '拉片失败'
        }
      } catch (err) {
        error.value = err?.message || '进度查询失败'
      }
    }
    void tick()
    timer = setInterval(tick, 4000)
  }

  async function submit(body) {
    const pid = projectId.value
    if (!pid) throw new Error('缺少项目')
    stage.value = 'queued'
    error.value = ''
    patch({ breakdownStage: 'queued' })
    const created = await breakdownApi.submit(pid, { nodeId, withRhythm: true, lang: 'zh', ...body })
    patch({
      breakdownId: created.breakdownId,
      genTaskId: created.taskId,
      breakdownStage: 'queued'
    })
    startPolling()
  }

  function resume() {
    if (getData()?.breakdownId) startPolling()
  }

  onBeforeUnmount(() => {
    stopped = true
    stop()
  })

  return { stage, stageDetail, error, doc, gates, frames, stats, submit, reload: load, resume }
}
