<template>
  <PageContainer v-if="!open">
    <router-link :to="`/tools/${toolId}`" class="workspace__back">
      <ArrowLeftOutlined />
      返回
    </router-link>
    <FeatureUnavailable />
  </PageContainer>

  <PageContainer v-else>
    <div class="workspace__header">
      <router-link :to="`/tools/${toolId}`" class="workspace__back">
        <ArrowLeftOutlined />
        返回
      </router-link>
      <button type="button" class="workspace__history-toggle" @click="toggleHistory">
        <HistoryOutlined />
        历史
      </button>
    </div>

    <div class="workspace__layout">
      <div class="workspace__main">
        <div class="workspace__card">
          <div class="workspace__title-row">
            <div class="workspace__icon-wrap">
              <VideoCameraOutlined v-if="toolId === 't7'" class="workspace__icon" />
              <FileTextOutlined v-else-if="toolId === 't29'" class="workspace__icon" />
              <MessageOutlined v-else-if="toolId === 't34'" class="workspace__icon" />
              <ThunderboltOutlined v-else-if="toolId === 't36'" class="workspace__icon" />
              <PictureOutlined v-else class="workspace__icon" />
            </div>
            <div>
              <h1 class="workspace__title">{{ title }}</h1>
              <p class="workspace__subtitle">
                {{ isStreamTool ? '流式生成，实时输出' : '提交后自动轮询任务状态' }}
              </p>
            </div>
          </div>

          <div v-if="showImageUpload" class="workspace__field">
            <label class="workspace__label">参考图片（可选）</label>
            <ImageUpload
              :max-count="1"
              :existing-urls="imageUrl ? [imageUrl] : []"
              @upload-complete="onUploadComplete"
              @upload-error="onUploadError"
            />
          </div>

          <div class="workspace__field">
            <label class="workspace__label">描述内容</label>
            <Input.TextArea
              v-model:value="prompt"
              :placeholder="TOOL_PANEL_MAP[toolId]?.placeholder || '输入描述...'"
              :disabled="generating"
              :auto-size="{ minRows: 5, maxRows: 12 }"
              class="workspace__textarea"
            />
          </div>

          <div v-if="cost !== null" class="workspace__cost">
            预计消耗：<strong>{{ cost }}</strong> 算力
          </div>

          <Button
            type="primary"
            block
            size="large"
            class="workspace__generate-btn"
            :loading="generating"
            :disabled="generating || !prompt.trim()"
            @click="handleGenerate"
          >
            <template v-if="generating" #icon>
              <ReloadOutlined :spin="true" />
            </template>
            <template v-else #icon>
              <SendOutlined />
            </template>
            {{ generating ? (isPolling ? '生成中，轮询进度...' : '生成中...') : '开始生成' }}
          </Button>

          <div v-if="showAsyncResult" class="workspace__result">
            <h3 class="workspace__result-title">生成结果</h3>
            <div class="workspace__result-box">
              <p v-if="taskStatus !== null && isPolling" class="workspace__task-status">
                任务 #{{ pendingTaskId }} · {{ statusLabel(taskStatus) }}
              </p>
              <p v-if="taskError" class="workspace__error">{{ taskError }}</p>
              <img
                v-if="resultUrl && taskKind === 'image'"
                :src="resultUrl"
                alt="生成结果"
                class="workspace__result-image"
              />
              <video
                v-if="resultUrl && taskKind === 'video'"
                :src="resultUrl"
                controls
                class="workspace__result-video"
              />
              <a
                v-if="resultUrl && taskKind === 'ppt'"
                :href="resultUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="workspace__ppt-link"
              >
                <ExportOutlined />
                下载 PPT
              </a>
            </div>
          </div>

          <div v-if="showTextResult" class="workspace__result">
            <h3 class="workspace__result-title">生成结果</h3>
            <div class="workspace__result-box">
              <div class="workspace__text-result">
                {{ streamingContent || textResult || '等待输出...' }}
                <span v-if="generating" class="workspace__cursor" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside v-if="showHistory" class="workspace__sidebar">
        <div class="workspace__history-card">
          <h3 class="workspace__history-title">历史记录</h3>
          <div v-if="historyLoading" class="workspace__history-loading">
            <Spin />
          </div>
          <div v-else-if="historyList.length === 0" class="workspace__history-empty">
            暂无历史记录
          </div>
          <div v-else class="workspace__history-list">
            <button
              v-for="item in historyList"
              :key="item.id"
              type="button"
              class="workspace__history-item"
              @click="selectHistoryItem(item)"
            >
              <img
                v-if="item.mediaUrl && imageToolIds.includes(toolId)"
                :src="item.mediaUrl"
                alt=""
                class="workspace__history-thumb"
              />
              <p class="workspace__history-label">{{ item.label }}</p>
              <p class="workspace__history-meta">
                {{ statusLabel(item.status) }}
                <template v-if="item.createTime">
                  · {{ String(item.createTime).slice(0, 10) }}
                </template>
              </p>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Input, Spin } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  SendOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ExportOutlined,
} from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import FeatureUnavailable from '@/components/features/FeatureUnavailable.vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { isToolOpen } from '@/lib/tool-capability'
import { tools } from '@/mock/tools'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'
import {
  cozeChat,
  generateWriteStream,
  generateVolcanArkImage,
  getAiImageMy,
  getAiImageMyPage,
  AI_TASK_STATUS,
  submitVolcanArkVideo,
  getAiVideoMy,
  getAiVideoMyPage,
  createPpt,
  getAiPptMy,
  getAiPptMyPage,
  getPointRuleByModelId,
} from '@/pages/workspace/api'
import { MODEL_ID_VOLCAN_IMAGE, MODEL_ID_VOLCAN_VIDEO } from '@/constants/ai-model'
import { ApiError } from '@/types/api'

