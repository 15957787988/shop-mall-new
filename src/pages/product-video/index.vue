<template>
  <PageContainer flush>
    <div class="studio studio--gallery">
      <aside class="studio__form">
        <div class="studio__form-scroll scroll-area">
          <section class="studio__section">
            <h3 class="studio__label">模型</h3>
            <Select
              v-model:value="modelId"
              :options="modelOptions"
              :loading="modelsLoading"
              placeholder="加载模型…"
              class="studio__control"
            />
            <p v-if="currentModel?.pricing?.billingSource === 'LOCAL_TARIFF'" class="studio__hint">
              {{ currentModel.pricing.note }}
            </p>
            <p v-if="modelsError" class="studio__error">{{ modelsError }}</p>
            <p v-else-if="!modelsLoading && !models.length" class="studio__hint">暂无可用模型</p>
          </section>

          <section v-if="productMode" class="studio__section">
            <h3 class="studio__label">商品信息</h3>
            <label class="studio__field"
              >商品名称<Input
                v-model:value="productTitle"
                :maxlength="100"
                placeholder="填写真实商品名称"
            /></label>
            <label class="studio__field studio__duration"
              >商品卖点 / 口播文案<Input.TextArea
                v-model:value="productSellingPoints"
                :rows="3"
                :maxlength="1000"
                placeholder="如：轻便通勤、可拆卸肩带；请勿填写未经证实的功效"
            /></label>
            <p class="studio__hint">
              下方至少添加一张商品图。参考图决定商品外观，卖点和创作要求决定展示内容。
            </p>
          </section>
          <section class="studio__section">
            <h3 class="studio__label">{{ productMode ? '创作要求' : '提示词' }}</h3>
            <Input.TextArea
              v-model:value="prompt"
              :rows="6"
              :maxlength="30000"
              placeholder="描述想要生成的画面"
            />
          </section>

          <section class="studio__section">
            <h3 class="studio__label">参数</h3>
            <div class="studio__grid">
              <label v-if="ratioOptions.length" class="studio__field">
                <span>比例</span>
                <Select v-model:value="aspect" :options="ratioOptions" />
              </label>
              <label v-if="resolutionOptions.length" class="studio__field">
                <span>分辨率</span>
                <Select v-model:value="resolution" :options="resolutionOptions" />
              </label>
            </div>
            <label class="studio__field studio__duration">
              <span>时长 {{ duration }}s</span>
              <Slider
                v-model:value="duration"
                :min="durationMin"
                :max="sliderMax"
                :step="1"
                :disabled="durationMin >= durationMax"
              />
            </label>
          </section>

          <section v-if="currentModel && showRefs" class="studio__section">
            <h3 class="studio__label">{{ productMode ? '商品与参考素材' : '全能参考' }}</h3>
            <p class="studio__hint">可组合参考图、参考视频、参考音频</p>
            <div v-if="maxRefs > 0" class="studio__refs">
              <span>{{ productMode ? '商品图（必填）· 同一商品的不同角度' : '参考图' }}</span>
              <ImageUpload
                :key="`${productMode}-${modelId ?? 0}-image-${maxRefs}`"
                drag
                preview
                require-login
                :max-count="maxRefs"
                :file-size="10"
                :existing-urls="refImages"
                :empty-desc="
                  productMode ? '上传商品图，JPG / PNG / WebP' : '可选，JPG / PNG / WebP'
                "
                @upload-complete="refImages = $event"
              />
            </div>
            <div v-if="maxVideos > 0" class="studio__refs">
              <span>参考视频 · 总时长不超过 {{ maxVideoDuration }}s</span>
              <UploadFile
                :key="`${productMode}-${modelId ?? 0}-video-${maxVideos}`"
                :model-value="refVideos"
                drag
                :limit="maxVideos"
                :file-size="50"
                :file-type="['mp4', 'mov']"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                :before-upload-hook="beforeVideoUpload"
                :before-library-select="validateLibraryVideos"
                @update:model-value="refVideos = asUrlList($event)"
              />
            </div>
            <div v-if="maxAudios > 0" class="studio__refs">
              <span>参考音频 · 总时长不超过 {{ maxAudioDuration }}s</span>
              <UploadFile
                :key="`${productMode}-${modelId ?? 0}-audio-${maxAudios}`"
                :model-value="refAudios"
                drag
                :limit="maxAudios"
                :file-size="15"
                :file-type="['mp3', 'wav']"
                accept="audio/mpeg,audio/wav,.mp3,.wav"
                :before-upload-hook="beforeAudioUpload"
                :before-library-select="validateLibraryAudios"
                @update:model-value="refAudios = asUrlList($event)"
              />
            </div>
          </section>
          <p v-if="productMode && currentModel && !maxRefs" class="studio__error studio__section">
            当前模型不支持商品参考图，请更换支持图片参考的视频模型。
          </p>
        </div>

        <div class="studio__footer">
          <Button block @click="historyOpen = true">查看历史</Button>
          <Button
            type="primary"
            block
            size="large"
            :disabled="!canSubmit"
            :title="currentModel?.pricing?.note"
            :loading="submitting"
            @click="handleGenerate"
          >
            生成{{ pointsText }}
          </Button>
        </div>
      </aside>

      <main class="studio__results scroll-area" ref="listEl">
        <div v-if="listLoading && !works.length" class="studio__empty"><GenerationLoading label="正在读取作品…" /></div>
        <CreationDemo v-else-if="!works.length" :tool="productMode ? 'product-video' : 'video'" />
        <div v-if="works.length" class="studio__gallery-grid">
          <article v-for="item in works" :key="item.id" class="studio__card">
            <div class="studio__card-body">
              <div class="studio__media" :aria-busy="isPending(item)">
                <button
                  v-if="videoSrc(item)"
                  type="button"
                  class="studio__poster"
                  aria-label="播放"
                  @click="openPreview(item)"
                >
                  <img
                    v-if="poster(item) && !brokenPosters[item.id]"
                    :src="poster(item)"
                    alt=""
                    @error="brokenPosters[item.id] = true"
                  />
                  <video
                    v-else
                    :src="videoSrc(item)"
                    muted
                    playsinline
                    preload="metadata"
                    tabindex="-1"
                    @loadedmetadata="paintThumb"
                  />
                  <span class="studio__play" aria-hidden="true" />
                  <span v-if="item.duration" class="studio__duration-badge"
                    >{{ item.duration }}s</span
                  >
                </button>
                <GenerationLoading v-else-if="isPending(item)" :label="`正在生成视频${item.progress ? ` ${item.progress}` : '…'}`" />
                <span v-else class="studio__media-wait">{{
                  item.status === 30 ? '生成失败' : '结果暂不可用'
                }}</span>
              </div>
              <header class="studio__card-head">
                <span class="studio__card-model">{{
                  item.creationTitle ||
                  item.creationLabel ||
                  item.modelName ||
                  item.model ||
                  '生成结果'
                }}</span>
                <span
                  v-if="statusLabel(item)"
                  class="studio__card-status"
                  :data-fail="item.status === 30"
                >
                  {{ statusLabel(item) }}
                </span>
                <time class="studio__card-time">{{ formatTime(item.createTime) }}</time>
              </header>
              <StudioParams :work="item" :show-points="false" />
              <p class="studio__card-error" :title="item.status === 30 ? item.errorMessage : undefined">
                {{ item.status === 30 ? item.errorMessage : '' }}
              </p>
              <div class="studio__actions">
                <button
                  type="button"
                  class="studio__action"
                  title="下载"
                  aria-label="下载"
                  :disabled="!videoSrc(item) || downloadingId === item.id"
                  @click="handleDownload(item)"
                >
                  <DownloadOutlined />
                </button>
                <button
                  type="button"
                  class="studio__action studio__action--danger"
                  title="删除"
                  aria-label="删除"
                  :disabled="deletingId === item.id"
                  @click="handleDelete(item)"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
          </article>
        </div>
        <ResultPagination :current="pageNo" :total="total" :page-size="10" :loading="listLoading" @change="fetchPage" />
      </main>
    </div>
    <HistoryModal
      v-model:open="historyOpen"
      kind="video"
      :creation-tool="productMode ? 'product-video' : 'video'"
    />
    <Modal
      v-model:open="previewOpen"
      :footer="null"
      width="1080px"
      centered
      destroy-on-close
      wrap-class-name="studio-preview"
    >
      <div v-if="previewItem" class="studio-preview__body">
        <div class="studio-preview__stage">
          <video :src="videoSrc(previewItem)" controls autoplay playsinline />
          <div class="studio-preview__bar">
            <button
              type="button"
              :disabled="downloadingId === previewItem.id"
              @click="handleDownload(previewItem)"
            >
              <DownloadOutlined />
              下载
            </button>
          </div>
        </div>
        <aside class="studio-preview__prompt">
          <h3>作品详情</h3>
          <StudioParams :work="previewItem" inset />
          <StudioReferences :work="previewItem" />
        </aside>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup lang="ts">
