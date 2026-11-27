<template>
  <PageContainer flush class-name="film-page">
    <div class="film-layout creation-workbench">
      <form class="film-editor creation-form" aria-label="商品视频生成" @submit.prevent="submit">
        <div class="film-editor-scroll creation-form__body scroll-area">
          <Alert v-if="error" type="error" show-icon :message="error" class="film-notice" />
          <section class="film-section creation-section">
            <h2>
              上传商品图 <span class="film-muted">同一商品，最多 {{ maxImages }} 张</span>
            </h2>
            <ImageUpload
              preview
              require-login
              save-to-library
              :max-count="maxImages"
              :file-size="10"
              :existing-urls="images"
              empty-desc="同一商品，JPG / PNG / WebP，单张不超过10MB"
              @upload-complete="images = $event"
            />
            <p v-if="images.length > maxImages" class="film-muted">
              当前模型最多支持 {{ maxImages }} 张图片，请移除多余图片或更换模型。
            </p>
          </section>
          <section class="film-section creation-section">
            <div class="film-settings">
              <label for="film-market"
                >市场地区<Select
                  id="film-market"
                  v-model:value="market"
                  class="film-control"
                  :options="marketOptions"
                  :disabled="busy" /></label
              ><label for="film-language"
                >语言<Select
                  id="film-language"
                  v-model:value="language"
                  class="film-control"
                  :options="languageOptions"
                  :disabled="busy"
              /></label>
            </div>
            <label for="film-ratio">视频比例</label>
            <Select
              id="film-ratio"
              v-model:value="ratio"
              class="film-control"
              :options="ratioOptions"
              :disabled="busy"
            />
            <label id="film-duration-label" for="film-duration">时长 {{ duration }}s</label>
            <Slider
              id="film-duration"
              v-model:value="duration"
              class="film-control"
              :min="minDuration"
              :max="maxDuration"
              :step="1"
              aria-label-for-handle="视频时长"
              :tooltip-open="false"
              :disabled="busy"
            />
            <div class="film-parameters">
              <div class="film-settings">
                <label for="film-model"
                  >模型<Select
                    id="film-model"
                    v-model:value="modelId"
                    class="film-control"
                    :options="modelOptions"
                    :loading="loading"
                    :disabled="busy"
                    placeholder="选择图生视频模型"
                /></label>
                <label for="film-resolution"
                  >分辨率<Select
                    id="film-resolution"
                    v-model:value="resolution"
                    class="film-control"
                    :options="resolutionOptions"
                    :disabled="busy"
                /></label>
              </div>
            </div>
          </section>
          <section class="film-section creation-section">
            <header class="film-section-heading">
              <h2><label for="film-facts">商品卖点 &amp; 要求</label></h2>
              <AiWriteButton
                :loading="analyzing"
                :disabled="!images.length || busy"
                @click="analyze"
              />
            </header>
            <Input.TextArea
              id="film-facts"
              v-model:value="facts"
              :rows="4"
              :maxlength="1500"
              placeholder="如商品名称、核心卖点、适用人群、使用场景等信息"
              :disabled="busy"
            />
            <p class="film-muted">只提炼有依据的特点。请核对AI识别结果后再生成脚本。</p>
          </section>
          <section class="film-section creation-section">
            <h2>视频类型 <span class="film-muted">单选，生成1条视频</span></h2>
            <Radio.Group
              v-model:value="selectedType"
              class="film-types"
              aria-label="视频类型，单选"
              :disabled="busy"
              ><Radio
                v-for="option in typeOptions"
                :key="option.value"
                class="film-type"
                :class="{ 'film-type--selected': selectedType === option.value }"
                :value="option.value"
                >{{ option.label }}</Radio
              ></Radio.Group
            >
          </section>
          <section class="film-section creation-section">
            <ModelImagePanel
              v-model:urls="modelImages"
              :models="imageModels"
              :models-loading="imageModelsLoading"
              :disabled="planning || analyzing || submitting"
              @busy="modelBusy = $event"
              @description="modelDescription = $event"
            />
            <p v-if="modelLoadError" class="film-muted" role="alert">{{ modelLoadError }}</p>
            <Button
              v-if="modelImages.length"
              html-type="button"
              type="text"
              :disabled="busy"
              @click="modelImages = []"
              >移除模特形象</Button
            >
            <p class="film-muted">
              形象设置会直接用于脚本，无需先生成图片。生成或上传模特图可进一步固定人物外貌；AI生成模特图单独计费。
            </p>
          </section>
          <section class="film-section creation-section">
            <header class="film-section-heading">
              <h2>确认脚本</h2>
              <Button
                html-type="button"
                :loading="planning"
                :disabled="
                  (busy && !planning) ||
                  !facts.trim() ||
                  !selectedTypes.length ||
                  !images.length ||
                  !config?.aiReady
                "
                @click="generate"
                >生成脚本</Button
              >
            </header>
            <p v-if="!selectedTypes.length" class="film-muted">
              先选择视频类型，再为每种类型生成独立脚本。
            </p>
            <article
              v-for="draft in selectedDrafts"
              :key="draft.videoType"
              class="film-script-card"
            >
              <label :for="`script-${draft.videoType}`"
                >{{ draft.label
                }}<span v-if="isSubmitted(draft)" class="film-muted">
                  · 已提交 #{{ draft.taskId }}</span
                ></label
              >
              <Input.TextArea
                :id="`script-${draft.videoType}`"
                v-model:value="draft.script"
                :rows="7"
                :maxlength="15000"
                :disabled="busy"
                placeholder="生成脚本后可逐条修改；也可以粘贴自定义脚本"
                @change="draft.context = contextFor(draft.videoType)"
              />
              <p
                v-if="draft.script && draft.context !== contextFor(draft.videoType)"
                class="film-script-warning"
              >
                商品、模特、市场或时长已变化，请重新生成脚本，或编辑确认后再提交。
              </p>
            </article>
            <p class="film-muted">
              卖点识别和脚本规划不会提交视频任务。确认后，才按所选类型逐条生成视频。
            </p>
          </section>
        </div>
        <footer class="film-submit creation-form__footer">
          <Button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="submitting"
            :disabled="loading || busy"
            >生成视频（共 {{ pendingDrafts.length }} 条 · {{ pointsText }}）</Button
          >
          <span role="status">{{ submitting ? submitProgress : '按模型实际返回结算' }}</span>
        </footer>
      </form>
      <section class="film-results creation-results" aria-label="我的成片">
        <div class="film-results-scroll scroll-area">
          <div v-if="!tasks.length" class="film-empty">
            <VideoCameraOutlined />
            <h3>从一张商品图开始</h3>
            <p>确认脚本后，由视频模型生成完整动态短片。</p>
            <span>生成结果支持预览、下载和存入资产库。</span>
          </div>
          <div class="film-task-list" aria-live="polite">
            <article v-for="task in tasks" :key="task.id" class="film-task">
              <button
                v-if="task.status === 20 && task.videoUrl"
                type="button"
                class="film-cover"
                :aria-label="`播放${task.creationTitle || '商品短片'}`"
                @click="selected = task"
              >
                <video
                  :src="task.videoUrl"
                  :poster="task.previewUrl !== task.videoUrl ? task.previewUrl : undefined"
                  muted
                  playsinline
                  preload="metadata"
                  @loadedmetadata="paintThumb"
                /><PlayCircleOutlined />
                <span v-if="task.duration" class="studio__duration-badge">{{ task.duration }}s</span>
              </button>
              <div v-else class="film-processing">
                <Spin v-if="isPending(task)" /><VideoCameraOutlined v-else />
                <p>
                  {{
                    isPending(task)
                      ? '模型正在生成视频，可离开页面稍后查看'
                      : task.errorMessage || '生成失败'
                  }}
                </p>
              </div>
              <div class="film-task-info">
                <footer class="media-actions">
                  <Button class="media-action"
                    type="text"
                    aria-label="下载"
                    title="下载"
                    :loading="action === `download-${task.id}`"
                    :disabled="task.status !== 20 || !task.videoUrl || !!action"
                    @click="download(task)"
                  ><DownloadOutlined /></Button>
                  <Popconfirm
                    v-if="!isPending(task)"
                    title="删除这条成片记录？"
                    @confirm="remove(task.id)"
                    ><Button class="media-action media-action--danger" title="删除" type="text" :aria-label="`删除${task.creationTitle || '商品短片'}`"
                      ><DeleteOutlined /></Button
                  ></Popconfirm>
                </footer>
              </div>
            </article>
          </div>
          <ResultPagination
            v-if="total > 12"
            :current="page"
            :total="total"
            :page-size="12"
            class="film-pagination"
            @change="changePage"
          />
        </div>
      </section>
    </div>
    <Modal
      :open="!!selected"
      :footer="null"
      width="1080px"
      centered
      destroy-on-close
      wrap-class-name="studio-preview"
      @cancel="selected = undefined"
    >
      <div v-if="selected" class="studio-preview__body">
        <div class="studio-preview__stage">
          <video :src="selected.videoUrl" controls autoplay playsinline />
          <div class="studio-preview__bar media-actions">
            <button class="media-action" aria-label="下载" title="下载" type="button" :disabled="!!action" @click="download(selected)"><DownloadOutlined />下载</button>
          </div>
        </div>
        <StudioPromptDetails :work="selected" />
      </div>
    </Modal>
  </PageContainer>