const POLL_INTERVAL_MS = 4000

const TOOL_PANEL_MAP: Record<string, { label: string; placeholder: string }> = {
  t5: { label: 'AI商品图', placeholder: '描述商品主体、风格、背景要求...' },
  t31: { label: 'AI海报', placeholder: '描述海报主题、风格、文案内容...' },
  t32: { label: 'AI Logo', placeholder: '描述品牌名称、行业、风格偏好...' },
  t7: { label: 'AI带货视频', placeholder: '描述产品卖点、视频风格、时长要求...' },
  t29: { label: 'LivePPT', placeholder: '输入 PPT 主题和内容要点...' },
  t34: { label: 'AI文案', placeholder: '输入文案需求，包括用途、风格、字数...' },
  t36: { label: 'AI Agent', placeholder: '输入你的问题或需求...' },
}

const IMAGE_TOOL_IDS = ['t5', 't7', 't31', 't32'] as const

type TaskKind = 'image' | 'video' | 'ppt'

interface HistoryItem {
  id: number
  label: string
  status: number
  mediaUrl?: string
  createTime?: string
}

interface PollResult {
  status: number
  done: boolean
  resultUrl?: string
  error?: string
  successMsg?: string
  errorMsg?: string
}

const route = useRoute()
const { isLoggedIn, openLogin } = useAuth()
const { addToast } = useToast()

const toolId = computed(() => (route.query.tool as string) ?? '')
const tool = computed(() => tools.find((t) => t.id === toolId.value))
const title = computed(
  () => tool.value?.name ?? TOOL_PANEL_MAP[toolId.value]?.label ?? '创作工作台'
)
const open = computed(() => isToolOpen(toolId.value))
const isStreamTool = computed(() => toolId.value === 't34' || toolId.value === 't36')
const showImageUpload = computed(() =>
  IMAGE_TOOL_IDS.includes(toolId.value as (typeof IMAGE_TOOL_IDS)[number])
)
const imageToolIds = IMAGE_TOOL_IDS as unknown as string[]

const prompt = ref('')
const generating = ref(false)
const cost = ref<number | null>(null)
const showHistory = ref(false)
const historyList = ref<HistoryItem[]>([])
const historyLoading = ref(false)

