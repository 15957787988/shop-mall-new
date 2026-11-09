const assert = require('assert/strict')
const fs = require('fs')
const vm = require('vm')
const esbuild = require('esbuild')
const pending = new Map()
let timerId = 0
const sockets = []
class FakeSocket {
  sent = []
  constructor(url) { this.url = url; sockets.push(this) }
  send(value) { this.sent.push(JSON.parse(value)) }
  close() { this.onclose?.() }
}
const exported = {}
const context = {
  module: { exports: exported }, exports: exported,
  window: { location: { origin: 'https://test.example' } }, URL, WebSocket: FakeSocket,
  setTimeout(fn) { pending.set(++timerId, fn); return timerId }, clearTimeout(id) { pending.delete(id) },
  require(name) {
    if (name.endsWith('/http')) return { resolveApiUrl: (path) => path }
    if (name.endsWith('/storage')) return { getAccessToken: () => 'private-access-token' }
    throw new Error(`Unexpected import: ${name}`)
  },
}
const code = esbuild.transformSync(fs.readFileSync('src/service/workspaceSocket.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code
vm.runInNewContext(code, context)
const states = []
let refreshes = 0
const stop = context.module.exports.subscribeWorkspace(8, 41, () => { refreshes += 1 }, (state) => states.push(state))
assert.equal(sockets[0].url, 'wss://test.example/admin-api/ai/workspaces/socket')
assert.ok(!sockets[0].url.includes('private-access-token'))
sockets[0].onopen()
assert.equal(sockets[0].sent[0].token, 'private-access-token')
assert.equal(sockets[0].sent[0].after, 41)
sockets[0].onmessage({ data: JSON.stringify({ type: 'ready', cursor: 41 }) })
sockets[0].onmessage({ data: JSON.stringify({ type: 'events', cursor: 42, events: [] }) })
assert.equal(refreshes, 2)
sockets[0].onclose()
assert.ok(states.includes('reconnecting'))
const reconnect = [...pending.values()].pop()
reconnect()
assert.equal(sockets.length, 2)
sockets[1].onopen()
assert.equal(sockets[1].sent[0].after, 42, '重连从已收到的事件游标继续')
stop()
const count = sockets.length
sockets[1].onclose()
assert.equal(sockets.length, count, '离开页面不再创建连接')
sockets[1].onmessage({ data: JSON.stringify({ type: 'events', cursor: 43 }) })
assert.equal(refreshes, 2, '已离开的页面不处理旧连接事件')
console.log('PASS workspace socket authentication, cursor recovery and teardown')
