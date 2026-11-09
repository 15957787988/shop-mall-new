const assert = require('assert/strict')
const fs = require('fs'), vm = require('vm'), vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('esbuild')
const { descriptor } = parse(fs.readFileSync('src/pages/workspaces/HypitProjectPanel.vue', 'utf8'))
const code = transformSync(compileScript(descriptor, { id: 'hypit-check' }).content, { loader: 'ts', format: 'cjs' }).code
const spec = { version: 1, duration: 5, width: 854, height: 480, background: '#101820', clips: [{ id: 'scene', assetId: 20, start: 0, end: 5, sourceStart: 0, gain: 1, motion: 'none', fit: 'contain' }], captions: [{ id: 'subtitle', text: '原字幕', start: 0, end: 5 }], audio: [] }
const rows = [{ id: 1, state: 'SUCCESS', spec }], sent = [], callbacks = []
const sourceFiles = { 'main.svml': '<svml>字幕</svml>', 'styles.svs': 'styles', 'main.svrun': '<svrun/>' }
let failRead = false
let loseReply = true
const props = vue.reactive({ workspaceId: 8, duration: 5, sourceVideoIds: [9], assets: [{ id: 9, media_type: 'video' }, { id: 20, media_type: 'video' }, { id: 21, media_type: 'image', purpose: 'analysis' }] })
const exported = {}, scope = vue.effectScope()
const context = { exports: exported, module: { exports: exported }, Error, crypto: require('crypto'), setTimeout: () => 1, clearTimeout() {}, require(name) {
  if (name === 'vue') return { ...vue, onBeforeUnmount: callback => callbacks.push(callback) }
  if (name === './api') return {
    async getAgentConfiguration() { return { hypitEnabled: true } },
    async listHypitProjects(id) { assert.equal(id, 8); if (failRead) throw new Error('timeout of 120000ms exceeded'); return structuredClone(rows) },
    async getHypitSources(id, revision) { assert.equal(id, 8); assert(revision >= 3); return { ...sourceFiles, 'project.json': '{"spec":{}}' } },
    async createHypitRevision(id, body) {
      sent.push(structuredClone(body)); assert.equal(id, 8)
      if (loseReply) { loseReply = false; throw new Error('响应丢失') }
      rows.unshift({ id: rows[0].id + 1, parent_id: rows[0].id, state: 'QUEUED', authoring_mode: body.files ? 'SOURCE' : 'TRACKS', spec: body.spec || { ...rows[0].spec, assetIds: body.assetIds } })
    },
  }
  return {}
} }
vm.runInNewContext(code, context)
const state = scope.run(() => context.module.exports.default.setup(props, { expose() {} }))
async function flush() { for (let i = 0; i < 5; i++) await Promise.resolve(); await vue.nextTick() }
;(async () => {
  await flush()
  assert.equal(state.latest.value.id, 1)
  assert.deepEqual([...state.visualOptions.value].map(a => a.value), [20], '原视频不可进入制作轨道')
  state.draft.value.captions[0].text = '只改字幕'
  assert.equal(state.dirty.value, true)
  await state.load(); assert.equal(state.draft.value.captions[0].text, '只改字幕', '自动刷新保留未保存修改')
  await state.save(); assert.match(state.error.value, /响应丢失/)
  await state.save()
  assert.equal(sent.length, 2); assert.equal(sent[0].clientRequestId, sent[1].clientRequestId, '响应丢失后沿用同一提交键')
  assert.deepEqual(sent[1].spec.clips, spec.clips, '字幕修改原样复用已有视频素材')
  assert.deepEqual(sent[1].spec.audio, spec.audio)
  assert.equal(state.latest.value.id, 2); assert.equal(state.building.value, true)
  assert.equal(state.dirty.value, false)
  await state.save(); assert.equal(sent.length, 2, '原构建执行中不能重复渲染')
  rows[0].state = 'SUCCESS'
  rows.unshift({ id: 3, state: 'SUCCESS', authoring_mode: 'SOURCE', spec: { version: 1, duration: 5, width: 854, height: 480, assetIds: [20] } })
  await state.load(); await flush()
  assert.equal(state.sourceMode.value, true); assert.equal(state.draft.value, undefined, '源码工程不访问不存在的轨道数组')
  const editable = JSON.parse(state.sourceText.value); assert.equal(editable['project.json'], undefined)
  editable['main.svml'] = '<svml>只改源码字幕</svml>'; state.sourceText.value = JSON.stringify(editable, null, 2)
  await state.load(); assert.match(state.sourceText.value, /只改源码字幕/, '轮询保留源码草稿')
  await state.save()
  assert.deepEqual(sent[2].assetIds, [20]); assert.equal(sent[2].spec, undefined)
  assert.equal(sent[2].files['main.svml'], editable['main.svml'])
  assert.equal(sent[2].parentId, 3)
  failRead = true
  await state.load(); assert.match(state.error.value, /工程列表读取失败.*120000/)
  assert.equal(state.latest.value.id, 4, '读取超时保留已知工程')
  failRead = false
  await state.load(); assert.equal(state.error.value, '', '恢复读取后清除旧超时提示')
  callbacks.forEach(fn => fn()); scope.stop()
  console.log('PASS Hypit source exclusion, subtitle reuse, draft retention, idempotent retry and build lock')
})().catch(e => { console.error(e); process.exitCode = 1 })