const imageUrl = ref<string | null>(null)

const streamingContent = ref('')
const textResult = ref<string | null>(null)
const abortRef = ref<AbortController | null>(null)

const pendingTaskId = ref<number | null>(null)
const taskKind = ref<TaskKind | null>(null)
const taskStatus = ref<number | null>(null)
const resultUrl = ref<string | null>(null)
const taskError = ref<string | null>(null)

const showAsyncResult = computed(
  () => pendingTaskId.value !== null || resultUrl.value || taskError.value
)
const showTextResult = computed(
  () => isStreamTool.value && (streamingContent.value || textResult.value)
)

function statusLabel(status: number): string {
  if (status === AI_TASK_STATUS.SUCCESS) return '已完成'
  if (status === AI_TASK_STATUS.FAIL) return '失败'
  if (status === AI_TASK_STATUS.IN_PROGRESS || status === AI_TASK_STATUS.PROCESSING) {
    return '生成中'
  }
  return '处理中'
}

function resetTaskResult() {
  stopPolling()
  pendingTaskId.value = null
  taskKind.value = null
  taskStatus.value = null
  resultUrl.value = null
  taskError.value = null
  textResult.value = null
  streamingContent.value = ''
}

async function fetchTaskStatus(): Promise<PollResult> {
  const id = pendingTaskId.value
  const kind = taskKind.value
  if (!id || !kind) return { status: 0, done: true }

  if (kind === 'image') {
    const record = await getAiImageMy(id)
    taskStatus.value = record.status
    if (record.status === AI_TASK_STATUS.SUCCESS && record.picUrl) {
      return {
        status: record.status,
        done: true,
        resultUrl: record.picUrl,
        successMsg: '图片生成完成',
      }
    }
    if (record.status === AI_TASK_STATUS.FAIL) {
      return {
        status: record.status,
        done: true,
        error: record.errorMessage || '图片生成失败',
        errorMsg: '图片生成失败',
      }
    }
    return { status: record.status, done: false }
  }

  if (kind === 'video') {
    const record = await getAiVideoMy(id)
    taskStatus.value = record.status
    if (record.status === AI_TASK_STATUS.SUCCESS && record.videoUrl) {
      return {
        status: record.status,
        done: true,
        resultUrl: record.videoUrl,
        successMsg: '视频生成完成',
      }
    }
    if (record.status === AI_TASK_STATUS.FAIL) {
      return {
        status: record.status,
        done: true,
        error: record.errorMessage || '视频生成失败',
        errorMsg: '视频生成失败',
      }
    }
    return { status: record.status, done: false }
  }

  const record = await getAiPptMy(id)
  taskStatus.value = record.status
  if (record.status === AI_TASK_STATUS.SUCCESS && record.downloadUrl) {
    return {
      status: record.status,
      done: true,
      resultUrl: record.downloadUrl,
      successMsg: 'PPT 生成完成',
    }
  }
  if (record.status === AI_TASK_STATUS.FAIL) {
    return {
      status: record.status,
      done: true,
      error: record.errorMessage || 'PPT 生成失败',
      errorMsg: 'PPT 生成失败',
    }
  }
  return { status: record.status, done: false }
}

const {
  polling: isPolling,
  start: startPolling,
  stop: stopPolling,
} = usePolling<PollResult>({
  interval: POLL_INTERVAL_MS,
  fetcher: fetchTaskStatus,
  shouldStop: (data) => data.done,
  onData: (data) => {
    if (data.resultUrl) {
      resultUrl.value = data.resultUrl
      generating.value = false
      if (data.successMsg) addToast(data.successMsg, 'success')
    }
    if (data.error) {
      taskError.value = data.error
      generating.value = false
      if (data.errorMsg) addToast(data.errorMsg, 'error')
    }
  },
  onError: () => {
    // 继续轮询
  },
})

