import { VIDEO_WAIT_TIMEOUT_MESSAGE, videoWaitState } from './videoTaskWait.js'

/** The latest server task is authoritative; a marker only protects a newer, unaccepted submission. */
function shouldRestoreVideoTask(node, task) {
  if (!node || !task?.taskId || !node.type?.toLowerCase().includes('video')) return false
  const data = node.data || {}
  // genTaskId is this job. A stale request id must not hide a finished result.
  if (data.genRequestId && data.genRequestId !== task.requestId &&
      String(data.genTaskId || '') !== String(task.taskId)) return false
  if (data.genAppliedTaskId && String(data.genAppliedTaskId) === String(task.taskId)) return false
  // Ignore a stale task snapshot after a newer task was already restored locally.
  const knownId = data.genTaskId || data.genAppliedTaskId
  if (/^\d+$/.test(String(knownId)) && /^\d+$/.test(String(task.taskId)) && BigInt(knownId) > BigInt(task.taskId)) return false
  return [10, 11, 20, 30].includes(task.status)
}

export function findRecoverableVideoTasks(nodes, tasks) {
  const byId = new Map(nodes.map((node) => [String(node.id), node]))
  return tasks.filter((task) => videoTaskPatch(byId.get(String(task.nodeId)), task))
}

function isTerminalVideoTask(task) {
  return task?.status === 30 || (task?.status === 20 && !!task.videoUrl)
}

/** "undefined" is a truthy string and must not be sent to /ai/video/get-my. */
export function isPersistedVideoTaskId(id) {
  return /^[1-9]\d*$/.test(String(id ?? ''))
}

function localVideoTaskId(data) {
  return isPersistedVideoTaskId(data?.genTaskId) ? String(data.genTaskId) : ''
}

/** A finished server row owns the node when it is the job still marked on that node. */
function finishedTaskOwnsNode(node, task) {
  if (!node || !task || String(task.nodeId) !== String(node.id)) return false
  const data = node.data || {}
  const localId = localVideoTaskId(data)
  if (data.genRequestId && data.genRequestId !== task.requestId &&
      localId && localId !== String(task.taskId)) return false
  return localId === String(task.taskId)
    || (data.genRequestId && data.genRequestId === task.requestId)
    || String(data.genAppliedTaskId || '') === String(task.taskId)
    || (task.videoUrl && data.src === task.videoUrl)
}

/** Drop a bogus task id left on a node whose server task already finished. */
export function appliedVideoWaitPatch(node, task, now = Date.now()) {
  if (!isTerminalVideoTask(task) || !finishedTaskOwnsNode(node, task)) return null
  const data = node.data || {}
  const localId = localVideoTaskId(data)
  if (localId && localId !== String(task.taskId)) return null
  const bogus = !!data.genTaskId && !localId
  const waiting = !!data.generating || !!data.genWaitTimedOut || data.genError === VIDEO_WAIT_TIMEOUT_MESSAGE
  const danglingRequest = !!data.genRequestId && data.genRequestId !== task.requestId
  if (!bogus && !waiting && !danglingRequest) return null
  if (danglingRequest && !bogus && Number(data.genRequestedAt) > 0 &&
      now - Number(data.genRequestedAt) < 120000) return null
  return {
    generating: false,
    genWaitTimedOut: false,
    genTaskId: '',
    genTaskKind: '',
    genRequestId: '',
    genRequestedAt: 0,
    genError: task.status === 30 ? (task.errorMessage || '视频生成失败，请重试') : '',
    genAppliedTaskId: String(task.taskId),
    genTaskState: task.status,
    ...(task.status === 20 && task.videoUrl
      ? { src: task.videoUrl, outputValue: task.videoUrl, poster: task.previewUrl || data.poster || '' }
      : {}),
  }
}

/** List polling stays up only while a task can still change or the node has not absorbed it. */
export function needsVideoTaskSync(nodes, tasks) {
  if (!Array.isArray(nodes) || !Array.isArray(tasks)) return true
  if (findRecoverableVideoTasks(nodes, tasks).length) return true
  const requestIds = new Set(tasks.map((task) => task.requestId).filter(Boolean))
  const byNode = new Map(tasks.map((task) => [String(task.nodeId), task]))
  return nodes.some((node) => {
    const data = node?.data || {}
    if (data.genRequestId && !requestIds.has(data.genRequestId)) return true
    if (!data.genTaskId || data.genTaskKind !== 'video') return false
    const task = byNode.get(String(node.id))
    return !(task && String(task.taskId) === String(data.genTaskId) && isTerminalVideoTask(task))
  })
}

function hasVideoTaskAssociation(node, task) {
  return (node.data?.genTaskId && String(node.data.genTaskId) === String(task.taskId)) ||
    (node.data?.genRequestId && node.data.genRequestId === task.requestId)
}

