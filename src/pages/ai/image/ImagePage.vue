<template>
  <PageContainer flush>
    <div class="studio">
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
            <p v-if="modelsError" class="studio__error">{{ modelsError }}</p>
            <p v-else-if="!modelsLoading && !models.length" class="studio__hint">暂无可用模型</p>
          </section>

          <section class="studio__section">
            <h3 class="studio__label">提示词</h3>
            <Input.TextArea
              v-model:value="prompt"
              :rows="6"
              :maxlength="2000"
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
          </section>

          <section v-if="maxRefs > 0" class="studio__section">
            <h3 class="studio__label">参考图</h3>
            <ImageUpload
              :key="`${modelId ?? 0}-${maxRefs}`"
              require-login
              :max-count="maxRefs"
              :file-size="10"
              :existing-urls="refImages"
              empty-desc="可选，作为生成参考"
              @upload-complete="refImages = $event"
            />
          </section>
        </div>

        <div class="studio__footer">
          <Button
            type="primary"
            block
            size="large"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="handleGenerate"
          >
            生成{{ pointsText }}
          </Button>
        </div>
      </aside>

      <main class="studio__results scroll-area" ref="listEl">
        <div v-if="listLoading && !works.length" class="studio__empty">加载中…</div>
        <div v-else-if="!works.length" class="studio__empty">
          还没有作品。左侧填写后生成，画布里的结果不会出现在这里。
        </div>
        <article
          v-for="item in works"
          :key="item.id"
          :ref="(el) => setCardEl(item.id, el)"
          class="studio__card"
        >
          <header class="studio__card-head">
            <span class="studio__card-model">{{ item.modelName || item.model || '生成结果' }}</span>
            <span
              v-if="statusLabel(item)"
              class="studio__card-status"
              :data-fail="item.status === 30"
            >
              {{ statusLabel(item) }}
            </span>
            <time class="studio__card-time">{{ formatTime(item.createTime) }}</time>
          </header>
          <p v-if="item.prompt" class="studio__card-prompt">{{ item.prompt }}</p>
          <p v-if="item.status === 30 && item.errorMessage" class="studio__card-error">
            {{ item.errorMessage }}
          </p>
          <div class="studio__media">
            <img v-if="imageSrc(item)" :src="imageSrc(item)" alt="" />
            <span v-else-if="isPending(item)" class="studio__media-wait"
              >生成中{{ item.progress ? ` ${item.progress}` : '' }}</span
            >
          </div>
        </article>
        <button
          v-if="hasMore"
          type="button"
          class="studio__more"
          :disabled="listLoading"
          @click="loadMore"
        >
          {{ listLoading ? '加载中…' : '加载更多' }}
        </button>
      </main>

      <aside v-if="thumbs.length" class="studio__thumbs scroll-area">
        <button
          v-for="item in thumbs"
          :key="item.id"
          type="button"
          class="studio__thumb"
          :class="{ 'studio__thumb--active': item.id === activeId }"
          @click="scrollTo(item.id)"
        >
          <img :src="imageSrc(item)" alt="" />
        </button>
      </aside>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button, Input, Select } from 'ant-design-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type { CommonAiModelItem } from '@/service/api/ai-model'
import {
  getStudioWork,
  loadStudioModels,
  pageStudioWorks,
  submitStudioImage,
  type StudioWork,
} from '../api'

const { isLoggedIn, openLogin } = useAuth()
const { addToast } = useToast()

const models = ref<CommonAiModelItem[]>([])
const modelsLoading = ref(true)
const modelsError = ref('')
const modelId = ref<number>()
const prompt = ref('')
const aspect = ref('')
const resolution = ref('')
const refImages = ref<string[]>([])
const submitting = ref(false)

const works = ref<StudioWork[]>([])
const total = ref(0)
const pageNo = ref(1)
const listLoading = ref(false)
const activeId = ref<number>()
const listEl = ref<HTMLElement | null>(null)
const cardEls = new Map<number, HTMLElement>()
let pollTimer = 0
let pageSeq = 0