onMounted(async () => {
  try {
    const rule = await getPointRuleByModelId(MODEL_ID_VOLCAN_IMAGE)
    cost.value = rule.costPoint
  } catch {
    cost.value = 20
  }
})

function onUploadComplete(urls: string[]) {
  imageUrl.value = urls[0] ?? null
}

function onUploadError(msg: string) {
  addToast(msg, 'error')
  imageUrl.value = null
}

async function handleSseStream(fetchStream: () => Promise<Response>) {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }

  generating.value = true
  resetTaskResult()
  streamingContent.value = ''

  const controller = new AbortController()
  abortRef.value = controller

  try {
    const response = await fetchStream()
    const reader = response.body?.getReader()
    if (!reader) {
      addToast('无法读取响应流', 'error')
      return
    }

    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      accumulated += decoder.decode(value, { stream: true })
      streamingContent.value = accumulated
    }

    textResult.value = accumulated
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return
    if (e instanceof ApiError && e.code === 401) return
    addToast(e instanceof Error ? e.message : '流式请求失败', 'error')
  } finally {
    generating.value = false
    abortRef.value = null
  }
}

async function handleGenerate() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (!prompt.value.trim()) {
    addToast('请输入描述内容', 'error')
    return
  }

  generating.value = true
  resetTaskResult()

  try {
    switch (toolId.value) {
      case 't5':
      case 't31':
      case 't32': {
        const taskId = await generateVolcanArkImage({
          prompt: prompt.value,
          image: imageUrl.value ? [imageUrl.value] : undefined,
          modelId: MODEL_ID_VOLCAN_IMAGE,
        })
        pendingTaskId.value = taskId
        taskKind.value = 'image'
        taskStatus.value = AI_TASK_STATUS.IN_PROGRESS
        startPolling()
        addToast('图片生成任务已提交', 'success')
        break
      }

      case 't7': {
        const taskId = await submitVolcanArkVideo({
          prompt: prompt.value,
          imageUrls: imageUrl.value ? [imageUrl.value] : undefined,
          modelId: MODEL_ID_VOLCAN_VIDEO,
        })
        pendingTaskId.value = taskId
        taskKind.value = 'video'
        taskStatus.value = AI_TASK_STATUS.IN_PROGRESS
        startPolling()
        addToast('视频生成任务已提交', 'success')
        break
      }

      case 't29': {
        const taskId = await createPpt({
          modelId: MODEL_ID_VOLCAN_IMAGE,
          title: prompt.value.slice(0, 50),
          text: prompt.value,
        })
        pendingTaskId.value = taskId
        taskKind.value = 'ppt'
        taskStatus.value = AI_TASK_STATUS.IN_PROGRESS
        startPolling()
        addToast('PPT 生成任务已提交', 'success')
        break
      }

      case 't34':
        await handleSseStream(() =>
          generateWriteStream({
            type: 1,
            length: 1,
            format: 1,
            tone: 1,
            language: 1,
            prompt: prompt.value,
          })
        )
        return

      case 't36':
        await handleSseStream(() => cozeChat({ query: prompt.value }))
        return
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '生成失败'
    addToast(msg, 'error')
    generating.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    let items: HistoryItem[] = []

    if (['t5', 't31', 't32'].includes(toolId.value)) {
      const resp = await getAiImageMyPage(1, 10)
      items = resp.list.map((i) => ({
        id: i.id,
        label: (i.prompt || '图片').slice(0, 40),
        status: i.status,
        mediaUrl: i.picUrl,
        createTime: i.createTime,
      }))
    } else if (toolId.value === 't7') {
      const resp = await getAiVideoMyPage(1, 10)
      items = resp.list.map((i) => ({
        id: i.id,
        label: (i.prompt || '视频').slice(0, 40),
        status: i.status,
        mediaUrl: i.videoUrl,
        createTime: i.createTime,
      }))
    } else if (toolId.value === 't29') {
      const resp = await getAiPptMyPage(1, 10)
      items = resp.list.map((i) => ({
        id: i.id,
        label: (typeof i.text?.title === 'string' ? i.text.title : 'PPT').slice(0, 40),
        status: i.status,
        mediaUrl: i.downloadUrl,
        createTime: i.createTime,
      }))
    }

    historyList.value = items
  } catch {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

function toggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) loadHistory()
}

