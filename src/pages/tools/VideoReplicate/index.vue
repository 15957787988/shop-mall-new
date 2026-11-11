<template>
  <PageContainer flush>
    <div class="replicate">
      <header class="replicate__header">
        <div>
          <p>保留原片节奏，用你的素材重新创作</p>
        </div>
        <ol class="replicate__steps" aria-label="复刻流程">
          <li :class="{ 'is-current': !activeTask }"><span>1</span>上传素材</li>
          <li :class="{ 'is-current': activeTask?.status === 'ANALYZING' }">
            <span>2</span>自动反推
          </li>
          <li
            :class="{
              'is-current': activeTask?.status === 'GENERATING' || activeTask?.status === 'SUCCESS',
            }"
          >
            <span>3</span>直接生成
          </li>
        </ol>
      </header>
      <div class="replicate__layout">
        <section class="replicate__card replicate__materials">
          <div class="replicate__materials-scroll scroll-area">
            <div class="replicate__section-heading">
              <h2>参考素材</h2>
              <span>未替换的内容沿用原片</span>
            </div>
            <fieldset :disabled="formLocked">
              <legend>原视频 <span class="replicate__required">必填</span></legend>
              <UploadFile
                :model-value="videos"
                drag
                :limit="1"
                :file-size="50"
                :file-type="['mp4', 'mov']"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                :is-show-tip="false"
                @update:model-value="updateVideos"
              >
                <div class="replicate__video-drop">
                  <VideoCameraOutlined /><strong>{{
                    materials.videoUrl ? '参考视频已上传' : '点击或拖拽上传视频'
                  }}</strong
                  ><span>MP4 / MOV · 最大 50MB · 仅用于豆包反推，不限制原片时长</span>
                </div>
              </UploadFile>
              <video
                v-if="materials.videoUrl"
                :src="materials.videoUrl"
                controls
                preload="metadata"
              />
            </fieldset>
            <div class="replicate__reverse">
              <Button
                :class="{ 'is-ready': reversedPrompt }"
                :loading="analyzing"
                :disabled="!reversedPrompt && !canReverse"
                @click="reversePrompt"
                >{{ reversedPrompt ? '查看提示词' : '反推提示词' }}</Button
              >
            </div>
            <div class="replicate__section-heading replicate__optional-heading">
              <h3>替换参考图</h3>
              <span>可选 · 支持多个对象</span>
            </div>
            <div v-for="role in roles" :key="role.kind" class="replicate__replacement-group">
              <div class="replicate__section-heading">
                <h3>{{ role.label }}替换</h3>
                <Button
                  size="small"
                  :disabled="formLocked || materials.replacements.length >= 30"
                  @click="addReplacement(role.kind)"
                  >＋ 添加{{ role.label }}</Button
                >
              </div>
              <p
                v-if="!materials.replacements.some((item) => item.kind === role.kind)"
                class="replicate__group-empty"
              >
                保留原视频{{ role.label }}，需要替换时添加
              </p>
              <fieldset
                v-for="item in materials.replacements.filter((item) => item.kind === role.kind)"
                :key="item.id"
                :disabled="formLocked"
                class="replicate__replacement-item"
              >
                <legend class="replicate__replacement-legend">{{ role.label }} · {{ item.id }}</legend>
                <div class="replicate__replacement-header">
                  <div class="replicate__replacement-title">
                    <strong>{{ role.label }}参考</strong>
                    <span>{{ item.id }}</span>
                  </div>
                  <Button
                    class="replicate__remove"
                    size="small"
                    type="text"
                    danger
                    :disabled="formLocked"
                    :aria-label="`删除${item.id}`"
                    @click="removeReplacement(item.id)"
                    ><DeleteOutlined />删除</Button
                  >
                </div>
                <label :for="`target-${item.id}`">原视频中的替换目标</label>
                <Input
                  :id="`target-${item.id}`"
                  v-model:value="item.target"
                  :disabled="formLocked"
                  :maxlength="300"
                  :placeholder="role.description"
                />
                <ImageUpload
                  :key="item.id"
                  require-login
                  preview
                  :max-count="Math.min(maxImages, 30)"
                  :file-size="10"
                  :existing-urls="item.imageUrls"
                  empty-desc="同一对象可上传多个角度，图片顺序用于素材绑定"
                  @upload-complete="item.imageUrls = $event"
                />
              </fieldset>
            </div>
            <p class="replicate__upload-note">
              参考图 {{ imageCount }} / {{ maxImages }} 张 · 同一对象可上传多个角度
            </p>
            <p v-if="materialsError" class="replicate__error" role="alert">{{ materialsError }}</p>
            <fieldset :disabled="formLocked" class="replicate__settings">
              <legend>生成设置</legend>
              <label
                >视频模型<Select
                  v-model:value="modelId"
                  :loading="modelsLoading"
                  :options="modelOptions"
                  placeholder="选择视频模型"
              /></label>
              <div class="replicate__settings-grid">
                <label v-if="ratioOptions.length"
                  >比例<Select v-model:value="aspect" :options="ratioOptions"
                /></label>
                <label v-if="resolutionOptions.length"
                  >清晰度<Select v-model:value="resolution" :options="resolutionOptions"
                /></label>
              </div>
              <label v-if="currentModel"
                >时长 {{ duration }} 秒<Slider
                  v-model:value="duration"
                  :min="durationMin"
                  :max="durationMax"
                  :step="1"
              /></label>
              <div v-if="currentModel" class="replicate__audio">
                <div class="replicate__section-heading">
                  <h3>参考音频</h3><span>可选</span>
                </div>
                <template v-if="maxAudios > 0">
                  <p>最多 {{ maxAudios }} 段 · 合计不超过 {{ maxAudioDuration }} 秒</p>
                  <UploadFile
                    :model-value="refAudios"
                    drag
                    :disabled="formLocked"
                    :limit="maxAudios"
                    :file-size="15"
                    :is-show-tip="false"
                    :file-type="['mp3', 'wav']"
                    accept="audio/mpeg,audio/wav,.mp3,.wav"
                    :before-upload-hook="beforeAudioUpload"
                    :before-library-select="validateAudios"
                    @update:model-value="updateAudios"
                  >
                    <div class="replicate__video-drop">
                      <SoundOutlined /><strong>点击或拖拽上传音频</strong>
                      <span>MP3 / WAV · 单段小于 15MB</span>
                    </div>
                  </UploadFile>
                  <audio v-for="url in refAudios" :key="url" :src="url" controls preload="metadata" />
                  <p>音频作为生成参考传给视频模型，效果取决于模型能力。</p>
                </template>
                <p v-else>当前模型不支持参考音频</p>
              </div>
            </fieldset>
          </div>
          <div class="replicate__form-footer">
            <div class="replicate__analyze-action">
              <Button type="primary" :loading="submitting" :disabled="!canAnalyze" @click="analyze"
                ><ThunderboltOutlined />{{ submitting ? '正在准备复刻' : '一键复刻' }}</Button
              >
            </div>
            <p class="replicate__cost" v-if="currentModel">{{ pointsText }}</p>
            <p class="replicate__cost" v-if="currentModel?.pricing?.billingSource === 'LOCAL_TARIFF'">前2张参考图免费，超额图另计；原视频仅用于豆包反推，不收生成参考视频费用。</p>
            <p v-if="submitting" role="status">
              正在保存任务，后台会继续反推和生成，可以离开页面。
            </p>
            <p v-if="error" class="replicate__error" role="alert">{{ error }}</p>
          </div>
        </section>
        <main class="studio__results replicate__results scroll-area">
          <header class="replicate__results-heading">
            <h2>
              复刻记录 <span v-if="total">{{ total }}</span>
            </h2>
            <Button size="small" :loading="historyLoading" @click="refreshHistory">刷新</Button>
          </header>
          <p v-if="historyError" class="replicate__error" role="alert">{{ historyError }}</p>
          <div v-if="!tasks.length" class="studio__empty">
            {{
              historyLoading
                ? '正在加载复刻记录…'
                : isLoggedIn
                ? '还没有复刻视频，上传素材后开始生成。'
                : '登录后查看复刻记录'
            }}
          </div>
          <article v-for="{ task, work } in cards" :key="task.id" class="studio__card">
            <header class="studio__card-head">
              <span class="studio__card-model">{{
                work.modelName || work.model || `复刻任务 #${task.id}`
              }}</span>
              <span
                class="studio__card-status"
                :data-fail="task.status === 'FAILED' || task.status === 'UNKNOWN'"
                >{{ statusLabels[task.status] }}</span
              >
              <time class="studio__card-time">{{
                task.createdAt.replace('T', ' ').slice(0, 16)
              }}</time>
            </header>
            <p v-if="work.prompt" class="studio__card-prompt">{{ work.prompt }}</p>
            <StudioParams :work="work" />
            <p v-if="task.errorMessage" class="studio__card-error" role="alert">
              {{ task.errorMessage }}
            </p>
            <p
              v-if="task.canvasTaskId && workErrors[task.canvasTaskId]"
              class="studio__card-error"
              role="alert"
            >
              {{ workErrors[task.canvasTaskId] }}
            </p>
            <div class="studio__media">
              <button
                v-if="task.resultUrl"
                type="button"
                class="studio__poster"
                aria-label="播放复刻视频"
                @click="openPreview(task)"
              >
                <video
                  :src="task.resultUrl"
                  muted
                  playsinline
                  preload="metadata"
                  tabindex="-1"
                  @loadedmetadata="paintThumb"
                />
                <span class="studio__play" aria-hidden="true" />
              </button>
              <span v-else class="studio__media-wait">
                <Spin v-if="pendingStatuses.has(task.status)" size="small" />
                {{ taskDescription(task) }}
              </span>
            </div>
            <div class="studio__actions replicate__card-actions">
              <a :href="task.sourceVideoUrl" target="_blank" rel="noopener noreferrer"
                >查看原视频 · #{{ task.id }}</a
              >
              <button
                type="button"
                class="studio__action"
                title="下载"
                aria-label="下载复刻视频"
                :disabled="!task.resultUrl || downloadingId === task.id"
                @click="handleDownload(task)"
              >
                <DownloadOutlined />
              </button>
            </div>
          </article>
          <Pagination
            v-if="total > 10"
            v-model:current="historyPage"
            :total="total"
            :page-size="10"
            :show-size-changer="false"
            size="small"
            @change="fetchHistory"
          />
        </main>
      </div>
    </div>
    <Modal
      v-model:open="previewOpen"
      :footer="null"
      width="1080px"
      centered
      destroy-on-close
      wrap-class-name="studio-preview"
    >
      <div v-if="previewTask && previewWork" class="studio-preview__body">
        <div class="studio-preview__stage">
          <video :src="previewTask.resultUrl || ''" controls autoplay playsinline />
          <div class="studio-preview__bar">
            <button
              type="button"
              :disabled="downloadingId === previewTask.id"
              @click="handleDownload(previewTask)"
            >
              <DownloadOutlined />下载
            </button>
          </div>
        </div>
        <aside class="studio-preview__prompt">
          <h3>提示词</h3>
          <div class="studio-preview__text">
            {{
              previewWork.prompt ||
              (previewTask.canvasTaskId && workErrors[previewTask.canvasTaskId]) ||
              '暂无提示词'
            }}
          </div>
          <StudioParams :work="previewWork" inset />
          <StudioReferences :work="previewWork" :source-video-url="previewTask.sourceVideoUrl" />
          <button
            type="button"
            class="studio-preview__copy"
            :disabled="!previewWork.prompt"
            @click="copyPrompt(previewWork.prompt)"
          >
            <CopyOutlined />复制
          </button>
        </aside>
      </div>
    </Modal>
    <Modal v-model:open="promptOpen" title="反推提示词" :footer="null" width="640px" centered>
      <div class="replicate__prompt-modal">
        <Input.TextArea v-model:value="promptText" :auto-size="{ minRows: 12, maxRows: 18 }" />
        <button
          type="button"
          class="replicate__prompt-copy"
          :disabled="!promptText.trim()"
          @click="copyPrompt(promptText)"
        >
          <CopyOutlined />一键复制
        </button>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Button, Input, Modal, Pagination, Select, Slider, Spin } from 'ant-design-vue'