import GenerationLoading from '@/components/ui/GenerationLoading.vue'
import CreationDemo from '@/components/CreationDemo.vue'
import ResultPagination from '@/components/ui/ResultPagination.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { buildProductVideoPrompt } from '@/lib/creation/product-video'
import {
  VideoCameraOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import { Button, Input, Modal, Select, Slider } from 'ant-design-vue'
import type { UploadProps } from 'ant-design-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import {
  validateAiImageConstraints,
  formatAiImageValidationError,
} from '@/pages/canvas/shims/imageConstraints'
import { isSeedance, assertSeedanceDimensions } from '@/pages/canvas/utils/seedanceConstraints'
import { readReferenceVideoMetadata } from '@/pages/canvas/utils/videoReferencePreflight'
import UploadFile from '@/components/UploadFile/src/UploadFile.vue'
import HistoryModal from './components/HistoryModal.vue'
import StudioParams from '@/components/studio/StudioParams.vue'
import StudioReferences from '@/components/studio/StudioReferences.vue'
import { useAuth } from '@/composables/useAuth'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import { useToast } from '@/composables/useToast'
import type { CommonAiModelItem } from '@/service/api/ai-model'
import {
  buildVideoParams,
  deleteStudioWork,
  downloadStudioFile,
  getStudioWork,
  loadStudioModels,
  pageStudioWorks,
  studioFileName,
  submitStudioVideo,
  type StudioWork,
} from '@/pages/product-video/api'

