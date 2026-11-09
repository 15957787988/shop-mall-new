const assert = require('assert/strict')
const fs = require('fs')
const vm = require('vm')
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { transformSync } = require('esbuild')
const { descriptor } = parse(fs.readFileSync('src/pages/workspaces/WorkspacePage.vue', 'utf8'))
const code = transformSync(compileScript(descriptor, { id: 'workspace-check' }).content, { loader: 'ts', format: 'cjs' }).code
const loggedIn = vue.ref(true), sessionVersion = vue.ref(1)
const route = vue.reactive({ params: { id: '8' } })
const sent = [], stopped = []
let delayed, loseReply = true, disconnects = 0
const snapshot = { workspace: { title: '已保存的工作区', entry: { budgetPoints: 10, bindings: [] } }, conversationId: 3, cursor: 42, messages: [{ id: 5, role: 'assistant', content: '已完成原片分析' }], runs: [{ id: 1, status: 'WAITING_TOOL', budget_points: 10 }], steps: [], assets: [{ id: 20, media_type: 'video', purpose: 'result', url: 'https://media.test/final.mp4' }], balance: { points: 100, availablePoints: 95, frozenPoints: 5 } }
function mount() {
  const callbacks = [], scope = vue.effectScope(), exported = {}
  const context = { module: { exports: exported }, exports: exported, Error, crypto: require('crypto'), setTimeout: () => 1, clearTimeout() {}, require(name) {
    if (name === 'vue') return { ...vue, onBeforeUnmount: (fn) => callbacks.push(fn) }
    if (name === 'vue-router') return { useRoute: () => route }
    if (name.endsWith('/useAuth')) return { useAuth: () => ({ isLoggedIn: loggedIn, sessionVersion, openLogin() {}, fetchUserInfo: async () => {} }) }
    if (name.endsWith('/workspaceSocket')) return { subscribeWorkspace(id, cursor) { assert.equal(id, 8); assert.equal(cursor, 42); return () => { disconnects++ } } }
    if (name === './api') return {
      async getWorkspace() { return delayed || structuredClone(snapshot) },
      async resolveAssets(urls) { return urls.map((url) => ({ id: 21, url })) },
      async sendWorkspaceMessage(id, body) { sent.push({ id, body }); if (loseReply) { loseReply = false; throw new Error('响应丢失') } },
      async stopAgentRun(id) { stopped.push(id) },
    }
    return {}
  } }
  vm.runInNewContext(code, context)
  const state = scope.run(() => context.module.exports.default.setup({}, { expose() {} }))
  return { state, leave() { callbacks.forEach((fn) => fn()); scope.stop() } }
}
async function flush() { await Promise.resolve(); await Promise.resolve(); await vue.nextTick() }
;(async () => {
  const first = mount(); await flush()
  assert.equal(first.state.data.value.workspace.title, snapshot.workspace.title)
  assert.equal(first.state.results.value.length, 1, '重进工作区从数据库恢复产物')
  first.state.text.value = '保持主体，重新制作开场'
  first.state.attachmentUrls.value = ['https://media.test/reference.png']
  await first.state.send(); assert.match(first.state.error.value, /响应丢失/)
  await first.state.send()
  assert.equal(sent.length, 2)
  assert.equal(sent[0].body.clientMessageId, sent[1].body.clientMessageId, '重试沿用消息幂等键')
  assert.equal(sent[0].body.assetIds[0], 21)
  first.leave()
  assert.equal(disconnects, 1)
  assert.equal(stopped.length, 0, '离开页面只关闭订阅，不停止后台任务')
  let finish
  delayed = new Promise((resolve) => { finish = resolve })
  const second = mount(); loggedIn.value = false; sessionVersion.value++; await flush()
  finish(structuredClone(snapshot)); await flush()
  assert.equal(second.state.data.value, undefined, '退出后忽略上一账号的迟到响应')
  second.leave()
  console.log('PASS workspace restore, message retry, navigation and account isolation')
})().catch((error) => { console.error(error); process.exitCode = 1 })
