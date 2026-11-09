<template>
  <PageContainer class-name="agent-workspace">
    <header class="agent-workspace__header">
      <div><router-link to="/space">我的工作区</router-link><h1>{{ data?.workspace.title || '创作工作区' }}</h1></div>
      <span role="status">{{ connectionLabel }}</span>
      <Button :loading="loading" @click="refresh">刷新</Button>
    </header>
    <p v-if="error" class="agent-workspace__error" role="alert">{{ error }}</p>
    <div v-if="!isLoggedIn" class="agent-workspace__empty"><Button type="primary" @click="openLogin">登录后查看工作区</Button></div>
    <Spin v-else-if="!data" :spinning="loading"><div class="agent-workspace__empty">{{ loading ? '加载工作区…' : '工作区暂不可用' }}</div></Spin>
    <div v-else class="agent-workspace__layout">
      <section class="agent-workspace__conversation" aria-label="创作会话">
        <div ref="messagesElement" class="agent-workspace__messages scroll-area">
          <article v-for="item in data.messages" :key="item.id" class="agent-workspace__message" :data-role="item.role">
            <header>{{ item.role === 'user' ? '你' : item.role === 'tool' ? toolLabels[item.toolName] || item.toolName : '创作 Agent' }}</header>
            <details v-if="item.role === 'tool'"><summary>工具执行结果</summary><pre>{{ messageText(item) }}</pre></details>
            <p v-else>{{ messageText(item) || (item.hasToolCalls ? '安排制作工具' : '') }}</p>
          </article>
        </div>
        <form class="agent-workspace__composer" @submit.prevent="send">
          <label for="agent-message">继续描述需要调整的内容</label>
          <Input.TextArea id="agent-message" v-model:value="text" :maxlength="12000" :auto-size="{ minRows: 3, maxRows: 6 }" :disabled="sending" placeholder="例如：保留角色和产品，把开场改得更紧凑" />
          <details><summary>补充参考图片</summary><ImageUpload require-login :max-count="10" :file-size="10" :existing-urls="attachmentUrls" @upload-complete="attachmentUrls = $event" /></details>
          <div class="agent-workspace__composer-actions">
            <label>语言模型<Select v-model:value="chatModel" :options="chatModels" :disabled="sending" /></label>
            <label>新一轮媒体预算<InputNumber v-model:value="budget" :min="0.0001" :max="1000000000" :precision="4" /></label>
            <Button html-type="submit" type="primary" :loading="sending" :disabled="!text.trim() || !budget">{{ active ? '发送并排队' : '发送给 Agent' }}</Button>
          </div>
          <small>本轮允许在预算内制作；生成工具执行前会检查预算，实际积分按媒体任务结算。</small>
        </form>
      </section>
      <aside class="agent-workspace__artifacts scroll-area">
        <HypitProjectPanel :workspace-id="Number(route.params.id)" :cursor="data.cursor" :assets="data.assets" :source-video-ids="data.workspace.entry.sourceVideoIds || []" :duration="data.workspace.entry.generation?.duration || 5" />
        <section class="agent-workspace__panel">
          <h2>执行进度</h2>
          <div v-for="run in data.runs.slice(0, 5)" :key="run.id" class="agent-workspace__run">
            <div><strong>第 {{ run.id }} 轮 · {{ runLabels[run.status] || run.status }}</strong><Button v-if="activeStates.has(run.status)" size="small" :disabled="stopping" @click="stop(run.id)">停止后续步骤</Button></div>
            <small>媒体预算 {{ points(run.budget_points) }} · 已安排 {{ points(run.reserved_points) }} · 模型调用 {{ run.model_rounds }} 次</small>
            <p v-if="run.error_message" class="agent-workspace__error" role="alert">{{ run.error_message }}</p>
            <details v-if="run.plan"><summary>查看分镜计划</summary><pre>{{ JSON.stringify(run.plan, null, 2) }}</pre></details>
            <ol><li v-for="step in stepsFor(run.id)" :key="step.id">{{ step.step_type === 'MODEL' ? '语言模型理解与决策' : toolLabels[step.tool_name || ''] || step.tool_name }} · {{ stepLabels[step.state] || step.state }}<span v-if="step.canvas_task_id"> · 任务 #{{ step.canvas_task_id }}</span><p v-if="step.error_message" class="agent-workspace__error" role="alert">{{ step.error_message }}</p></li></ol>
          </div>
          <p>可用积分 {{ points(data.balance.availablePoints) }} · 冻结 {{ points(data.balance.frozenPoints) }}</p>
        </section>
        <section class="agent-workspace__panel">
          <h2>生成结果 <span>{{ results.length }}</span></h2>
          <p v-if="!results.length" class="agent-workspace__hint">Agent 提交生成后，结果会保存在这里。离开页面不影响后台执行。</p>
          <figure v-for="asset in results" :key="asset.id" class="agent-workspace__result">
            <video v-if="asset.media_type === 'video'" :src="asset.url" controls playsinline preload="metadata" />
            <img v-else-if="asset.media_type === 'image'" :src="asset.url" alt="生成图片" loading="lazy" />
            <figcaption>素材 #{{ asset.id }} · 任务 #{{ asset.origin_task_id }} <a :href="asset.url" target="_blank" rel="noopener noreferrer">打开原文件</a></figcaption>
          </figure>
        </section>
        <section class="agent-workspace__panel">
          <h2>参考素材 <span>{{ references.length }}</span></h2>
          <div class="agent-workspace__references scroll-area">
            <figure v-for="asset in references" :key="asset.id">
              <video v-if="asset.media_type === 'video'" :src="asset.url" controls playsinline preload="metadata" />
              <img v-else-if="asset.media_type === 'image'" :src="asset.url" alt="参考图片" loading="lazy" />
              <figcaption>#{{ asset.id }} {{ asset.purpose === 'source_video' ? '原视频，仅用于理解' : '参考图' }}</figcaption>
            </figure>
          </div>
          <ul><li v-for="binding in data.workspace.entry.bindings" :key="binding.entityId">{{ binding.entityId }}：{{ binding.target }} · 素材 {{ binding.assetIds.join('、') }}</li></ul>
        </section>
      </aside>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Input, InputNumber, Select, Spin } from 'ant-design-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import HypitProjectPanel from './HypitProjectPanel.vue'
