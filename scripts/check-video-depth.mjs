// 运行：node --experimental-default-type=module scripts/check-video-depth.mjs
import assert from 'node:assert/strict'
import { vueNodeToGraphNode, graphNodeToVueNode } from '../src/pages/canvas/utils/graphAdapter.js'
import { depthResultNode, isDepthActive, isDepthPendingNode, depthTaskPatch } from '../src/pages/canvas/utils/videoDepth.js'

const source = { id: 'video', type: 'videoUploadNode', position: { x: 0, y: 0 }, data: {
  src: 'https://media.test/source.mp4', depthTaskId: 12,
  depthRequestKey: 'original-request', depthRequestUrl: 'https://media.test/source.mp4',
} }
const reloaded = graphNodeToVueNode(vueNodeToGraphNode(source))
assert.equal(reloaded.data.depthRequestKey, 'original-request')
assert.equal(reloaded.data.depthRequestUrl, source.data.src)
assert.equal(reloaded.data.depthTaskId, 12)

const result = { id: 'result', type: 'videoUploadNode', data: {
  src: 'https://media.test/depth.mp4', depthResultTaskId: 12, depthSourceNodeId: 'video',
} }
const restoredResult = graphNodeToVueNode(vueNodeToGraphNode(result))
assert.equal(depthResultNode([reloaded, restoredResult], 12).id, 'result')
assert.equal(depthResultNode([reloaded, restoredResult], 13), undefined)
assert.equal(restoredResult.data.depthSourceNodeId, 'video')
assert.equal(restoredResult.data.genTaskId, '')
assert.equal(restoredResult.data.costPoints, 0)
assert.equal(restoredResult.data.generating, false)
for (const state of ['QUEUED', 'RUNNING', 'RECOVERING']) assert.ok(isDepthActive({ state }))
for (const state of ['SUCCEEDED', 'FAILED']) assert.equal(isDepthActive({ state }), false)
console.log('深度节点保存恢复、成果去重、状态和免费生成隔离检查通过')

const draft = { id: 'depth-placeholder', type: 'videoUploadNode', position: { x: 400, y: 0 }, data: {
  depthSourceNodeId: 'video', depthRequestKey: 'stable-key', depthRequestUrl: source.data.src,
  depthState: 'DRAFT', depthStage: '', depthError: '',
} }
assert.ok(isDepthPendingNode(draft))
for (const state of ['DRAFT', 'SUBMITTING', 'RUNNING', 'FAILED']) {
  const saved = graphNodeToVueNode(vueNodeToGraphNode({ ...draft, data: { ...draft.data, depthState: state, depthError: 'test error' } }))
  assert.ok(isDepthPendingNode(saved))
  assert.equal(saved.data.depthState, state)
  assert.equal(saved.data.depthError, 'test error')
  assert.equal(saved.data.genTaskId, '')
}
const running = { ...draft, data: { ...draft.data, depthTaskId: 42 } }
const complete = { id: 42, state: 'SUCCEEDED', stage: 'done', resultUrl: 'https://media.test/depth.mp4', metadataJson: '{"width":960,"height":540,"duration":4.4}' }
assert.equal(depthTaskPatch(undefined, complete), null) // 已删除，不复活节点
assert.equal(depthTaskPatch(running, { ...complete, id: 43 }), null) // 迟到响应不覆盖其他任务
const completed = { ...running, data: { ...running.data, ...depthTaskPatch(running, complete) } }
assert.equal(completed.id, draft.id) // 回填原占位节点
assert.equal(completed.data.dimensions, '960 × 540')
assert.equal(completed.data.duration, 4.4)
assert.equal(completed.data.depthResultTaskId, 42)
assert.equal(isDepthPendingNode(completed), false) // 成功后开放视频操作
assert.equal(depthTaskPatch(completed, complete), null) // 重复完成不重复回填
assert.equal(depthTaskPatch(running, { ...complete, metadataJson: 'invalid' }).src, complete.resultUrl)
assert.equal(isDepthPendingNode(source), false)
console.log('提取占位、断线恢复、同节点回填、删除及迟到响应保护检查通过')

assert.equal(isDepthPendingNode({ ...completed, data: { ...completed.data, src: '' } }), false) // 成功后清空视频不会重新锁住