const productMode = true
const route = useRoute()
const productTitle = ref('')
const productSellingPoints = ref('')
const { isLoggedIn, openLogin } = useAuth()
const { addToast } = useToast()

const models = ref<CommonAiModelItem[]>([])
const modelsLoading = ref(true)
const modelsError = ref('')
const modelId = ref<number>()
const prompt = ref('')
const aspect = ref('')
const resolution = ref('')
const duration = ref(5)
const refImages = ref<string[]>([])
const refVideos = ref<string[]>([])
const refAudios = ref<string[]>([])
const submitting = ref(false)
const historyOpen = ref(false)

const works = ref<StudioWork[]>([])
const total = ref(0)
const pageNo = ref(1)
const listLoading = ref(false)
const downloadingId = ref<number>()
const deletingId = ref<number>()
const previewOpen = ref(false)
const previewItem = ref<StudioWork>()
const brokenPosters = reactive<Record<number, boolean>>({})
const listEl = ref<HTMLElement | null>(null)
let pollTimer = 0
let pageSeq = 0

const currentModel = computed(() => models.value.find((item) => item.id === modelId.value))
const modelOptions = computed(() =>
  models.value.map((item) => ({
    label: `${item.name || item.model || String(item.id)}${
      item.disabledReason ? `（${item.disabledReason}）` : ''
    }`,
    disabled: item.disabled === true,
    value: item.id,
  }))
)
const ratioOptions = computed(() =>
  (currentModel.value?.ratio ?? []).filter(Boolean).map((value) => ({ label: value, value }))
)
const resolutionOptions = computed(() =>
  (currentModel.value?.resolution ?? []).filter(Boolean).map((value) => ({ label: value, value }))
)