function selectHistoryItem(item: HistoryItem) {
  if (item.mediaUrl) resultUrl.value = item.mediaUrl
  if (['t5', 't31', 't32'].includes(toolId.value)) {
    taskKind.value = 'image'
  } else if (toolId.value === 't7') {
    taskKind.value = 'video'
  } else if (toolId.value === 't29') {
    taskKind.value = 'ppt'
  }
  taskStatus.value = item.status
  pendingTaskId.value = item.id
  stopPolling()
  generating.value = false
}
</script>

<style scoped lang="scss">
.workspace {
  &__back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 16px;
    font-size: 14px;
    color: var(--color-ink-secondary);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--color-creative-violet);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .workspace__back {
      margin-bottom: 0;
    }
  }

  &__history-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: var(--color-ink-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--color-creative-violet);
    }
  }

  &__layout {
    display: flex;
    gap: 24px;
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__card {
    padding: 24px;
    border-radius: 12px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);

    @media (min-width: 768px) {
      padding: 32px;
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  &__icon-wrap {
    display: flex;
    height: 40px;
    width: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(109, 40, 217, 0.1);
  }

  &__icon {
    font-size: 20px;
    color: var(--color-creative-violet);
  }

  &__title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-ink-primary);
    margin: 0;
  }

  &__subtitle {
    font-size: 14px;
    color: var(--color-ink-secondary);
    margin: 0;
  }

  &__field {
    margin-bottom: 16px;
  }

  &__label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__textarea {
    border-radius: 12px !important;
    font-size: 14px;
  }

  &__cost {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 8px;
    background: #fffbeb;
    padding: 8px 12px;
    font-size: 12px;
    color: #b45309;
  }

  &__generate-btn {
    height: 44px;
    border-radius: 12px;
    background: var(--color-creative-violet);
    border-color: var(--color-creative-violet);

    &:hover:not(:disabled) {
      background: rgba(109, 40, 217, 0.9);
      border-color: rgba(109, 40, 217, 0.9);
    }
  }

  &__result {
    margin-top: 24px;
  }

  &__result-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__result-box {
    border-radius: 12px;
    border: 1px solid var(--color-border-whisper);
    background: var(--color-canvas-mist);
    padding: 16px;
  }

  &__task-status {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__error {
    margin: 0;
    font-size: 14px;
    color: #dc2626;
  }

  &__result-image {
    max-height: 384px;
    width: 100%;
    border-radius: 8px;
    object-fit: contain;
  }

  &__result-video {
    max-height: 384px;
    width: 100%;
    border-radius: 8px;
  }

  &__ppt-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--color-creative-violet);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__text-result {
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.625;
    color: var(--color-ink-primary);
  }

  &__cursor {
    display: inline-block;
    margin-left: 2px;
    height: 16px;
    width: 6px;
    animation: pulse 1s ease-in-out infinite;
    background: var(--color-creative-violet);
  }

  &__sidebar {
    width: 288px;
    flex-shrink: 0;
  }

  &__history-card {
    padding: 16px;
    border-radius: 12px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);
  }

  &__history-title {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__history-loading {
    display: flex;
    justify-content: center;
    padding: 32px 0;
  }

  &__history-empty {
    padding: 32px 0;
    text-align: center;
    font-size: 14px;
    color: var(--color-ink-muted);
  }

  &__history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__history-item {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid var(--color-border-whisper);
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--color-creative-violet);
    }
  }

  &__history-thumb {
    margin-bottom: 8px;
    height: 64px;
    width: 100%;
    border-radius: 4px;
    object-fit: cover;
  }

  &__history-label {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--color-ink-primary);
  }

  &__history-meta {
    margin: 4px 0 0;
    font-size: 10px;
    color: var(--color-ink-muted);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