function videoTaskMarker(data) {
  return JSON.stringify([String(data?.genTaskId || ''), String(data?.genRequestId || '')])
}

/** Only hydrated work is eligible: a new local submission must not inherit an old empty lookup. */
export function markRestoredVideoTask(node, tasks, lookupSucceeded) {
  if (!lookupSucceeded || !node?.type?.toLowerCase().includes('video') ||
      (!node.data?.genTaskId && !node.data?.genRequestId) ||
      tasks.some(task => String(task.nodeId) === String(node.id))) return node
  return { ...node, data: { ...node.data, genRestoredTaskMarker: videoTaskMarker(node.data) } }
}

/** A failed status query must not keep the spinner alive. */
export function videoTaskDisplayData(node, task, { now = Date.now() } = {}) {
  const data = { ...node?.data, ...videoTaskPatch(node, task, { now }) }
  if (!task && data.genRestoredTaskMarker === videoTaskMarker(data) &&
      (data.genTaskId || data.genRequestId)) {
    // Keep persisted IDs and polling intact; this is an unknown status, not success or failure.
    const unconfirmed = unconfirmedVideoRequestPatch(data, now)
    return { ...data, generating: false, genWaitTimedOut: true,
      genError: unconfirmed?.genError || '暂未查询到此视频任务，正在继续同步；现有媒体已保留，请勿重复提交' }
  }
  if (task && [20, 30].includes(task.status) && String(data.genAppliedTaskId) === String(task.taskId) &&
      (!data.genRequestId || data.genRequestId === task.requestId) &&
      (!data.genTaskId || String(data.genTaskId) === String(task.taskId))) {
    // A saved acknowledgement is terminal even if an older install left its transient flag behind.
    return { ...data, generating: false, genTaskId: '', genTaskKind: '', genWaitTimedOut: false,
      genError: task.status === 30 ? task.errorMessage || '视频生成失败，请重试' : '' }
  }
  if (needsVideoRecoveryChoice(node, task)) {
    // Display-only: keep historical results recoverable and never replace user media.
    return { ...data, generating: false, genWaitTimedOut: false, genError: '视频结果待确认，请在生成记录中选择恢复' }
  }
  // A finished get-my / video-tasks row wins over the local 15-minute placeholder.
  if (isTerminalVideoTask(task) && finishedTaskOwnsNode(node, task)) {
    const finished = {
      ...data,
      generating: false,
      genWaitTimedOut: false,
      genTaskId: '',
      genTaskKind: '',
      genRequestId: '',
      genRequestedAt: 0,
      genAppliedTaskId: String(task.taskId),
      genTaskState: task.status,
    }
    if (task.status === 30) {
      finished.genError = task.errorMessage || '视频生成失败，请重试'
      return finished
    }
    finished.genError = data.genError === VIDEO_WAIT_TIMEOUT_MESSAGE ? '' : (data.genError || '')
    if (task.videoUrl) {
      finished.src = task.videoUrl
      finished.outputValue = task.videoUrl
      finished.poster = task.previewUrl || data.poster || ''
      finished.genError = ''
    }
    return finished
  }
  if (localVideoTaskId(data) && data.genTaskKind === 'video' && !isTerminalVideoTask(task)) {
    const wait = videoWaitState(data, now)
    if (wait.genWaitTimedOut) Object.assign(data, wait)
  }
  return data
}

/** Old graphs cannot tell a missed result from a video the user later replaced or cleared. */
export function needsVideoRecoveryChoice(node, task) {
  return shouldRestoreVideoTask(node, task) && task.status === 20 && !!task.videoUrl &&
    !hasVideoTaskAssociation(node, task) && node.data?.src !== task.videoUrl
}

/** Shared by task status display and result persistence. Never mutates the graph. */
export function videoTaskPatch(node, task, { useResult = false, now = Date.now() } = {}) {
  if (!shouldRestoreVideoTask(node, task)) return null
  if (!useResult && needsVideoRecoveryChoice(node, task)) return null
  const associated = hasVideoTaskAssociation(node, task)
  if (task.status === 20 && !task.videoUrl && !associated) return null
  const taskId = String(task.taskId)
  const pending = task.status === 10 || task.status === 11 || (task.status === 20 && !task.videoUrl)
  if (pending) {
    const sameTask = node.data?.genTaskId ? String(node.data.genTaskId) === taskId : associated
    // Server creation time also covers old graphs with no request marker.
    const genRequestedAt = Number(task.createTime) > 0 ? Number(task.createTime)
      : (sameTask && node.data?.genRequestedAt) || now
    return {
      genTaskId: taskId,
      genTaskKind: 'video',
      genTaskState: task.status,
      genRequestedAt,
      ...videoWaitState({ genRequestedAt, genWaitTimedOut: sameTask && node.data?.genWaitTimedOut }, now)
    }
  }
  const patch = {
    genTaskId: '', genTaskKind: '', genRequestId: '', genRequestedAt: 0,
    genWaitTimedOut: false,
    genAppliedTaskId: taskId, genTaskState: task.status, generating: false,
    genError: task.status === 30 ? task.errorMessage || '视频生成失败，请重试' : ''
  }
  // Backfill acknowledgement without changing an unlinked legacy node's media or label.
  if (!associated && !useResult) {
    if (task.status === 30) patch.genError = `历史视频任务失败：${task.errorMessage || '生成失败'}`
    return patch
  }
  if (task.status === 20) {
    return {
      ...patch, src: task.videoUrl, outputValue: task.videoUrl, poster: task.previewUrl || '',
      ...(/（失败）/.test(node.data?.label || '') ? { label: '视频节点' } : {})
    }
  }
  return { ...patch, src: '', outputValue: '', poster: '', label: '视频节点（失败）' }
}

