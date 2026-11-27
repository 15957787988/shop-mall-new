<template>
  <div class="creation-workbench">
    <aside class="creation-form">
      <div class="creation-form__body scroll-area">
        <Alert v-if="submitError" type="warning" show-icon :message="submitError" />
        <Alert v-if="configError" type="warning" :message="configError"
          ><template #action><Button @click="loadConfig">重试</Button></template></Alert
        >
        <fieldset :disabled="locked" :inert="locked ? '' : undefined">
          <section class="creation-section">
            <h3>商品原图<small>支持 1 张图片</small></h3>
            <ImageUpload
              :key="uploadVersion"
              :existing-urls="products"
              :max-count="config?.maxProductImages || 1"
              :file-size="config?.maxFileMb"
              preview
              drag
              @upload-complete="products = $event"
              @uploading-change="uploads.product = $event"
            />
          </section>
          <section class="creation-section">
            <h3>精修方式</h3>
            <Radio.Group v-model:value="mode" class="retouch-modes" aria-label="精修方式">
              <div
                v-for="option in config?.modes || []"
                :key="option.id"
                class="retouch-mode"
                :class="{ selected: mode === option.id }"
              >
                <Radio :value="option.id"
                  ><strong>{{ option.name }}</strong
                  ><small>{{ option.description }}</small></Radio
                >
              </div>
            </Radio.Group>
          </section>
          <section class="creation-section">
            <h3>快捷优化项<small>可多选，合成一张图</small></h3>
            <div class="retouch-options">
              <label
                v-for="option in config?.optimizations || []"
                :key="option.id"
                :class="{ selected: optimizations.includes(option.id) }"
              >
                <input v-model="optimizations" type="checkbox" :value="option.id" />
                <span
                  ><strong>{{ option.name }}</strong
                  ><small>{{ option.description }}</small></span
                >
              </label>
            </div>
          </section>
          <section class="creation-section">
            <h3>补充要求</h3>
            <Input.TextArea
              v-model:value="requirements"
              :rows="3"
              :maxlength="1000"
              placeholder="选填，例如：清理表面灰尘、保留磨砂质感"
            />
          </section>
          <section class="creation-section">
            <div class="creation-fields">
              <label
                >模型<Select
                  v-model:value="modelId"
                  :options="modelOptions"
                  :loading="modelsLoading"
                  placeholder="请选择模型"
              /></label>
              <label v-if="resolutionOptions.length"
                >分辨率<Select v-model:value="resolution" :options="resolutionOptions"
              /></label>
            </div>
            <p v-if="modelsError" class="creation-error">
              {{ modelsError }} <button type="button" @click="loadModels">重试</button>
            </p>
            <div class="creation-fields">
              <label v-if="ratioOptions.length"
                >图片比例<Select v-model:value="aspect" :options="ratioOptions"
              /></label>

              <label v-if="isGptImageFlare">输出格式<Select v-model:value="outputFormat" :options="outputFormatOptions" :disabled="locked" /></label>
            </div>
            <p v-if="referenceError" class="creation-error">{{ referenceError }}</p>
          </section>
        </fieldset>
      </div>
      <footer class="creation-form__footer">
        <Button
          type="primary"
          size="large"
          block
          :loading="planning || submitting"
          :disabled="planning || submitting || configLoading || (!pendingItems && !canSubmit)"
          @click="generate"
        >
          <ThunderboltOutlined />{{
            planning
              ? '正在分析商品与精修问题'
              : pendingItems
              ? '核对并继续原请求'
              : `生成产品精修（${formatModelPoints(points)}）`
          }}
        </Button>
      </footer>
    </aside>
    <main class="creation-results scroll-area">
      <ProductRetouchResults :revision="revision" hide-heading />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Alert, Button, Input, Radio, Select } from 'ant-design-vue'
import { ThunderboltOutlined } from '@ant-design/icons-vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { loadStudioModels } from '@/pages/product-retouch/api'
import type {
  CommonAiModelItem,
  ProductRetouchConfig,
  CollectionItem,
} from '@/pages/product-retouch/api'
import {
  loadProductRetouchConfig,
  planProductRetouch,
  submitCollection,
} from '@/pages/product-retouch/api'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/types/api'
import ProductRetouchResults from './components/ProductRetouchResults.vue'

// ponytail: dev 预填商品图暂关
// const MOCK_PRODUCT_URL =
//   'https://xiuxiu-pro-new.meitudata.com/bizshoot/6afd6b7430980d0i5z5vyt3896.jpeg'