const currentModel = computed(() => models.value.find((item) => item.id === modelId.value))
const modelOptions = computed(() =>
  models.value.map((item) => ({
    label: item.name || item.model || String(item.id),
    value: item.id,
  }))
)
const ratioOptions = computed(() =>
  (currentModel.value?.ratio ?? []).filter(Boolean).map((value) => ({ label: value, value }))
)
const resolutionOptions = computed(() =>
  (currentModel.value?.resolution ?? []).filter(Boolean).map((value) => ({ label: value, value }))
)
const maxRefs = computed(() => {
  const limits = currentModel.value?.mediaLimits
  const raw = limits?.platformMaxImages ?? limits?.maxImages
  if (raw == null) return 9
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 9
})
const pointsText = computed(() => {
  const model = currentModel.value
  if (!model) return ''
  const base = model.pointsPerUse ?? 0
  const scale = Number(model.resolutionScales?.[resolution.value])
  const points = base * (Number.isFinite(scale) && scale > 0 ? scale : 1)
  return points > 0 ? ` · ${points} 算力` : ''
})
const canSubmit = computed(() => Boolean(!submitting.value && modelId.value && prompt.value.trim()))
const hasMore = computed(() => works.value.length < total.value)
const thumbs = computed(() => works.value.filter((item) => imageSrc(item)))

function isPending(item: StudioWork) {
  return item.status === 0 || item.status === 10 || item.status === 11 || item.status === 12
}

function statusLabel(item: StudioWork) {
  if (item.status === 30) return '失败'
  if (isPending(item)) return '生成中'
  return ''
}

function imageSrc(item: StudioWork) {
  if (item.picUrl) return item.picUrl
  const first = item.picUrls?.[0]
  if (!first) return ''
  if (typeof first === 'string') return first
  return first.url || ''
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
  if (refImages.value.length > maxRefs.value) {
    refImages.value = refImages.value.slice(0, maxRefs.value)
  }
}

watch(modelId, syncModelFields)

async function loadModels() {
  modelsLoading.value = true
  modelsError.value = ''
  try {
    models.value = await loadStudioModels('image')
    modelId.value = models.value[0]?.id
    syncModelFields()
  } catch (error: unknown) {
    models.value = []
    const msg = error instanceof Error ? error.message : '模型加载失败'
    modelsError.value = msg.includes('登录') ? '请先登录' : msg
  } finally {
    modelsLoading.value = false
  }
}

async function fetchPage(reset: boolean) {
  if (listLoading.value && !reset) return
  const seq = ++pageSeq
  listLoading.value = true
  const nextPage = reset ? 1 : pageNo.value + 1
  try {
    const page = await pageStudioWorks('image', nextPage)
    if (seq !== pageSeq) return
    const list = page.list ?? []
    works.value = reset ? list : works.value.concat(list)
    total.value = page.total ?? works.value.length
    pageNo.value = nextPage
    if (!activeId.value && works.value[0]) activeId.value = works.value[0].id
    schedulePoll()
  } catch (error: unknown) {
    if (seq !== pageSeq) return
    const msg = error instanceof Error ? error.message : '作品加载失败'
    if (!msg.includes('登录')) addToast(msg, 'error')
  } finally {
    if (seq === pageSeq) listLoading.value = false
  }
}

function loadMore() {
  void fetchPage(false)
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
        const fresh = await getStudioWork('image', item.id)
        if (!fresh) return
        const index = works.value.findIndex((row) => row.id === item.id)
        if (index >= 0) works.value[index] = fresh
      } catch {
        // 单条轮询失败下轮再试
      }
    })
  )
}

function setCardEl(id: number, el: unknown) {
  if (el instanceof HTMLElement) cardEls.set(id, el)
  else cardEls.delete(id)
}

function scrollTo(id: number) {
  activeId.value = id
  cardEls.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function handleGenerate() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (!canSubmit.value || !modelId.value) return
  submitting.value = true
  try {
    await submitStudioImage({
      modelId: modelId.value,
      model: currentModel.value?.model,
      prompt: prompt.value.trim(),
      aspectRatio: aspect.value || undefined,
      resolution: resolution.value || undefined,
      image: refImages.value.length ? refImages.value : undefined,
    })
    listEl.value?.scrollTo({ top: 0 })
    await fetchPage(true)
  } catch (error: unknown) {
    addToast(error instanceof Error ? error.message : '生成失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadModels()
  void fetchPage(true)
})

onBeforeUnmount(() => {
  window.clearInterval(pollTimer)
})
</script>

<style lang="scss" src="./image.scss"></style>