</template>
<script setup lang="ts">
import ResultPagination from '@/components/ui/ResultPagination.vue'
import StudioPromptDetails from '@/components/studio/StudioPromptDetails.vue'
import '@/pages/product-video/video.scss'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Alert,
  Button,
  Input,
  Slider,
  Radio,
  Modal,
  Popconfirm,
  Select,
  Spin,
  message,
} from 'ant-design-vue'
import { DownloadOutlined, DeleteOutlined, PlayCircleOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import AiWriteButton from '@/components/AiWriteButton.vue'
import { useToast } from '@/composables/useToast'
import { downloadStudioFile, loadStudioModels, type CommonAiModelItem } from '@/service/api/studio'
import ModelImagePanel from '@/components/creation/ModelImagePanel.vue'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import {
  createFilm,
  deleteFilm,
  getConfig,
  listFilms,
  planFilm,
  saveFilm,
} from './api'
import { aiWriteSellingPoints } from '@/service/api/shop-image-group'
import type { FilmConfig, FilmTask, FilmRequest } from './api'
interface ScriptDraft {
  videoType: string
  label: string
  script: string
  context: string
  submitKey: string
  payload: string
  taskId?: number
}
const { addToast } = useToast()
const config = ref<FilmConfig>(),
  // ponytail: mock 商品图，联调完删除
  images = ref<string[]>([
    'https://static.pixpix.media/molili-agent/2026/06/06/2063156402817470464/_1780729792681_d1V3EWqD.webp?x-oss-process=image/resize,m_lfit,w_320/quality,q_85/format,webp',
  ]),
  modelId = ref<number>()
const title = ref(''),
  facts = ref(''),
  error = ref(''),
  ratio = ref('9:16'),
  resolution = ref('720p'),
  duration = ref(15)
const market = ref('china'),
  language = ref('zh'),
  selectedType = ref(''),
  selectedTypes = computed(() => selectedType.value ? [selectedType.value] : []),
  drafts = ref<Record<string, ScriptDraft>>({})
const planning = ref(false),
  analyzing = ref(false),
  submitting = ref(false),
  loading = ref(true),
  action = ref(''),
  submitProgress = ref('')
const modelDescription = ref('')
const modelImages = ref<string[]>([]), imageModels = ref<CommonAiModelItem[]>([]), imageModelsLoading = ref(true), modelBusy = ref(false), modelLoadError = ref('')
const busy = computed(() => planning.value || analyzing.value || submitting.value || modelBusy.value)
const tasks = ref<FilmTask[]>([]),
  selected = ref<FilmTask>(),
  page = ref(1),
  total = ref(0)
let disposed = false,
  timer: ReturnType<typeof setTimeout> | undefined,
  pageSeq = 0
const fallbackTypes: Record<string, string> = {
  ugc: 'UGC种草',
  drama: '带货短剧',
  demo: '产品演示',
  presenter: '产品口播',
  tvc: 'TVC广告',
  problem: '痛点解决',
  unboxing: '开箱种草',
  reaction: '反应展示',
}
const options = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }))
const typeOptions = computed(() => options(config.value?.videoTypes || fallbackTypes))
const marketOptions = computed(() =>
  options(
    config.value?.markets || {
      china: '中国',
      'north-america': '北美',
      europe: '欧洲',
      'southeast-asia': '东南亚',
      japan: '日本',
      korea: '韩国',
    }
  )
)
const languageOptions = computed(() =>
  options(config.value?.languages || { zh: '中文', en: '英语' })
)
watch(
  selectedTypes,
  (values) => {
    for (const type of values)
      if (!drafts.value[type])
        drafts.value[type] = {
          videoType: type,
          label: config.value?.videoTypes?.[type] || fallbackTypes[type],
          script: '',
          context: '',
          submitKey: '',
          payload: '',
        }
  },
  { flush: 'sync' }
)
const selectedDrafts = computed(() =>
  selectedTypes.value.map((type) => drafts.value[type]).filter(Boolean)
)
function contextFor(type: string) {
  return JSON.stringify([
    images.value,
    facts.value,
    modelImages.value,
    modelDescription.value,
    market.value,
    language.value,
    duration.value,
    type,
  ])
}
function requestFor(draft: ScriptDraft): Omit<FilmRequest, 'submitKey'> {
  return {
    title: title.value.trim() || '商品短片',
    script: draft.script,
    imageUrls: [...images.value],
    modelImageUrl: modelImages.value[0],
    modelDescription: modelDescription.value,
    modelId: modelId.value || 0,
    ratio: ratio.value,
    resolution: resolution.value,
    duration: duration.value,
    videoType: draft.videoType,
    market: market.value,
    language: language.value,
  }
}
function isSubmitted(draft: ScriptDraft) {
  return !!draft.taskId && draft.payload === JSON.stringify(requestFor(draft))
}
const pendingDrafts = computed(() => selectedDrafts.value.filter((draft) => !isSubmitted(draft)))
const currentModel = computed(() =>
  config.value?.models.find((model) => model.id === modelId.value)
)
const modelOptions = computed(() =>
  (config.value?.models || []).map((model) => ({
    label: `${model.name || model.model}${
      model.disabledReason ? `（${model.disabledReason}）` : ''
    }`,
    value: model.id,
    disabled: model.disabled,
  }))
)
const ratioOptions = computed(() =>
  (currentModel.value?.ratio || []).map((value) => ({ label: value, value }))
)
const resolutionOptions = computed(() =>
  (currentModel.value?.resolution || []).map((value) => ({ label: value, value }))
)
const minDuration = computed(() => Math.max(4, currentModel.value?.pricing?.minDuration || 4))
const maxDuration = computed(() => Math.min(30, currentModel.value?.pricing?.maxDuration || 15))
const maxImages = computed(() =>
  Math.max(
    1,
    Math.min(
      5,
      Number(
        currentModel.value?.mediaLimits?.platformMaxImages ??
          currentModel.value?.mediaLimits?.maxImages ??
          1
      )
    )
  )
)
const points = computed(() =>
  estimateModelPoints(currentModel.value, {
    resolution: resolution.value,
    ratio: ratio.value,
    duration: duration.value,
    imageCount: images.value.length,
    generateAudio: true,
  })
)
const pointsText = computed(() =>
  formatModelPoints(
    points.value == null
      ? null
      : Math.round(points.value * pendingDrafts.value.length * 1000) / 1000
  )
)
const isPending = (task: FilmTask) => [0, 10, 11, 12].includes(task.status)
const explain = (e: unknown) => (e instanceof Error ? e.message : '操作失败，请重试')
watch(modelId, () => {
  if (!ratioOptions.value.some((option) => option.value === ratio.value))
    ratio.value = ratioOptions.value[0]?.value || ''
  if (!resolutionOptions.value.some((option) => option.value === resolution.value))
    resolution.value = resolutionOptions.value[0]?.value || ''
  duration.value = Math.max(minDuration.value, Math.min(maxDuration.value, duration.value))
})
async function analyze() {
  if (busy.value || !images.value.length) return
  analyzing.value = true
  error.value = ''
  const snapshot = JSON.stringify([images.value, facts.value])
  try {
    const text = await aiWriteSellingPoints([...images.value], 'product-film')
    if (!disposed && snapshot === JSON.stringify([images.value, facts.value])) {
      facts.value = text
      addToast('AI 帮写完成', 'success')
    }
  } catch (e: unknown) {
    if (!disposed) {
      error.value = explain(e)
      addToast(e instanceof Error ? e.message : 'AI 帮写失败', 'error')
    }
  } finally {
    analyzing.value = false
  }
}
async function generate() {
  if (busy.value || !images.value.length || !facts.value.trim() || !selectedTypes.value.length)
    return
  planning.value = true
  error.value = ''
  const body = {
    imageUrls: [...images.value],
    modelImageUrl: modelImages.value[0],
    modelDescription: modelDescription.value,
    facts: facts.value,
    duration: duration.value,
    market: market.value,
    language: language.value,
    videoTypes: [...selectedTypes.value],
  }
  const snapshot = JSON.stringify([
    images.value,
    facts.value,
    modelImages.value,
    modelDescription.value,
    market.value,
    language.value,
    duration.value,
    selectedTypes.value,
  ])
  try {
    const result = await planFilm(body)
    if (
      !disposed &&
      snapshot ===
        JSON.stringify([
          images.value,
          facts.value,
          modelImages.value,
          modelDescription.value,
          market.value,
          language.value,
          duration.value,
          selectedTypes.value,
        ])
    ) {
      for (const item of result)
        drafts.value[item.videoType] = {
          ...item,
          context: contextFor(item.videoType),
          submitKey: '',
          payload: '',
        }
    }
  } catch (e: unknown) {
    error.value = explain(e)
  } finally {
    planning.value = false
  }
}
async function refresh() {
  const seq = ++pageSeq
  if (timer) clearTimeout(timer)
  try {
    const result = await listFilms(page.value)
    if (!disposed && seq === pageSeq) {
      tasks.value = result.list
      total.value = result.total
    }
  } catch (e: unknown) {
    if (!disposed && seq === pageSeq) error.value = explain(e)
  } finally {
    if (seq === pageSeq && !disposed && tasks.value.some(isPending))
      timer = setTimeout(refresh, 5000)
  }
}
function changePage(value: number) {
  page.value = value
  void refresh()
}
async function submit() {
  if (busy.value) return
  if (!modelId.value || currentModel.value?.disabled || points.value == null) {
    error.value = '请选择已配置价格的可用视频模型'
    return
  }
  if (
    !images.value.length ||
    images.value.length > maxImages.value ||
    !selectedDrafts.value.length
  ) {
    error.value = '请上传商品图，并选择视频类型'
    return
  }
  if (
    selectedDrafts.value.some(
      (draft) => !draft.script.trim() || draft.context !== contextFor(draft.videoType)
    )
  ) {
    error.value = '请生成并确认每个所选类型的脚本；资料变化后需要重新确认'
    return
  }
  const totalReferences = images.value.length + modelImages.value.length
  const limit = Number(currentModel.value?.mediaLimits?.platformMaxImages ?? currentModel.value?.mediaLimits?.maxImages ?? 1)
  if (totalReferences > limit) { error.value = `当前模型最多支持${limit}张参考图（含模特），请减少商品图或更换模型`; return }
  if (!pendingDrafts.value.length) {
    error.value = '这些脚本已提交，可在右侧查看。重新生成或编辑脚本后可再次创作。'
    return
  }
  const batch = pendingDrafts.value.map((draft) => ({ draft, body: requestFor(draft) }))
  submitting.value = true
  error.value = ''
  let succeeded = 0
  try {
    for (let i = 0; i < batch.length; i++) {
      const { draft, body } = batch[i],
        payload = JSON.stringify(body)
      if (payload !== draft.payload || !draft.submitKey) {
        draft.payload = payload
        draft.submitKey = crypto.randomUUID()
        draft.taskId = undefined
      }
      submitProgress.value = `正在提交 ${i + 1} / ${batch.length} · ${draft.label}`
      draft.taskId = await createFilm({ ...body, submitKey: draft.submitKey })
      succeeded++
    }
    message.success(`已提交${succeeded}条视频生成`)
  } catch (e: unknown) {
    error.value = `已确认提交${succeeded}条。${explain(
      e
    )}；重试会跳过已提交项，并复用未确认项的请求键。`
  } finally {
    submitting.value = false
    submitProgress.value = ''
    if (!disposed) {
      page.value = 1
      await refresh()
    }
  }
}
async function download(task: FilmTask) {
  if (action.value || !task.videoUrl) return
  action.value = `download-${task.id}`
  try {
    await downloadStudioFile(task.videoUrl, `商品短片-${task.id}.mp4`)
  } catch (e: unknown) {
    error.value = explain(e)
  } finally {
    action.value = ''
  }
}
function paintThumb(event: Event) {
  const video = event.target
  if (!(video instanceof HTMLVideoElement) || video.currentTime > 0) return
  try { video.currentTime = 0.1 } catch { /* 点击后仍可打开播放器。 */ }
}
async function save(id: number) {
  if (action.value) return
  action.value = `save-${id}`
  try {
    await saveFilm(id)
    message.success('已存入资产库')
  } catch (e: unknown) {
    error.value = explain(e)
  } finally {
    action.value = ''
  }
}
async function remove(id: number) {
  try {
    await deleteFilm(id)
    for (const draft of Object.values(drafts.value))
      if (draft.taskId === id) {
        draft.taskId = undefined
        draft.submitKey = ''
        draft.payload = ''
      }
    if (selected.value?.id === id) selected.value = undefined
    await refresh()
  } catch (e: unknown) {
    error.value = explain(e)
  }
}
onMounted(() => {
  void loadStudioModels('image').then(models => { if (!disposed) imageModels.value = models })
    .catch((e: unknown) => { if (!disposed) modelLoadError.value = explain(e) })
    .finally(() => { imageModelsLoading.value = false })
})
onMounted(async () => {
  try {
    config.value = await getConfig()
    modelId.value =
      config.value.models.find((model) => model.model === 'seedance-2-5-flash' && !model.disabled)
        ?.id || config.value.models.find((model) => !model.disabled)?.id
    await refresh()
  } catch (e: unknown) {
    error.value = explain(e)
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => {
  disposed = true
  ++pageSeq
  if (timer) clearTimeout(timer)
})
</script>
<style scoped lang="scss">
.film-editor-scroll {
  padding: 0 26px 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.film-results {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: var(--creation-pane-padding);
  > header {
    flex-shrink: 0;
  }
}
.film-results-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.film-section :deep(.image-upload__grid) {
  max-height: 220px;
  overflow-y: auto;
}
@media (max-width: 960px), (max-height: 600px) {
  .film-editor-scroll,
  .film-results-scroll {
    overflow: visible;
    flex: auto;
  }
  .film-submit {
    position: sticky;
    bottom: 0;
    z-index: 2;
  }
  .film-empty {
    min-height: 280px;
  }
}
.film-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
}
.film-type {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 14px 10px;
  min-height: 48px;
  border: 1px solid var(--color-border-whisper);
  border-radius: 12px;
  cursor: pointer;
  background: var(--color-surface-0);
}
.film-type:focus-within {
  outline: 2px solid var(--color-workbench-blue);
  outline-offset: 2px;
}
.film-type--selected {
  border-color: var(--color-ink-primary);
  background: var(--color-surface-2);
}
.film-script-card {
  margin-top: 18px;
  > label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
  }
}
.film-script-warning {
  color: var(--color-ink-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.film-control {
  width: 100%;
}
.film-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 0;
  label {
    display: grid;
    gap: 8px;
  }
}
.film-parameters {
  margin-top: 20px;
}
.film-control:deep(.ant-slider-rail) {
  background: var(--color-surface-2);
}
.film-control:deep(.ant-slider-track) {
  background: var(--color-ink-tertiary);
}
.film-control:deep(.ant-slider-handle::after) {
  box-shadow: 0 0 0 2px var(--color-ink-tertiary);
}
.film-control:deep(.ant-slider-handle:focus-visible::after) {
  box-shadow: 0 0 0 3px var(--color-workbench-blue);
}
.film-pagination {
  margin-top: 24px;
  text-align: center;
}
.film-task-info footer > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.film-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
  h1 {
    font-size: clamp(26px, 3vw, 36px);
    margin: 8px 0;
  }
  p,
  span {
    color: var(--color-ink-secondary);
  }
}
.film-notice {
  margin-bottom: 18px;
}
.film-layout {
  display: grid;
  grid-template-columns: var(--layout-form-width) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  padding: 0;
  gap: 0;
  width: 100%;
  color: var(--color-ink-primary);
}
.film-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--color-surface-0);
  border: 0;
  border-radius: 0;
  overflow: hidden;
}
.film-section {
  padding: 16px 0;
  label {
    font-size: 12px;
    font-weight: 400;
    color: var(--color-ink-secondary);
  }
  > label {
    display: block;
    margin: 12px 0 6px;
  }
  h2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 14px;
    font-weight: 650;
    margin: 0 0 10px;
  }
}
.film-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  h2 {
    margin: 0;
    font-size: 14px;
  }
}
.film-muted {
  color: var(--color-ink-secondary);
  font-size: 12px;
  line-height: 1.7;
}
.film-submit {
  flex-shrink: 0;
  border-top: 0;
  background: var(--color-surface-0);
  padding: 12px 16px;
  display: grid;
  gap: 8px;
  text-align: center;
  :deep(.ant-btn) {
    height: auto;
    min-height: 44px;
    white-space: normal;
  }
  span {
    color: var(--color-ink-secondary);
    font-size: 11px;
  }
}
.film-empty {
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: 100%;
  padding: 36px;
  text-align: center;
  color: var(--color-ink-secondary);
  > .anticon {
    font-size: 46px;
    margin-bottom: 16px;
  }
  h3 {
    color: var(--color-ink-primary);
    font-size: 22px;
  }
  p {
    max-width: 260px;
    line-height: 1.8;
  }
  > span {
    font-size: 12px;
  }
}
.film-task-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.film-task {
  min-width: 0;
  border: 1px solid var(--color-border-whisper);
  border-radius: 18px;
  background: var(--color-surface-0);
  overflow: hidden;
}
.film-cover {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border: 0;
  background: var(--color-surface-2);
  cursor: pointer;
  video {
    width: 100%;
    height: 100%;
    max-height: 320px;
    object-fit: contain;
  }
  .studio__duration-badge {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 3px 8px;
    border-radius: 8px;
    background: var(--color-media-veil);
    color: var(--color-on-media);
    font-size: 12px;
  }
  > .anticon {
    position: absolute;
    font-size: 46px;
    color: var(--color-on-media);
    background: var(--color-media-veil);
    border-radius: 50%;
  }
  &:focus-visible {
    outline: 2px solid var(--color-workbench-blue);
    outline-offset: -4px;
  }
}
.film-processing {
  min-height: 200px;
  display: grid;
  justify-items: center;
  align-content: center;
  padding: 24px;
  gap: 16px;
  background: var(--color-surface-2);
  text-align: center;
  p {
    color: var(--color-ink-secondary);
    font-size: 13px;
    line-height: 1.7;
  }
}
.film-task-info {
  padding: 10px;
  h3 {
    margin: 0 0 6px;
    font-size: 16px;
    overflow-wrap: anywhere;
  }
  > span {
    color: var(--color-ink-secondary);
    font-size: 12px;
  }
  footer {
    display: flex;
    justify-content: space-between;
    margin-top: 0;
  }
}
.film-player {
  display: block;
  width: 100%;
  max-height: 70vh;
}
@media (max-width: 960px), (max-height: 600px) {
  .film-layout {
    height: auto;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .film-heading {
    align-items: start;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