function bound(model: CommonAiModelItem | undefined, key: string, fallback: number) {
  const n = Number(model?.mediaLimits?.[key])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const durationMin = computed(
  () =>
    currentModel.value?.pricing?.minDuration ??
    bound(currentModel.value, 'minTotalVideoDuration', 4)
)
const durationMax = computed(
  () =>
    currentModel.value?.pricing?.maxDuration ??
    bound(currentModel.value, 'maxTotalVideoDuration', 15)
)
const sliderMax = computed(() => Math.max(durationMin.value, durationMax.value))

function countLimit(primary: unknown, secondary: unknown, fallback: number) {
  const first = Number(primary)
  if (Number.isFinite(first) && first >= 0) return first
  const second = Number(secondary)
  if (Number.isFinite(second) && second >= 0) return second
  return fallback
}

const maxRefs = computed(() => {
  const limits = currentModel.value?.mediaLimits
  return countLimit(limits?.platformMaxImages, limits?.maxImages, 9)
})
const maxVideos = computed(() => {
  const limits = currentModel.value?.mediaLimits
  return countLimit(limits?.platformMaxVideos, limits?.maxVideos, 3)
})
const maxAudios = computed(() => {
  const limits = currentModel.value?.mediaLimits
  return countLimit(limits?.platformMaxAudios, limits?.maxAudios, 3)
})
const maxVideoDuration = computed(() => bound(currentModel.value, 'maxTotalVideoDuration', 15))
const maxAudioDuration = computed(() => bound(currentModel.value, 'maxTotalAudioDuration', 15))
const showRefs = computed(() => maxRefs.value > 0 || maxVideos.value > 0 || maxAudios.value > 0)
const estimatedPoints = computed(() =>
  estimateModelPoints(currentModel.value, {
    resolution: resolution.value,
    ratio: aspect.value,
    duration: duration.value,
    imageCount: refImages.value.length,
    referenceVideo: refVideos.value.length > 0,
    generateAudio: true,
  })
)
const pointsText = computed(() => `（${formatModelPoints(estimatedPoints.value)}）`)
const canSubmit = computed(() => {
  if (
    submitting.value ||
    !modelId.value ||
    currentModel.value?.disabled ||
    estimatedPoints.value == null
  )
    return false
  if (productMode)
    return maxRefs.value > 0 && refImages.value.length > 0 && !!productTitle.value.trim()
  return Boolean(
    prompt.value.trim() ||
      refImages.value.length ||
      refVideos.value.length ||
      refAudios.value.length
  )
})

function isPending(item: StudioWork) {
  return item.status === 0 || item.status === 10 || item.status === 11 || item.status === 12
}

function statusLabel(item: StudioWork) {
  if (item.status === 30) return '失败'
  if (isPending(item)) return '生成中'
  return ''
}

function videoSrc(item: StudioWork) {
  return item.status === 20 && item.videoUrl ? item.videoUrl : ''
}

function poster(item: StudioWork) {
  const cover = item.previewUrl || item.lastFrameUrl || ''
  if (!cover || cover === item.videoUrl) return ''
  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(cover.split(/[?#]/)[0])) return ''
  return cover
}

function paintThumb(event: Event) {
  const el = event.target
  if (!(el instanceof HTMLVideoElement) || el.currentTime > 0) return
  try {
    el.currentTime = 0.1
  } catch {
    // 元数据未就绪时保持黑帧，点击仍可进预览
  }
}

function openPreview(item: StudioWork) {
  if (!videoSrc(item)) return
  previewItem.value = item
  previewOpen.value = true
}

function formatTime(value: StudioWork['createTime']) {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    const date = new Date(value)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(
      date.getHours()
    )}:${p(date.getMinutes())}`
  }
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0] = value
    const p = (n: number) => String(n).padStart(2, '0')
    return `${y}-${p(m)}-${p(d)} ${p(h)}:${p(min)}`
  }
  return value.replace('T', ' ').slice(0, 16)
}

function syncModelFields() {
  const ratios = ratioOptions.value.map((item) => item.value)
  const resolutions = resolutionOptions.value.map((item) => item.value)
  if (!ratios.includes(aspect.value)) aspect.value = ratios[0] ?? ''
  if (!resolutions.includes(resolution.value)) resolution.value = resolutions[0] ?? ''
  const min = durationMin.value
  const max = Math.max(min, durationMax.value)
  duration.value = Math.min(max, Math.max(min, duration.value))
  if (refImages.value.length > maxRefs.value) {
    refImages.value = refImages.value.slice(0, maxRefs.value)
  }
  if (refVideos.value.length > maxVideos.value) {
    refVideos.value = refVideos.value.slice(0, maxVideos.value)
  }
  if (refAudios.value.length > maxAudios.value) {
    refAudios.value = refAudios.value.slice(0, maxAudios.value)
  }
}

function asUrlList(value: string | string[]) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

function fileExt(file: File) {
  const index = file.name.lastIndexOf('.')
  return index > -1 ? file.name.slice(index + 1).toLowerCase() : ''
}

function readFileDuration(file: File, kind: 'audio' | 'video') {
  return new Promise<number>((resolve, reject) => {
    const el = document.createElement(kind)
    const url = URL.createObjectURL(file)
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(el.duration)
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('metadata failed'))
    }
    el.src = url
  })
}

function readUrlDuration(url: string, kind: 'audio' | 'video') {
  return new Promise<number>((resolve, reject) => {
    const el = document.createElement(kind)
    const finish = (error: Error | null, value = 0) => {
      el.onloadedmetadata = null
      el.onerror = null
      el.removeAttribute('src')
      el.load()
      error ? reject(error) : resolve(value)
    }
    el.preload = 'metadata'
    el.onloadedmetadata = () => finish(null, el.duration)
    el.onerror = () =>
      finish(
        new Error(
          kind === 'audio'
            ? '无法读取音频时长，请更换文件后重试'
            : '无法读取参考视频时长，请重新上传或更换素材'
        )
      )
    el.src = url
  })
}

function minSingleVideoDuration(model: CommonAiModelItem | undefined) {
  const seedance25 = /^doubao-seedance-2[.-]5/.test(
    String(model?.model || '')
      .trim()
      .toLowerCase()
  )
  const raw = model?.mediaLimits?.minSingleVideoDuration
  if (raw === undefined) return seedance25 ? 1.8 : 0
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    if (seedance25) throw new Error('模型时长配置无效，请刷新模型配置后重试')
    return 0
  }
  return seedance25 ? Math.max(1.8, value) : value
}

async function assertRefVideos(urls: string[], model: CommonAiModelItem) {
  const min = minSingleVideoDuration(model)
  let total = 0
  for (let index = 0; index < urls.length; index += 1) {
    const name = `视频${index + 1}`
    const metadata = await readReferenceVideoMetadata(urls[index])
    if (isSeedance(model)) assertSeedanceDimensions(metadata.width, metadata.height, true, name)
    const value = metadata.duration
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`无法读取参考视频「${name}」时长，请重新上传或更换素材`)
    }
    if (min > 0 && value < min) {
      throw new Error(
        `参考视频「${name}」时长${String(
          value
        )}秒，当前模型要求每个参考视频至少 ${min} 秒，请更换素材`
      )
    }
    total += value
  }
  const minTotal = Number(
    model.mediaLimits?.minTotalVideoDuration ?? model.mediaLimits?.minVideoDuration
  )
  if (Number.isFinite(minTotal) && minTotal > 0 && total < minTotal) {
    throw new Error(`参考视频总时长${total}秒，不能低于${minTotal}秒`)
  }
  const max = bound(model, 'maxTotalVideoDuration', 15)
  if (total > max) throw new Error(`参考视频总时长${total.toFixed(3)}秒，不能超过${max}秒`)
}

async function assertRefAudios(urls: string[], maxTotal: number) {
  let total = 0
  for (const url of urls) {
    const value = await readUrlDuration(url, 'audio')
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('无法读取音频时长，请更换文件后重试')
    }
    if (value > maxTotal) throw new Error(`音频时长不能超过 ${maxTotal} 秒`)
    total += value
  }
  if (total > maxTotal) throw new Error(`音频总时长不能超过 ${maxTotal} 秒`)
}

// ponytail: 上传只拦单文件超长。多段合计在生成前再查，同批多选可能先传上再被拒。
async function validateLibraryVideos(urls: string[]) {
  if (currentModel.value) await assertRefVideos(urls, currentModel.value)
}
async function validateLibraryAudios(urls: string[]) {
  await assertRefAudios(urls, maxAudioDuration.value)
}

const beforeVideoUpload: UploadProps['beforeUpload'] = async (file) => {
  if (!['mp4', 'mov'].includes(fileExt(file)) || file.size / 1024 / 1024 >= 50) return true
  try {
    const value = await readFileDuration(file, 'video')
    if (!Number.isFinite(value) || value <= 0) {
      addToast('无法读取视频时长，请更换文件后重试', 'error')
      return false
    }
    const min = minSingleVideoDuration(currentModel.value)
    if (min > 0 && value < min) {
      addToast(`当前模型要求每个参考视频至少 ${min} 秒，请更换素材`, 'error')
      return false
    }
    const max = maxVideoDuration.value
    if (value > max) {
      addToast(`参考视频总时长${value.toFixed(3)}秒，不能超过${max}秒`, 'error')
      return false
    }
    return true
  } catch (error: unknown) {
    addToast(error instanceof Error ? error.message : '无法读取视频时长，请更换文件后重试', 'error')
    return false
  }
}

const beforeAudioUpload: UploadProps['beforeUpload'] = async (file) => {
  if (!['mp3', 'wav'].includes(fileExt(file)) || file.size / 1024 / 1024 >= 15) return true
  try {
    const value = await readFileDuration(file, 'audio')
    if (!Number.isFinite(value) || value <= 0) {
      addToast('无法读取音频时长，请更换文件后重试', 'error')
      return false
    }
    const max = maxAudioDuration.value
    if (value > max) {
      addToast(`音频时长不能超过 ${max} 秒`, 'error')
      return false
    }
    return true
  } catch (error: unknown) {
    addToast(error instanceof Error ? error.message : '无法读取音频时长，请更换文件后重试', 'error')
    return false
  }
}

watch(modelId, syncModelFields)

async function loadModels() {
  modelsLoading.value = true
  modelsError.value = ''
  try {
    models.value = await loadStudioModels('video')
    modelId.value = models.value.find((item) => !item.disabled)?.id
    syncModelFields()
  } catch (error: unknown) {
    models.value = []
    const msg = error instanceof Error ? error.message : '模型加载失败'
    modelsError.value = msg.includes('登录') ? '请先登录' : msg
  } finally {
    modelsLoading.value = false
  }
}

async function fetchPage(nextPage = 1) {
  const seq = ++pageSeq
  listLoading.value = true
  try {
    const page = await pageStudioWorks(
      'video',
      nextPage,
      10,
      productMode ? 'product-video' : 'video'
    )
    if (seq !== pageSeq) return
    const list = page.list ?? []
    const lastPage = Math.max(1, Math.ceil(page.total / 10))
    if (nextPage > lastPage) { await fetchPage(lastPage); return }
    works.value = list
    total.value = page.total ?? 0
    pageNo.value = nextPage
    schedulePoll()
  } catch (error: unknown) {
    if (seq !== pageSeq) return
    const msg = error instanceof Error ? error.message : '作品加载失败'
    if (!msg.includes('登录')) addToast(msg, 'error')
  } finally {
    if (seq === pageSeq) listLoading.value = false
  }
}

function schedulePoll() {
  window.clearInterval(pollTimer)
  if (!works.value.some(isPending)) return
  pollTimer = window.setInterval(() => {
    void refreshPending()
  }, 4000)
}

async function refreshPending() {
  const pending = works.value.filter(isPending)
  if (!pending.length) {
    window.clearInterval(pollTimer)
    return
  }
  await Promise.all(
    pending.map(async (item) => {
      try {
        const fresh = await getStudioWork('video', item.id)
        if (!fresh) return
        const index = works.value.findIndex((row) => row.id === item.id)
        if (index >= 0) works.value[index] = fresh
      } catch {
        // 单条轮询失败下轮再试
      }
    })
  )
}

async function handleDownload(item: StudioWork) {
  const url = videoSrc(item)
  if (!url || downloadingId.value) return
  downloadingId.value = item.id
  try {
    await downloadStudioFile(url, studioFileName('video', item.id, url))
  } catch (error: unknown) {
    addToast(error instanceof Error ? error.message : '下载失败', 'error')
  } finally {
    downloadingId.value = undefined
  }
}

function handleDelete(item: StudioWork) {
  Modal.confirm({
    title: '删除这条作品？',
    content: '删除后无法恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      deletingId.value = item.id
      try {
        await deleteStudioWork('video', item.id)
        await fetchPage(pageNo.value)
      } catch (error: unknown) {
        addToast(error instanceof Error ? error.message : '删除失败', 'error')
        throw error
      } finally {
        deletingId.value = undefined
      }
    },
  })
}

async function handleGenerate() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (!canSubmit.value || !modelId.value || !currentModel.value) return
  submitting.value = true
  try {
    if (isSeedance(currentModel.value)) {
      for (let i = 0; i < refImages.value.length; i += 1) {
        const result = await validateAiImageConstraints(refImages.value[i])
        if (!result.valid)
          throw new Error(
            `参考图不合格：${formatAiImageValidationError(
              result,
              `参考图${i + 1}`
            )}；宽高需300–6000px，宽高比需0.4–2.5`
          )
      }
    }
    if (refVideos.value.length) await assertRefVideos(refVideos.value, currentModel.value)
    if (refAudios.value.length) await assertRefAudios(refAudios.value, maxAudioDuration.value)
    const params = buildVideoParams({
      prompt: productMode
        ? buildProductVideoPrompt(productTitle.value, productSellingPoints.value, prompt.value)
        : prompt.value,
      aspect: aspect.value,
      duration: duration.value,
      resolution: resolution.value,
      refImages: refImages.value,
      refVideos: refVideos.value,
      refAudios: refAudios.value,
      mediaLimits: currentModel.value.mediaLimits,
    })
    if (!params) {
      addToast('请填写提示词或上传参考素材', 'info')
      return
    }
    await submitStudioVideo({
      creationTool: productMode ? 'product-video' : 'video',
      modelId: modelId.value,
      model: currentModel.value?.model,
      params,
    })
    listEl.value?.scrollTo({ top: 0 })
    await fetchPage(1)
  } catch (error: unknown) {
    addToast(error instanceof Error ? error.message : '生成失败', 'error')
  } finally {
    submitting.value = false
  }
}

watch(isLoggedIn, (loggedIn) => {
  if (!loggedIn) {
    pageSeq++
    window.clearInterval(pollTimer)
    listLoading.value = false
    pageNo.value = 1
    works.value = []
    total.value = 0
    return
  }
  if (!models.value.length || modelsError.value) void loadModels()
  void fetchPage(1)
})

watch(
  () => [productMode, route.query.prompt],
  () => {
    prompt.value = typeof route.query.prompt === 'string' ? route.query.prompt.slice(0, 30000) : ''
    productTitle.value = ''
    productSellingPoints.value = ''
    refImages.value = []
    refVideos.value = []
    refAudios.value = []
  },
  { immediate: true }
)

onMounted(() => {
  void loadModels()
  void fetchPage(1)
})

onBeforeUnmount(() => {
  window.clearInterval(pollTimer)
})
</script>

<style lang="scss" src="./video.scss"></style>