const route = useRoute()
const { isLoggedIn, openLogin, userInfo } = useAuth()
const { addToast } = useToast()
const config = ref<ProductRetouchConfig>()
const configError = ref('')
const configLoading = ref(false)
const products = ref<string[]>([])
const uploads = reactive({ product: false })
const mode = ref('')
const requirements = ref('')
const optimizations = ref<string[]>([])
const models = ref<CommonAiModelItem[]>([])
const modelsLoading = ref(false)
const modelsError = ref('')
const modelId = ref<number>()
const aspect = ref('')
const resolution = ref('')
const outputFormat = ref('png')
const isGptImageFlare = computed(() => model.value?.model === 'gpt-image-2.6-flare')
const outputFormatOptions = ['png', 'jpeg', 'webp', 'svg', 'gif'].map(value => ({
  label: ['svg', 'gif'].includes(value) ? `${value}（仅文生图）` : value,
  value,
  disabled: ['svg', 'gif'].includes(value),
}))
const planning = ref(false)
const submitting = ref(false)
const submitError = ref('')
const pendingItems = ref<CollectionItem[]>()
const revision = ref(0)
const uploadVersion = ref(0)
let disposed = false
let accountVersion = 0
const locked = computed(
  () => planning.value || submitting.value || configLoading.value || !!pendingItems.value
)
const model = computed(() => models.value.find((item) => item.id === modelId.value))
const modelOptions = computed(() =>
  models.value.map((item) => ({
    value: item.id,
    label: `${item.name || item.model}${item.disabledReason ? `（${item.disabledReason}）` : ''}`,
    disabled: !!item.disabled,
  }))
)
const ratioOptions = computed(() =>
  (model.value?.ratio || []).map((value) => ({ label: value, value }))
)
const resolutionOptions = computed(() =>
  (model.value?.resolution || []).map((value) => ({ label: value, value }))
)
const images = computed(() => [...products.value])
const referenceError = computed(() => {
  const raw = Number(
    model.value?.mediaLimits?.platformMaxImages ?? model.value?.mediaLimits?.maxImages ?? 9
  )
  const limit = Number.isFinite(raw) && raw >= 0 ? raw : 9
  return images.value.length > limit
    ? `当前模型最多支持 ${limit} 张参考图，请减少商品图或更换模型。`
    : ''
})
const points = computed(() =>
  model.value
    ? estimateModelPoints(model.value, {
        resolution: resolution.value,
    outputFormat: isGptImageFlare.value ? outputFormat.value : undefined,
        ratio: aspect.value,
        imageCount: images.value.length,
        count: 1,
      })
    : null
)
const canSubmit = computed(
  () =>
    !!config.value &&
    config.value.modes.some((option) => option.id === mode.value) &&
    !!model.value &&
    !model.value.disabled &&
    points.value != null &&
    !referenceError.value &&
    products.value.length > 0 &&
    products.value.length <= config.value.maxProductImages &&
    new Set(optimizations.value).size === optimizations.value.length &&
    optimizations.value.every((id) =>
      config.value!.optimizations.some((option) => option.id === id)
    ) &&
    (optimizations.value.length > 0 || !!requirements.value.trim()) &&
    !Object.values(uploads).some(Boolean)
)
const pendingKey = computed(
  () => `creation-pending:${userInfo.value?.id || 'anonymous'}:product-retouch`
)
watch(modelId, () => {
  if (!model.value?.ratio?.includes(aspect.value))
    aspect.value = model.value?.ratio?.includes('1:1') ? '1:1' : model.value?.ratio?.[0] || ''
  if (!model.value?.resolution?.includes(resolution.value))
    resolution.value = model.value?.resolution?.[0] || ''
})
watch(
  () => userInfo.value?.id,
  () => {
    accountVersion++
    products.value = []
    uploads.product = false
    requirements.value =
      typeof route.query.prompt === 'string' ? route.query.prompt.slice(0, 1000) : ''
    pendingItems.value = undefined
    submitError.value = ''
    uploadVersion.value++
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(pendingKey.value) || 'null')
      if (
        Array.isArray(saved) &&
        saved.length > 0 &&
        saved.length <= 3 &&
        saved.every(
          (item) =>
            item &&
            item.creationTool === 'product-retouch' &&
            typeof item.idempotencyKey === 'string' &&
            typeof item.prompt === 'string' &&
            !!item.prompt.trim() &&
            item.prompt.length <= 10000 &&
            typeof item.modelId === 'number' &&
            Array.isArray(item.image)
        )
      ) {
        pendingItems.value = saved as CollectionItem[]
        submitError.value = '上一次提交尚未确认，请核对并继续原请求，系统将复用原任务。'
      }
    } catch {
      submitError.value = '无法读取上次请求记录，请先在作品中核对是否已提交。'
    }
    // applyDevProductMock()
  },
  { immediate: true }
)
// function applyDevProductMock() {
//   if (!import.meta.env.DEV) return
//   products.value = [MOCK_PRODUCT_URL]
// }
async function loadConfig() {
  if (configLoading.value) return
  configLoading.value = true
  configError.value = ''
  try {
    const result = await loadProductRetouchConfig()
    if (disposed) return
    config.value = result
    optimizations.value = [...result.defaults]
    if (!result.modes.some((option) => option.id === mode.value)) mode.value = result.defaultMode
  } catch (e) {
    configError.value = e instanceof Error ? e.message : '精修配置加载失败'
  } finally {
    configLoading.value = false
  }
}
async function loadModels() {
  modelsLoading.value = true
  modelsError.value = ''
  try {
    models.value = await loadStudioModels('image')
    modelId.value = models.value.find((item) => !item.disabled)?.id
  } catch (e) {
    modelsError.value = e instanceof Error ? e.message : '模型加载失败'
  } finally {
    modelsLoading.value = false
  }
}
function planRequest() {
  return {
    productUrl: products.value[0],
    mode: mode.value,
    optimizations: [...optimizations.value],
    requirements: requirements.value,
    aspectRatio: aspect.value,
    output_format: isGptImageFlare.value ? outputFormat.value : undefined,
  }
}
async function generate() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (planning.value || submitting.value || (!pendingItems.value && !canSubmit.value)) return
  const owner = userInfo.value?.id
  const version = accountVersion
  const storageKey = pendingKey.value
  const active = () => !disposed && owner === userInfo.value?.id && version === accountVersion
  if (!pendingItems.value) {
    const request = planRequest()
    const fingerprint = JSON.stringify({
      request,
      modelId: modelId.value,
      aspect: aspect.value,
      output_format: isGptImageFlare.value ? outputFormat.value : undefined,
      resolution: resolution.value,
    })
    planning.value = true
    submitError.value = ''
    try {
      const plan = await planProductRetouch(request)
      if (
        !active() ||
        fingerprint !==
          JSON.stringify({
            request: planRequest(),
            modelId: modelId.value,
            aspect: aspect.value,
            output_format: isGptImageFlare.value ? outputFormat.value : undefined,
            resolution: resolution.value,
          })
      )
        return
      if (!plan.prompt?.trim() || plan.prompt.length > 10000)
        throw new Error('精修方案不完整，尚未提交图片生成')
      pendingItems.value = [
        {
          creationTool: 'product-retouch',
          creationLabel: '产品精修',
          creationBatchId: crypto.randomUUID(),
          creationIndex: 0,
          idempotencyKey: `creation:${crypto.randomUUID()}`,
          modelId: model.value!.id,
          model: model.value!.model,
          requirements: requirements.value,
          prompt: plan.prompt,
          image: [...images.value],
          aspectRatio: aspect.value,
          output_format: isGptImageFlare.value ? outputFormat.value : undefined,
          resolution: resolution.value,
        },
      ]
    } catch (e) {
      if (active())
        submitError.value = e instanceof Error ? e.message : '商品分析失败，尚未提交图片生成'
      return
    } finally {
      planning.value = false
    }
  }
  if (!active() || !pendingItems.value) return
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(pendingItems.value))
  } catch {
    pendingItems.value = undefined
    submitError.value = '无法保存请求记录，请允许站点使用会话存储后重试。'
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    await submitCollection(pendingItems.value)
    sessionStorage.removeItem(storageKey)
    if (active()) {
      pendingItems.value = undefined
      revision.value++
      addToast('图片已提交，结果会自动更新', 'success')
    }
  } catch (e) {
    if (!active()) return
    if (e instanceof ApiError && e.code >= 400 && e.code < 500) {
      sessionStorage.removeItem(storageKey)
      pendingItems.value = undefined
    }
    submitError.value =
      (e instanceof Error ? e.message : '提交未确认') +
      (pendingItems.value ? '。请核对并继续原请求，不要重复新建。' : '')
  } finally {
    submitting.value = false
  }
}
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    if (!config.value) void loadConfig()
    if (!models.value.length || modelsError.value) void loadModels()
  }
})
onMounted(() => {
  void loadConfig()
  void loadModels()
})
onBeforeUnmount(() => {
  disposed = true
})
</script>
<style scoped lang="scss" src="./index.scss"></style>