import { useAuth } from '@/composables/useAuth'
import { subscribeWorkspace, type SocketState } from '@/service/workspaceSocket'
import { getAgentConfiguration, getWorkspace, resolveAssets, sendWorkspaceMessage, stopAgentRun, type WorkspaceSnapshot, type WorkspaceMessage } from './api'

const route = useRoute()
const { isLoggedIn, sessionVersion, openLogin, fetchUserInfo } = useAuth()
const data = ref<WorkspaceSnapshot>()
const loading = ref(false), sending = ref(false), stopping = ref(false)
const error = ref(''), text = ref(''), attachmentUrls = ref<string[]>([])
const budget = ref<number>()
const chatModel = ref<string>()
const chatModels = ref<{ label: string; value: string }[]>([])
const connection = ref<SocketState>('connecting')
const messagesElement = ref<HTMLElement>()
const activeStates = new Set(['QUEUED', 'RUNNING', 'WAITING_TOOL'])
const active = computed(() => data.value?.runs.some((run) => activeStates.has(run.status)))
const connectionLabel = computed(() => ({ connecting: '连接中', connected: '实时同步已连接', reconnecting: '正在重连，任务继续执行', unauthorized: '登录或工作区权限已失效' }[connection.value]))
const runLabels: Record<string, string> = { QUEUED: '排队中', RUNNING: 'Agent 执行中', WAITING_TOOL: '等待媒体任务', WAITING_INPUT: '等待补充', COMPLETED: '本轮完成', FAILED: '本轮失败', REVIEW: '结果待核对', STOPPED: '已停止后续步骤' }
const stepLabels: Record<string, string> = { READY: '待执行', STARTED: '执行中', WAITING: '生成中', SUCCESS: '完成', FAILED: '未完成', UNKNOWN: '待核对' }
const toolLabels: Record<string, string> = { get_workspace_context: '读取创作上下文', save_plan: '保存分镜计划', generate_image: '生成参考图片', generate_video: '生成视频', get_task_result: '查询任务', publish_result: '发布产物', ask_user: '补充需求', render_project: '构建 Hypit 工程', read_hypit_skill: '读取已安装 Skill', read_hypit_vocabulary: '查询实际语法', inspect_media: '检查视频与抽帧', check_hypit_project: '检查实际源码', write_hypit_project: '保存源码并构建', read_hypit_project: '读取实际源码', review_hypit_result: '复核实际成片' }
const uniqueAssets = computed(() => [...new Map((data.value?.assets || []).map((asset) => [`${asset.id}:${asset.purpose}`, asset])).values()])
const results = computed(() => uniqueAssets.value.filter((asset) => asset.purpose === 'result'))
const references = computed(() => uniqueAssets.value.filter((asset) => !['result', 'analysis'].includes(asset.purpose)))
const stepsFor = (runId: number) => (data.value?.steps || []).filter((step) => step.run_id === runId).reverse()
const points = (value: number) => Number(value || 0).toFixed(4)
function messageText(message: WorkspaceMessage) {
  if (typeof message.content === 'string') {
    if (message.role !== 'tool') return message.content
    try { return JSON.stringify(JSON.parse(message.content), null, 2) } catch { return message.content }
  }
  return (message.content || []).map((part) => part.type === 'text' ? part.text || '' : `参考素材 #${part.assetId}`).join('\n')
}
let closed = false, epoch = 0, refreshing = false, refreshAgain = false
let unsubscribe: (() => void) | undefined
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let fallbackTimer: ReturnType<typeof setTimeout> | undefined
let retryKey = '', retryBody = ''
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => void refresh(), 200) }
async function refresh() {
  if (!isLoggedIn.value || closed) return
  if (refreshing) { refreshAgain = true; return }
  const currentEpoch = epoch, id = Number(route.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) { error.value = '工作区编号无效'; return }
  refreshing = true; loading.value = true
  try {
    const [snapshot, configuration] = await Promise.all([getWorkspace(id), getAgentConfiguration()])
    if (closed || currentEpoch !== epoch) return
    const scroll = messagesElement.value
    const atBottom = !scroll || scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100
    data.value = snapshot; error.value = ''
    chatModels.value = configuration.chatModels.map((item) => ({ label: item.name, value: item.id }))
    if (chatModel.value === undefined) chatModel.value = snapshot.workspace.entry.chatModel || configuration.chatModels[0]?.id
    if (budget.value === undefined) budget.value = Number(snapshot.runs[0]?.budget_points || snapshot.workspace.entry.budgetPoints)
    if (!unsubscribe) unsubscribe = subscribeWorkspace(id, snapshot.cursor, scheduleRefresh, (value) => { connection.value = value })
    void fetchUserInfo()
    if (atBottom) { await nextTick(); messagesElement.value?.scrollTo({ top: messagesElement.value.scrollHeight }) }
  } catch (e: unknown) { if (!closed && currentEpoch === epoch) error.value = e instanceof Error ? e.message : '工作区加载失败' }
  finally {
    refreshing = false; loading.value = false
    if (refreshAgain) { refreshAgain = false; scheduleRefresh() }
  }
}
async function send() {
  if (!data.value || sending.value || !text.value.trim() || !budget.value) return
  sending.value = true; error.value = ''
  const currentEpoch = epoch, conversationId = data.value.conversationId
  const content = text.value.trim(), urls = [...attachmentUrls.value], amount = budget.value
  try {
    const assets = urls.length ? await resolveAssets(urls) : []
    if (closed || currentEpoch !== epoch) return
    const body = { text: content, assetIds: assets.map((asset) => asset.id), budgetPoints: amount, chatModel: chatModel.value }
    const signature = JSON.stringify(body)
    if (retryBody !== signature || !retryKey) { retryBody = signature; retryKey = crypto.randomUUID() }
    await sendWorkspaceMessage(conversationId, { ...body, clientMessageId: retryKey })
    if (closed || currentEpoch !== epoch) return
    retryKey = ''; if (text.value.trim() === content) text.value = ''; attachmentUrls.value = []
    await refresh()
  } catch (e: unknown) { if (!closed && currentEpoch === epoch) error.value = e instanceof Error ? e.message : '发送失败' }
  finally { sending.value = false }
}
async function stop(id: number) {
  const currentEpoch = epoch
  stopping.value = true
  try { await stopAgentRun(id); if (!closed && currentEpoch === epoch) await refresh() }
  catch (e: unknown) { if (!closed && currentEpoch === epoch) error.value = e instanceof Error ? e.message : '停止请求失败' }
  finally { stopping.value = false }
}
function fallback() {
  if (closed) return
  if ((connection.value !== 'connected' || active.value) && isLoggedIn.value) void refresh()
  fallbackTimer = setTimeout(fallback, 10000)
}
watch([() => route.params.id, isLoggedIn, sessionVersion], () => {
  epoch += 1; unsubscribe?.(); unsubscribe = undefined; clearTimeout(refreshTimer)
  data.value = undefined; error.value = ''; text.value = ''; attachmentUrls.value = []; budget.value = undefined; chatModel.value = undefined
  retryKey = ''; retryBody = ''; connection.value = 'connecting'
  void refresh()
}, { immediate: true })
fallback()
onBeforeUnmount(() => { closed = true; epoch += 1; unsubscribe?.(); clearTimeout(refreshTimer); clearTimeout(fallbackTimer) })
</script>

<style scoped lang="scss" src="./index.scss"></style>