/** Persist the target node and request marker BEFORE making the paid submission. */
export async function submitPersistedVideoRequest({ save, submit }) {
  if ((await save()) === false) throw new Error('画布保存失败，视频尚未提交，请重试保存')
  return await submit()
}

/** A reload can also cancel the request before it reaches the server. Never auto-resubmit. */
export function unconfirmedVideoRequestPatch(data, now = Date.now()) {
  if (!data?.genRequestId || data.genTaskId || !data.genRequestedAt || now - data.genRequestedAt < 120000) return null
  return {
    generating: false,
    genError: '尚未查到本次视频任务，系统会继续查询；重新生成会提交新任务'
  }
}

function assertVideoTaskSyncStops() {
  const nodeId = 'node-1784289338246-1'
  const failed = {
    taskId: 3,
    nodeId,
    status: 30,
    requestId: '41f9a72e-34f2-4097-9c91-cc248f05138e',
    videoUrl: null,
    errorMessage: '生成结果为空'
  }
  const video = (data) => ({ id: nodeId, type: 'videoGenNode', data })
  if (needsVideoTaskSync([video({ genAppliedTaskId: '3' })], [failed])) {
    throw new Error('acknowledged failure must stop video-tasks polling')
  }
  if (!needsVideoTaskSync([video({ genRequestId: failed.requestId, generating: true })], [failed])) {
    throw new Error('unapplied failure must sync once')
  }
  if (!needsVideoTaskSync([video({ genTaskId: '3', genTaskKind: 'video' })], [{ ...failed, status: 10 }])) {
    throw new Error('in-progress task must keep syncing')
  }
  if (!needsVideoTaskSync([video({ genRequestId: 'missing', genRequestedAt: Date.now() })], [failed])) {
    throw new Error('unconfirmed request must keep syncing')
  }
}

function assertFinishedVideoClearsWait() {
  const videoUrl = 'http://localhost:8082/shop-mall-img/ai-canvas/videos/done.mp4'
  const node = {
    id: 'video-1-1792121814152',
    type: 'videoGenNode',
    data: {
      src: videoUrl,
      genTaskId: '4',
      genTaskKind: 'video',
      genRequestId: 'stale-request',
      genRequestedAt: Date.now() - 60 * 60 * 1000,
      genWaitTimedOut: true,
      genError: VIDEO_WAIT_TIMEOUT_MESSAGE,
    },
  }
  const done = {
    taskId: 4,
    nodeId: node.id,
    status: 20,
    videoUrl,
    requestId: '48e38c23-5237-467a-a985-8d7a5559bd86',
    createTime: Date.now() - 60 * 60 * 1000,
  }
  const view = videoTaskDisplayData(node, done)
  if (view.genWaitTimedOut || view.genTaskId || view.genError) {
    throw new Error('finished video must clear the 15-minute wait')
  }
  if (view.src !== videoUrl) throw new Error('finished video must keep the returned url')
  const stuck = videoTaskDisplayData({
    ...node,
    data: {
      ...node.data,
      genTaskId: 'undefined',
      genRequestId: '0dbd176c-1a4c-43f1-bdce-bb3573f19578',
      genAppliedTaskId: '4',
      genError: '视频任务状态暂时无法确认，系统会继续查询：请求失败',
    },
  }, done)
  if (stuck.genTaskId || stuck.genError === VIDEO_WAIT_TIMEOUT_MESSAGE) {
    throw new Error('string undefined must not keep the 15-minute wait')
  }
  const pending = videoTaskDisplayData(node, { ...done, status: 10, videoUrl: '' })
  if (pending.genError !== VIDEO_WAIT_TIMEOUT_MESSAGE) {
    throw new Error('unfinished old task must keep the wait message')
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('discoverVideoTasks.js')) {
  assertVideoTaskSyncStops()
  assertFinishedVideoClearsWait()
}