import { CopyOutlined, DeleteOutlined, DownloadOutlined, SoundOutlined, VideoCameraOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import UploadFile from '@/components/UploadFile/src/UploadFile.vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { useAuth } from '@/composables/useAuth'
import { analyzeReplicatePrompt, createReplicateTask, pageReplicateTasks, type ReplicateMaterials, type ReplicateTask, type ReplacementKind } from './api'
import { downloadStudioFile, getStudioWork, loadStudioModels, studioFileName, type StudioWork } from '@/pages/ai/api'
import StudioParams from '@/pages/ai/StudioParams.vue'
import '@/pages/ai/video/video.scss'
import StudioReferences from '@/pages/ai/StudioReferences.vue'
import { useToast } from '@/composables/useToast'
import type { CommonAiModelItem } from '@/service/api/ai-model'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import { validateAiImageConstraints, formatAiImageValidationError } from '@/pages/canvas/shims/imageConstraints'
import { isSeedance } from '@/pages/canvas/utils/seedanceConstraints'
import { readAssetDuration } from '@/components/AssetLibrary/mediaMetadata'

const { isLoggedIn, sessionVersion, openLogin } = useAuth()
const { addToast } = useToast()
const materials = reactive<ReplicateMaterials>({ videoUrl: '', replacements: [] })
const roles: { kind: ReplacementKind; label: string; description: string }[] = [
  { kind: 'character', label: '人物', description: '例如：开场右侧女性，之后走到镜头前的同一人' },
  { kind: 'product', label: '产品', description: '例如：人物character_1手中的蓝色瓶子' },
  { kind: 'scene', label: '场景', description: '例如：前3秒的电梯厅，保留后半段客厅' },
]
const counters = { character: 0, product: 0, scene: 0 }
const submitting = ref(false)
const analyzing = ref(false)
const formLocked = computed(() => submitting.value || analyzing.value)
function addReplacement(kind: ReplacementKind) {
  if (formLocked.value || materials.replacements.length >= 30) return
  counters[kind] += 1
  materials.replacements.push({ id: `${kind}_${counters[kind]}`, kind, target: '', imageUrls: [] })
}
function removeReplacement(id: string) {
  if (!formLocked.value)
    materials.replacements = materials.replacements.filter((item) => item.id !== id)
}
const error = ref('')
const models = ref<CommonAiModelItem[]>([])
const modelsLoading = ref(false)
const modelId = ref<number>()
const aspect = ref('')
const resolution = ref('')
const duration = ref(5)
const refAudios = ref<string[]>([])
const currentModel = computed(() => models.value.find((item) => item.id === modelId.value))
const maxAudios = computed(() => {
  const limits = currentModel.value?.mediaLimits
  const value = Number(limits?.platformMaxAudios ?? limits?.maxAudios ?? 3)
  return Number.isFinite(value) ? Math.max(0, Math.min(10, Math.floor(value))) : 0
})
const maxAudioDuration = computed(() => {
  const value = Number(currentModel.value?.mediaLimits?.maxTotalAudioDuration ?? 15)
  return Number.isFinite(value) && value > 0 ? value : 15
})
const modelOptions = computed(() =>
  models.value.map((item) => ({
    label: `${item.name || item.model || String(item.id)}${item.disabledReason ? `（${item.disabledReason}）` : ''}`,
    disabled: item.disabled === true,
    value: item.id,
  }))
)
const ratioOptions = computed(() =>
  (currentModel.value?.ratio || []).map((value) => ({ label: value, value }))
)
const resolutionOptions = computed(() =>
  (currentModel.value?.resolution || []).map((value) => ({ label: value, value }))
)
const durationMin = computed(() => currentModel.value?.pricing?.minDuration ?? 4)
const durationMax = computed(() =>
  Math.max(durationMin.value, currentModel.value?.pricing?.maxDuration ?? 15)
)
const estimatedPoints = computed(() =>
  estimateModelPoints(currentModel.value, {
    resolution: resolution.value,
    ratio: aspect.value,
    duration: duration.value,
    imageCount: materials.replacements.reduce((total, item) => total + item.imageUrls.length, 0),
    referenceVideo: false,
    generateAudio: true,
  })
)
const pointsText = computed(() => formatModelPoints(estimatedPoints.value))
const videos = computed(() => (materials.videoUrl ? [materials.videoUrl] : []))
const maxImages = computed(() =>
  Math.min(
    30,
    Number(
      currentModel.value?.mediaLimits?.platformMaxImages ??
        currentModel.value?.mediaLimits?.maxImages ??
        9
    )
  )
)
const imageCount = computed(() =>
  materials.replacements.reduce((n, item) => n + item.imageUrls.length, 0)
)
const materialsError = computed(() => {
  if (imageCount.value > maxImages.value)
    return `当前模型最多支持${maxImages.value}张参考图，请减少素材或更换模型`
  const targets = new Set<string>()
  for (const item of materials.replacements) {
    if (!item.target.trim() || !item.imageUrls.length)
      return '每个替换对象都需填写原片目标，并上传至少一张参考图；不替换时请删除该项'
    const key = `${item.kind}:${item.target.trim()}`
    if (targets.has(key)) return '同类替换对象的目标描述不能重复，请明确区分原视频中的对象'
    targets.add(key)
  }
  return ''
})
const canAnalyze = computed(
  () =>
    !formLocked.value &&
    Boolean(materials.videoUrl) &&
    Boolean(currentModel.value) &&
    !currentModel.value?.disabled &&
    estimatedPoints.value !== null &&
    !materialsError.value
)
watch(modelId, () => {
  aspect.value = ratioOptions.value[0]?.value || ''
  resolution.value = resolutionOptions.value[0]?.value || ''
  duration.value = Math.max(durationMin.value, Math.min(durationMax.value, duration.value))
  if (refAudios.value.length > maxAudios.value) {
    refAudios.value = refAudios.value.slice(0, maxAudios.value)
    addToast('已按新模型的音频数量限制调整参考音频', 'info')
  }
})
onMounted(async () => {
  void fetchHistory()
  modelsLoading.value = true
  try {
    models.value = await loadStudioModels('video')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '模型加载失败'
  } finally {
    modelsLoading.value = false
  }
})
const statusLabels: Record<ReplicateTask['status'], string> = {
  QUEUED: '排队中', ANALYZING: '豆包反推中', SUBMITTING: '正在提交生成', GENERATING: '视频生成中',
  SUCCESS: '已完成', FAILED: '失败', UNKNOWN: '结果待核对', ANALYSIS_DONE: '反推已完成（旧记录）',
}
const pendingStatuses = new Set(['QUEUED', 'ANALYZING', 'SUBMITTING', 'GENERATING'])
const tasks = ref<ReplicateTask[]>([])
const selectedId = ref<number>()
const activeTask = computed(() => tasks.value.find((task) => task.id === selectedId.value) || tasks.value[0])
const historyPage = ref(1)
const total = ref(0)
const historyLoading = ref(false)
const historyError = ref('')
let disposed = false
let session = 0
let timer: ReturnType<typeof setTimeout> | undefined
let retryKey = ''
let retryInput = ''
function refreshHistory() {
  requestedStates = {}
  void fetchHistory()
}
async function fetchHistory() {
  if (!isLoggedIn.value || historyLoading.value || disposed) return
  const currentSession = session
  historyLoading.value = true
  clearTimeout(timer)
  try {
    const result = await pageReplicateTasks(historyPage.value)
    if (disposed || currentSession !== session) return
    tasks.value = result.list
    total.value = result.total
    historyError.value = ''
    void loadWorks(result.list, currentSession)
  } catch (e: unknown) {
    if (!disposed && currentSession === session) historyError.value = e instanceof Error ? e.message : '记录加载失败'
  } finally {
    historyLoading.value = false
    if (!disposed && isLoggedIn.value)
      timer = setTimeout(() => void fetchHistory(), 5000)
  }
}
watch([isLoggedIn, sessionVersion], ([loggedIn]) => {
  session += 1
  clearTimeout(timer)
  tasks.value = []
  works.value = {}
  workErrors.value = {}
  requestedStates = {}
  previewOpen.value = false
  previewTask.value = undefined
  promptOpen.value = false
  promptText.value = ''
  promptCache.value = undefined
  refAudios.value = []
  total.value = 0
  selectedId.value = undefined
  historyError.value = ''
  if (loggedIn) void fetchHistory()
})
onBeforeUnmount(() => { disposed = true; clearTimeout(timer) })

const works = ref<Record<number, StudioWork>>({})
const workErrors = ref<Record<number, string>>({})
let requestedStates: Record<number, string> = {}
const cards = computed(() => tasks.value.map((task) => ({ task, work: workFor(task) })))
const previewOpen = ref(false)
const previewTask = ref<ReplicateTask>()
const previewWork = computed(() => previewTask.value ? workFor(previewTask.value) : undefined)
const downloadingId = ref<number>()
function workFor(task: ReplicateTask): StudioWork {
  const stored = task.canvasTaskId ? works.value[task.canvasTaskId] : undefined
  return {
    ...stored,
    id: task.canvasTaskId || task.id,
    status: task.status === 'SUCCESS' ? 20 : task.status === 'FAILED' ? 30 : 10,
    videoUrl: task.resultUrl || undefined,
    createTime: task.createdAt,
  }
}
async function loadWorks(rows: ReplicateTask[], currentSession: number) {
  await Promise.allSettled(rows.map(async (task) => {
    const id = task.canvasTaskId
    if (!id || requestedStates[id] === task.status) return
    requestedStates[id] = task.status
    try {
      const work = await getStudioWork('video', id)
      if (disposed || session !== currentSession || requestedStates[id] !== task.status) return
      if (!work) throw new Error('生成信息暂不可用')
      works.value[id] = work
      delete workErrors.value[id]
    } catch (e: unknown) {
      if (disposed || session !== currentSession || requestedStates[id] !== task.status) return
      delete requestedStates[id]
      workErrors.value[id] = e instanceof Error ? e.message : '生成信息加载失败'
    }
  }))
}
function taskDescription(task: ReplicateTask) {
  if (pendingStatuses.has(task.status)) return `${statusLabels[task.status]}，任务在后台继续执行`
  if (task.status === 'ANALYSIS_DONE') return '这是旧版反推记录，没有关联的视频生成任务'
  return task.status === 'FAILED' ? '复刻失败，请查看失败原因' : '结果待核对，请查看任务说明'
}
function openPreview(task: ReplicateTask) {
  if (!task.resultUrl) return
  previewTask.value = task
  previewOpen.value = true
}
function paintThumb(event: Event) {
  const video = event.target
  if (!(video instanceof HTMLVideoElement) || video.currentTime > 0) return
  try { video.currentTime = 0.1 } catch { /* 元数据尚未就绪时保留默认帧。 */ }
}
async function handleDownload(task: ReplicateTask) {
  if (!task.resultUrl || downloadingId.value) return
  downloadingId.value = task.id
  try { await downloadStudioFile(task.resultUrl, studioFileName('video', task.canvasTaskId || task.id, task.resultUrl)) }
  catch (e: unknown) { addToast(e instanceof Error ? e.message : '下载失败', 'error') }
  finally { downloadingId.value = undefined }
}
async function copyPrompt(text?: string) {
  if (!text) return
  try { await navigator.clipboard.writeText(text); addToast('已复制', 'success') }
  catch { addToast('复制失败', 'error') }
}

function updateVideos(value: string | string[]) {
  materials.videoUrl = Array.isArray(value) ? value[0] || '' : value
}
function updateAudios(value: string | string[]) {
  refAudios.value = Array.isArray(value) ? value : value ? [value] : []
}
async function validateAudios(urls: string[]) {
  if (urls.length > maxAudios.value) throw new Error(`当前模型最多支持 ${maxAudios.value} 段参考音频`)
  let total = 0
  for (const url of urls) total += await readAssetDuration(url, 'audio')
  if (total > maxAudioDuration.value)
    throw new Error(`参考音频总时长不能超过 ${maxAudioDuration.value} 秒`)
}
const beforeAudioUpload: UploadProps['beforeUpload'] = async (file) => {
  if (!/\.(mp3|wav)$/i.test(file.name) || file.size >= 15 * 1024 * 1024) return true
  const url = URL.createObjectURL(file)
  try {
    await validateAudios([...refAudios.value, url])
    return true
  } catch (e) {
    addToast(e instanceof Error ? e.message : '无法读取音频，请更换素材', 'error')
    return false
  } finally {
    URL.revokeObjectURL(url)
  }
}
function materialsBody(): ReplicateMaterials {
  return {
    videoUrl: materials.videoUrl,
    replacements: materials.replacements.map((item) => ({
      ...item,
      target: item.target.trim(),
      imageUrls: [...item.imageUrls],
    })),
  }
}
function materialsKey() {
  return JSON.stringify(materialsBody())
}
const promptOpen = ref(false)
const promptText = ref('')
const promptCache = ref<{ key: string; text: string }>()
const reversedPrompt = computed(() =>
  promptCache.value?.key === materialsKey() ? promptCache.value.text : ''
)
watch(promptText, (text) => {
  const cache = promptCache.value
  if (!cache || cache.key !== materialsKey() || cache.text === text) return
  promptCache.value = { key: cache.key, text }
})
const canReverse = computed(
  () => !formLocked.value && Boolean(materials.videoUrl) && !materialsError.value
)
async function reversePrompt() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  const cached = reversedPrompt.value
  if (cached) {
    promptText.value = cached
    promptOpen.value = true
    return
  }
  if (!canReverse.value) return
  analyzing.value = true
  error.value = ''
  const key = materialsKey()
  try {
    const text = (await analyzeReplicatePrompt(materialsBody())).trim()
    if (!text) throw new Error('未返回提示词')
    if (disposed) return
    promptCache.value = { key, text }
    promptText.value = text
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '反推失败，请稍后重试'
  } finally {
    analyzing.value = false
  }
}
async function analyze() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (!canAnalyze.value) return
  submitting.value = true
  const submitSession = session
  error.value = ''
  const body = materialsBody()
  const prompt = reversedPrompt.value
  const settings = {
    modelId: modelId.value!,
    ratio: aspect.value,
    resolution: resolution.value,
    duration: duration.value,
    audioUrls: [...refAudios.value],
  }
  try {
    if (settings.audioUrls.length) await validateAudios(settings.audioUrls)
    if (currentModel.value && isSeedance(currentModel.value)) {
      const images = [...new Set(body.replacements.flatMap((item) => item.imageUrls))]
      for (let i = 0; i < images.length; i += 1) {
        const result = await validateAiImageConstraints(images[i])
        if (!result.valid) throw new Error(`参考图不合格：${formatAiImageValidationError(result, `参考图${i + 1}`)}`)
      }
    }
    if (disposed || submitSession !== session) return
    const snapshot = JSON.stringify({ body, settings, prompt })
    if (retryInput !== snapshot || !retryKey) { retryKey = crypto.randomUUID(); retryInput = snapshot }
    const id = await createReplicateTask(body, settings, retryKey, prompt || undefined)
    retryKey = ''
    if (disposed || submitSession !== session) return
    selectedId.value = id
    historyPage.value = 1
    await fetchHistory()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '复刻失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>

