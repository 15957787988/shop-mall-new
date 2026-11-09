const assert = require('assert/strict')
const fs = require('fs')
const vm = require('vm')
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const esbuild = require('esbuild')
const source = fs.readFileSync('src/pages/tools/VideoReplicate/index.vue', 'utf8')
const { descriptor } = parse(source)
const compiled = esbuild.transformSync(
  compileScript(descriptor, { id: 'replicate-check' }).content,
  { loader: 'ts', format: 'cjs' }
).code
const loggedIn = vue.ref(true)
const sessionVersion = vue.ref(1)
let creates = 0
let records = []
let detailRequests = 0
let delayedList
let destination = ''
let lostResponse = false
const entries = []
const createdByKey = new Map()
const workspaceApi = {
  async getAgentConfiguration() { return { configured: true, chatModels: [{ id: 'doubao-test', name: '豆包' }] } },
  async readVideoMetadata() { return { width: 1080, height: 1920, duration: 25 } },
  async resolveAssets(urls) { return urls.map((url, index) => ({ id: index + 101, url, mediaType: index ? 'image' : 'video' })) },
  async bootstrapWorkspace(entry) {
    entries.push(JSON.parse(JSON.stringify(entry)))
    assert.equal(entry.generation.duration, 5)
    assert.equal(entry.generation.ratio, '9:16')
    assert.equal(entry.sourceMetadata.duration, 25, '原视频时长与生成时长独立保存')
    assert.ok(entry.clientRequestId)
    if (!createdByKey.has(entry.clientRequestId)) { creates += 1; createdByKey.set(entry.clientRequestId, creates) }
    if (lostResponse) { lostResponse = false; throw new Error('创建成功但响应丢失') }
    return { workspaceId: createdByKey.get(entry.clientRequestId), conversationId: 1, runId: 1 }
  },
}
const api = {
  async pageReplicateTasks() {
    if (delayedList) return delayedList
    return { list: records.map((item) => ({ ...item })), total: records.length }
  },
}
const models = [
  { id: 99, name: 'H3 标准', disabled: true, disabledReason: '待配置积分' },
  {
    id: 9,
    name: 'text/image video model',
    ratio: ['9:16'],
    resolution: ['720p'],
    mediaLimits: { platformMaxVideos: 0, platformMaxImages: 9 },
    pricing: { minDuration: 4, maxDuration: 15 },
  },
]
function mount() {
  const mounted = [],
    unmounted = [],
    scope = vue.effectScope()
  const exported = {}
  const context = {
    module: { exports: exported },
    exports: exported,
    crypto: require('crypto'),
    setTimeout: () => 1,
    clearTimeout: () => {},
    require(name) {
      if (name === 'vue')
        return {
          ...vue,
          onMounted: (fn) => mounted.push(fn),
          onBeforeUnmount: (fn) => unmounted.push(fn),
        }
      if (name === './api') return api
      if (name === 'vue-router') return { useRouter: () => ({ push: async (path) => { destination = path } }) }
      if (name.endsWith('/workspaces/api')) return workspaceApi
      if (name.endsWith('/useAuth'))
        return { useAuth: () => ({ isLoggedIn: loggedIn, sessionVersion, openLogin() {} }) }
      if (name.endsWith('/useToast')) return { useToast: () => ({ addToast() {} }) }
      if (name.endsWith('/ai/api'))
        return {
          loadStudioModels: async () => models,
          getStudioWork: async (_kind, id) => {
            detailRequests += 1
            return {
              id,
              status: 20,
              modelName: 'seedance',
              prompt: '完整分镜提示词',
              duration: 5,
              referenceImageUrls: ['https://media.test/reference.png'],
            }
          },
        }
      if (name.endsWith('/modelPricing'))
        return {
          estimateModelPoints: (_model, params) => {
            assert.equal(params.referenceVideo, false)
            return _model ? 1 : null
          },
          formatModelPoints: () => '1',
        }
      if (name.endsWith('/seedanceConstraints')) return { isSeedance: () => false }
      return {}
    },
  }
  vm.runInNewContext(compiled, context)
  const state = scope.run(() => context.module.exports.default.setup({}, { expose() {} }))
  return {
    state,
    async ready() {
      await Promise.all(mounted.map((fn) => fn()))
      await vue.nextTick()
    },
    leave() {
      unmounted.forEach((fn) => fn())
      scope.stop()
    },
  }
}
async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await vue.nextTick()
}
;(async () => {
  const first = mount()
  await first.ready()
  const h3 = first.state.modelOptions.value.find((item) => item.value === 99)
  assert.equal(h3.disabled, true)
  assert.match(h3.label, /待配置积分/)
  assert.ok(first.state.modelOptions.value.find((item) => item.value === 9 && !item.disabled), '不支持视频参考的模型也可复刻')
  first.state.modelId.value = 99
  assert.equal(first.state.canAnalyze.value, false, '待配置模型不能发起收费任务')
  first.state.materials.videoUrl = 'https://media.test/long-source.mp4'
  first.state.modelId.value = 9
  await vue.nextTick()
  assert.equal(first.state.canAnalyze.value, true)
  await first.state.analyze()
  assert.equal(destination, '/workspaces/1', '新复刻入口创建工作区后跳转，后台无需浏览器继续驱动')
  assert.equal(entries[0].sourceVideoIds[0], 101)
  assert.equal(records.length, 0, '新工作区不冒充旧版复刻日志')
  first.leave()
  records[0] = {
    id: 1, createdAt: '2026-11-06T13:00:00', sourceVideoUrl: 'https://media.test/old.mp4',
    status: 'SUCCESS',
    canvasTaskId: 88,
    resultUrl: 'https://media.test/result.mp4',
  }
  const second = mount()
  await second.ready()
  assert.equal(second.state.activeTask.value.status, 'SUCCESS', '返回页面从服务端恢复任务')
  assert.equal(second.state.activeTask.value.resultUrl, records[0].resultUrl)
  await flush()
  assert.equal(second.state.cards.value.length, 1)
  assert.equal(second.state.cards.value[0].work.prompt, '完整分镜提示词')
  second.state.openPreview(second.state.tasks.value[0])
  assert.equal(second.state.previewOpen.value, true)
  assert.equal(second.state.previewWork.value.modelName, 'seedance')
  assert.equal(second.state.previewWork.value.referenceImageUrls.length, 1)
  assert.equal(detailRequests, 1)
  await second.state.fetchHistory()
  await flush()
  assert.equal(detailRequests, 1, '状态未改变时轮询不重复加载作品详情')
  second.state.refreshHistory()
  await flush()
  assert.equal(detailRequests, 2, '手动刷新重新获取最新参数和积分信息')
  assert.match(second.state.taskDescription({ status: 'ANALYSIS_DONE' }), /没有关联的视频生成任务/)
  assert.doesNotMatch(second.state.taskDescription({ status: 'ANALYSIS_DONE' }), /后台继续/)
  assert.equal(creates, 1, '恢复页面不重复提交反推或视频生成')
  let finish
  delayedList = new Promise((resolve) => {
    finish = resolve
  })
  const pending = second.state.fetchHistory()
  loggedIn.value = false
  sessionVersion.value += 1
  await flush()
  finish({ list: records, total: records.length })
  await pending
  assert.equal(second.state.tasks.value.length, 0, '退出登录后不展示旧请求返回的用户记录')
  assert.equal(Object.keys(second.state.works.value).length, 0)
  assert.equal(second.state.previewOpen.value, false)
  second.leave()
  loggedIn.value = true
  sessionVersion.value += 1
  delayedList = undefined
  const retry = mount()
  await retry.ready()
  retry.state.modelId.value = 9
  retry.state.materials.videoUrl = 'https://media.test/long-source.mp4'
  await vue.nextTick()
  lostResponse = true
  await retry.state.analyze()
  assert.ok(retry.state.error.value, '创建响应丢失时保留错误和可重试入口')
  await retry.state.analyze()
  assert.equal(JSON.stringify(entries[1]), JSON.stringify(entries[2]), '创建响应丢失后重用完全相同的 hypitEntry 和幂等键')
  assert.equal(creates, 2, '网络重试没有创建第三个工作区')
  retry.leave()
  console.log(
    'Video replicate: task restore after navigation, no duplicate submit, source-only analysis pricing, account isolation passed'
  )
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
