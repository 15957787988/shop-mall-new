<template>
  <div class="creation-workbench">
    <aside class="creation-form">
      <div class="creation-form__body scroll-area">
        <Alert v-if="configError" type="warning" :message="configError"
          ><template #action><Button @click="loadFashionConfig">重试</Button></template></Alert
        >
        <Alert v-if="submitError" type="warning" show-icon :message="submitError" />
        <fieldset :disabled="locked" :inert="locked ? '' : undefined">
          <section v-for="group in uploadGroups" :key="group.key" class="creation-section">
            <h3>
              商品原图<small>支持 1–{{ group.max }} 张图片</small>
            </h3>
            <ImageUpload
              :key="`${group.key}-${uploadVersion}`"
              :existing-urls="references[group.key] || []"
              :max-count="group.max"
              :file-size="modeConfig?.maxFileMb"
              preview
              drag
              @upload-complete="references[group.key] = $event"
              @uploading-change="uploads[group.key] = $event"
            />
          </section>
          <section class="creation-section">
            <div class="fashion-requirements-heading">
              <h3>补充要求</h3>
              <AiWriteButton
                :loading="aiWriting"
                :disabled="locked || !images.length || Object.values(uploads).some(Boolean)"
                @click="handleAiWrite"
              />
            </div>
            <Input.TextArea
              v-model:value="requirements"
              :rows="3"
              :maxlength="1000"
              placeholder="选填，例如：风格方向、商品卖点、使用场景、展示细节等"
            />
          </section>
          <section class="creation-section">
            <h3>语言</h3>
            <Select v-model:value="language" :options="languageOptions" class="fashion-ratio" />
          </section>
          <section class="creation-section">
            <h3>生成类型</h3>
            <div class="fashion-types">
              <div v-for="module in tool.modules" :key="module.id" class="fashion-type">
                <label class="fashion-type__copy"
                  ><input v-model="selectedModules" type="checkbox" :value="module.id" /><span
                    ><strong>{{ module.name }}</strong
                    ><small>{{ module.description }}</small></span
                  ></label
                >
                <Radio.Group
                  v-if="module.variants?.length"
                  v-model:value="whiteView"
                  size="small"
                  option-type="button"
                  button-style="solid"
                  :options="module.variants"
                  :disabled="!selectedModules.includes(module.id)"
                />
                <label v-else-if="module.backgroundToggle" class="fashion-type__background"
                  ><input
                    v-model="whiteBackgrounds[module.id]"
                    type="checkbox"
                    :disabled="!selectedModules.includes(module.id)"
                  />白底图</label
                >
                <div v-else-if="module.maxCount > 1" class="fashion-type__counter">
                  <button
                    type="button"
                    :aria-label="`减少${module.name}张数`"
                    :disabled="fashionCounts[module.id] <= 1"
                    @click="adjustCount(module.id, module.maxCount, -1)"
                  >
                    −</button
                  ><span>{{ fashionCounts[module.id] }}</span
                  ><button
                    type="button"
                    :aria-label="`增加${module.name}张数`"
                    :disabled="fashionCounts[module.id] >= module.maxCount"
                    @click="adjustCount(module.id, module.maxCount, 1)"
                  >
                    ＋
                  </button>
                </div>
              </div>
            </div>
          </section>
          <section class="creation-section">
            <h3>生成设置</h3>
            <div class="creation-fields">
              <label
                >模型<Select v-model:value="modelId" :options="modelOptions" :loading="modelsLoading"
              /></label>
              <label v-if="resolutionOptions.length"
                >分辨率<Select v-model:value="resolution" :options="resolutionOptions"
              /></label>
            </div>
            <div class="creation-fields">
              <label v-if="ratioOptions.length"
                >图片比例<Select v-model:value="aspect" :options="ratioOptions" /></label
              >
              <label v-if="isGptImageFlare"
                >输出格式<Select
                  v-model:value="outputFormat"
                  :options="outputFormatOptions"
                  :disabled="locked"
              /></label>
            </div>
            <p v-if="modelsError" class="creation-error">
              {{ modelsError }} <button type="button" @click="loadModels">重试</button>
            </p>
            <p v-if="referenceError" class="creation-error">{{ referenceError }}</p>
          </section>
        </fieldset>
      </div>
      <footer class="creation-form__footer">
        <Button
          type="primary"
          size="large"
          block
          :loading="submitting || planning"
          :disabled="planning || (!pendingItems && !canSubmit)"
          @click="generate"
          ><ThunderboltOutlined />{{
            planning
              ? `正在准备服装组图（已完成 ${fashionPlans.length}/${productReferences.length}）`
              : pendingItems
              ? '核对并继续原请求'
              : isFashion
              ? `生成${tool.name}（${formatModelPoints(points)}）`
              : `生成${outputs.length ? ` ${outputs.length} 张` : ''}图片（${formatModelPoints(
                  points
                )}）`
          }}</Button
        ><small>每张图片独立结算；失败后按现有规则解冻。</small>
      </footer>
    </aside>
    <main class="creation-results scroll-area">
      <FashionSetResults :revision="revision" hide-heading />
    </main>
  </div>
</template>

<script setup lang="ts">
import AiWriteButton from '@/components/AiWriteButton.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Alert, Button, Input, Radio, Select } from 'ant-design-vue'
import { ThunderboltOutlined } from '@ant-design/icons-vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { loadStudioModels, type CommonAiModelItem } from '@/pages/fashion-set/api'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/types/api'
import { aiWriteSellingPoints } from '@/service/api/shop-image-group'
import { imageTool } from '@/lib/creation/catalog'
import {
  loadFashionWorkbenchConfig,
  planFashionBasic,
  planFashionPhotoshoot,
  submitCollection,
  type FashionMode,
  type FashionWorkbenchConfig,
  type CollectionItem,
  type FashionPhotoshootPlan,
} from '@/pages/fashion-set/api'
import FashionSetResults from './components/FashionSetResults.vue'

// ponytail: dev 预填参考图暂关
const MOCK_REFERENCE_URL =
  'https://storage.pixpix.media/pixpix/frontend/images/tools/apparel-set-1-1.webp'

const route = useRoute()
const fashionMode = ref<FashionMode>('basic')
const productMode = ref<'single' | 'batch'>('single')
const fashionCounts = reactive<Record<string, number>>({})
const fashionConfig = ref<FashionWorkbenchConfig>()
const configError = ref('')
const modeConfig = computed(() => fashionConfig.value?.[fashionMode.value])
const modelBuilding = ref(false)
const whiteView = ref('white-front')
const whiteBackgrounds = reactive<Record<string, boolean>>({})
const tool = computed(() => ({
  ...imageTool('fashion-set'),
  ...modeConfig.value,
  groups: modeConfig.value?.groups || [],
  modules: modeConfig.value?.modules.filter((module) => !module.hidden) || [],
  defaults: modeConfig.value?.defaults || [],
  rule: '',
}))
const isFashion = computed(() => ['virtual-try-on', 'fashion-set'].includes(tool.value.code))
const isFashionWear = computed(
  () => isFashion.value && (tool.value.code === 'virtual-try-on' || fashionMode.value === 'wear')
)
const uploadGroups = computed(() =>
  tool.value.groups.filter((group) => !isFashion.value || group.key !== 'person')
)
const { isLoggedIn, openLogin, userInfo } = useAuth()
const { addToast } = useToast()
const title = ref('')
const sellingPoints = ref('')
const requirements = ref('')
const platform = ref('电商商品展示')
const language = ref('英语')
const platformOptions = ['电商商品展示', 'Amazon A+', '独立站', '社交媒体'].map((value) => ({
  label: value,
  value,
}))
const languageOptions = ['中文', '英语', '日语'].map((value) => ({ label: value, value }))
const references = reactive<Record<string, string[]>>({})
const uploads = reactive<Record<string, boolean>>({})
const selectedModules = ref<string[]>([])
const outputs = ref<{ id: string; label: string }[]>([])
const models = ref<CommonAiModelItem[]>([])
const modelsLoading = ref(false)
const modelsError = ref('')
const modelId = ref<number>()
const aspect = ref('')
const resolution = ref('')
const outputFormat = ref('png')
const isGptImageFlare = computed(() => currentModel.value?.model === 'gpt-image-2.6-flare')
const outputFormatOptions = ['png', 'jpeg', 'webp', 'svg', 'gif'].map((value) => ({
  label: ['svg', 'gif'].includes(value) ? `${value}（仅文生图）` : value,
  value,
  disabled: ['svg', 'gif'].includes(value),
}))
const submitting = ref(false)
const planning = ref(false)
const aiWriting = ref(false)
const fashionPlans = ref<FashionPhotoshootPlan[]>([])
const plannedFingerprint = ref('')
let disposed = false
const submitError = ref('')
const pendingItems = ref<CollectionItem[]>()
const revision = ref(0)
const uploadVersion = ref(0)
const locked = computed(
  () =>
    submitting.value ||
    planning.value ||
    aiWriting.value ||
    modelBuilding.value ||
    !!pendingItems.value
)
const currentModel = computed(() => models.value.find((model) => model.id === modelId.value))
const modelOptions = computed(() =>
  models.value.map((model) => ({
    value: model.id,
    label: `${model.name || model.model}${
      model.disabledReason ? `（${model.disabledReason}）` : ''
    }`,
    disabled: !!model.disabled,
  }))
)
const ratioOptions = computed(() =>
  (currentModel.value?.ratio || []).map((value) => ({ label: value, value }))
)
const resolutionOptions = computed(() =>
  (currentModel.value?.resolution || []).map((value) => ({ label: value, value }))
)
const productReferences = computed(() =>
  productMode.value === 'batch'
    ? (references.garment || []).map((url) => ({ ...references, garment: [url] }))
    : [{ ...references }]
)
const promptReferences = computed(() => productReferences.value[0] || references)
const images = computed(() =>
  tool.value.groups.flatMap((group) => promptReferences.value[group.key] || [])
)
const referenceError = computed(() => {
  const raw = Number(
    currentModel.value?.mediaLimits?.platformMaxImages ??
      currentModel.value?.mediaLimits?.maxImages ??
      9
  )
  const limit = Number.isFinite(raw) && raw >= 0 ? raw : 9
  return images.value.length > limit
    ? `当前模型最多支持 ${limit} 张参考图，请减少素材或更换模型。`
    : ''
})
const points = computed(() => {
  if (!currentModel.value || !outputs.value.length) return null
  return estimateModelPoints(currentModel.value, {
    resolution: resolution.value,
    outputFormat: isGptImageFlare.value ? outputFormat.value : undefined,
    ratio: aspect.value,
    imageCount: images.value.length,
    count: outputs.value.length * productReferences.value.length,
  })
})
const canSubmit = computed(
  () =>
    !modelBuilding.value &&
    !aiWriting.value &&
    !Object.values(uploads).some(Boolean) &&
    !!currentModel.value &&
    !currentModel.value.disabled &&
    points.value != null &&
    !referenceError.value &&
    outputs.value.length > 0 &&
    !!modeConfig.value &&
    tool.value.groups.every((group) => (references[group.key] || []).length >= group.min)
)
const pendingKey = computed(
  () => `creation-pending:${userInfo.value?.id || 'anonymous'}:${tool.value.code}`
)
watch(modelId, () => {
  const model = currentModel.value
  if (!model?.ratio?.includes(aspect.value))
    aspect.value =
      ['3:4', '4:5', '2:3', '1:1'].find((ratio) => model?.ratio?.includes(ratio)) ||
      model?.ratio?.[0] ||
      ''
  if (!model?.resolution?.includes(resolution.value))
    resolution.value = model?.resolution?.[0] || ''
})
watch(
  [
    tool,
    title,
    sellingPoints,
    requirements,
    platform,
    language,
    references,
    selectedModules,
    productMode,
    fashionCounts,
    aspect,
    whiteView,
    whiteBackgrounds,
  ],
  () => {
    fashionPlans.value = []
    plannedFingerprint.value = ''
    outputs.value = tool.value.modules
      .filter((module) => selectedModules.value.includes(module.id))
      .flatMap((module) =>
        Array.from({ length: fashionCounts[module.id] || 1 }, () => ({
          id: module.variants?.length ? whiteView.value : module.id,
          label: module.name,
        }))
      )
  },
  { deep: true }
)
watch(modeConfig, () => {
  selectedModules.value = [...tool.value.defaults]
  for (const key of Object.keys(fashionCounts)) delete fashionCounts[key]
  for (const module of tool.value.modules) {
    fashionCounts[module.id] = 1
    if (module.variants?.length) whiteView.value = module.variants[0].value
    if (module.backgroundToggle) whiteBackgrounds[module.id] = !!module.defaultWhiteBackground
  }
})
watch(productMode, () => {
  references.garment = []
  uploadVersion.value++
})
watch(
  [() => tool.value.code, () => userInfo.value?.id],
  () => {
    for (const key of Object.keys(references)) delete references[key]
    for (const key of Object.keys(uploads)) delete uploads[key]
    title.value = ''
    sellingPoints.value = ''
    requirements.value = ''
    submitError.value = ''
    selectedModules.value = [...tool.value.defaults]
    for (const module of tool.value.modules) fashionCounts[module.id] = 1
    pendingItems.value = undefined
    uploadVersion.value++
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(pendingKey.value) || 'null')
      if (
        Array.isArray(saved) &&
        saved.length &&
        saved.every(
          (item) =>
            item &&
            item.creationTool === tool.value.code &&
            typeof item.idempotencyKey === 'string' &&
            typeof item.prompt === 'string' &&
            typeof item.modelId === 'number' &&
            Array.isArray(item.image)
        )
      ) {
        pendingItems.value = saved as CollectionItem[]
        submitError.value = '上一次提交尚未确认。请核对原请求，系统将复用原任务，不另建相同任务。'
      }
    } catch {
      submitError.value = '无法读取上次请求记录，请先在作品中核对是否已提交。'
    }
    if (typeof route.query.prompt === 'string')
      requirements.value = route.query.prompt.slice(0, 1000)
    applyDevReferenceMock()
  },
  { immediate: true }
)
function applyDevReferenceMock() {
  if (!import.meta.env.DEV) return
  for (const group of uploadGroups.value) {
    if (group.min > 0) references[group.key] = [MOCK_REFERENCE_URL]
  }
}
watch(uploadGroups, applyDevReferenceMock, { immediate: true })
async function loadModels() {
  modelsLoading.value = true
  modelsError.value = ''
  try {
    models.value = await loadStudioModels('image')
    modelId.value = models.value.find((model) => !model.disabled)?.id
  } catch (e) {
    modelsError.value = e instanceof Error ? e.message : '模型加载失败'
  } finally {
    modelsLoading.value = false
  }
}
async function handleAiWrite() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (locked.value || !images.value.length || Object.values(uploads).some(Boolean)) return
  const owner = userInfo.value?.id
  const urls = images.value.slice(0, 3)
  const originalText = requirements.value
  aiWriting.value = true
  try {
    const text = await aiWriteSellingPoints(urls, 'fashion-set')
    if (
      disposed ||
      owner !== userInfo.value?.id ||
      JSON.stringify(urls) !== JSON.stringify(images.value.slice(0, 3)) ||
      originalText !== requirements.value
    )
      return
    if (!text?.trim()) throw new Error('AI 未返回卖点文案，请重试')
    requirements.value = text
    addToast('AI 帮写完成', 'success')
  } catch (e) {
    if (!disposed && owner === userInfo.value?.id)
      addToast(e instanceof Error ? e.message : 'AI 帮写失败', 'error')
  } finally {
    aiWriting.value = false
  }
}
function fashionPlanRequests() {
  return productReferences.value.map((product) => ({
    garmentUrls: [...(product.garment || [])],
    modelUrl: product.person?.[0] || '',
    requirements: requirements.value,
    aspectRatio: aspect.value,
    output_format: isGptImageFlare.value ? outputFormat.value : undefined,
    modules: tool.value.modules
      .filter((module) => selectedModules.value.includes(module.id))
      .map((module) => (module.variants?.length ? whiteView.value : module.id)),
    counts: { ...fashionCounts },
    language: language.value,
    whiteBackgrounds: { ...whiteBackgrounds },
  }))
}
async function prepareFashionPlans(): Promise<boolean> {
  if (locked.value || !canSubmit.value) return false
  const requests = fashionPlanRequests()
  const fingerprint = JSON.stringify(requests)
  const owner = userInfo.value?.id
  if (plannedFingerprint.value !== fingerprint) {
    fashionPlans.value = []
    plannedFingerprint.value = fingerprint
  }
  planning.value = true
  submitError.value = ''
  try {
    // 逐款分析；失败重试时保留本次已经完成的规划，尚不提交任何图片任务。
    for (let index = fashionPlans.value.length; index < requests.length; index++) {
      const request = requests[index]
      const plan = isFashionWear.value
        ? await planFashionPhotoshoot(request)
        : await planFashionBasic(request)
      if (
        disposed ||
        owner !== userInfo.value?.id ||
        fingerprint !== JSON.stringify(fashionPlanRequests())
      )
        return false
      if (
        !plan.visualPlan?.trim() ||
        !Array.isArray(plan.outputs) ||
        plan.outputs.length !== outputs.value.length ||
        plan.outputs.some(
          (output, i) =>
            output.id !== outputs.value[i].id ||
            !output.label ||
            !output.prompt?.trim() ||
            output.prompt.length > 10000
        )
      ) {
        throw new Error('服装组图方案不完整，尚未提交图片生成，请重试')
      }
      fashionPlans.value.push(plan)
    }
    return true
  } catch (e) {
    if (!disposed && owner === userInfo.value?.id)
      submitError.value = e instanceof Error ? e.message : '服装组图规划失败，尚未提交图片生成'
    return false
  } finally {
    planning.value = false
  }
}
function adjustCount(id: string, max: number, delta: number) {
  fashionCounts[id] = Math.max(1, Math.min(max, (fashionCounts[id] || 1) + delta))
}
async function generate() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (submitting.value || planning.value || (!pendingItems.value && !canSubmit.value)) return
  const storageKey = pendingKey.value
  const owner = userInfo.value?.id
  const code = tool.value.code
  if (!pendingItems.value && !(await prepareFashionPlans())) return
  if (
    disposed ||
    owner !== userInfo.value?.id ||
    code !== tool.value.code ||
    (!pendingItems.value && !canSubmit.value)
  )
    return
  if (!pendingItems.value) {
    const model = currentModel.value!
    pendingItems.value = productReferences.value.flatMap((product, productIndex) => {
      const batchId = crypto.randomUUID()
      const productImages = tool.value.groups.flatMap((group) => product[group.key] || [])
      const productOutputs = fashionPlans.value[productIndex].outputs
      return productOutputs.map((output, index) => ({
        creationBatchId: batchId,
        creationTitle:
          title.value.trim() ||
          (isFashion.value
            ? `${tool.value.name}${
                productMode.value === 'batch' ? ` · 商品 ${productIndex + 1}` : ''
              }`
            : ''),
        creationIndex: index,
        idempotencyKey: `creation:${crypto.randomUUID()}`,
        creationTool: code,
        creationLabel: output.label,
        language: language.value,
        modelId: model.id,
        model: model.model,
        requirements: requirements.value,
        prompt: output.prompt.trim(),
        aspectRatio: aspect.value,
        output_format: isGptImageFlare.value ? outputFormat.value : undefined,
        resolution: resolution.value,
        image: productImages,
      }))
    })
  }
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(pendingItems.value))
  } catch {
    pendingItems.value = undefined
    submitError.value = '浏览器无法保存请求记录，请允许当前站点使用会话存储后重试。'
    return
  }
  const items = pendingItems.value
  submitting.value = true
  submitError.value = ''
  try {
    if (isFashion.value) {
      for (let offset = 0; offset < items.length; offset += 6) {
        if (disposed || owner !== userInfo.value?.id || code !== tool.value.code) return
        await submitCollection(items.slice(offset, offset + 6))
      }
    } else await submitCollection(items)
    sessionStorage.removeItem(storageKey)
    if (code === tool.value.code && owner === userInfo.value?.id) {
      pendingItems.value = undefined
      revision.value++
    }
    addToast('图片已提交，生成结果会自动更新', 'success')
  } catch (e) {
    if (code !== tool.value.code || owner !== userInfo.value?.id) return
    if (!isFashion.value && e instanceof ApiError && e.code >= 400 && e.code < 500) {
      sessionStorage.removeItem(storageKey)
      pendingItems.value = undefined
    }
    submitError.value = e instanceof Error ? e.message : '提交未确认，请核对原请求'
    if (pendingItems.value) submitError.value += '。请使用“核对并继续原请求”，不要重复新建。'
  } finally {
    submitting.value = false
  }
}
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn && (!models.value.length || modelsError.value)) void loadModels()
})
async function loadFashionConfig() {
  configError.value = ''
  try {
    fashionConfig.value = await loadFashionWorkbenchConfig()
  } catch (e) {
    configError.value = e instanceof Error ? e.message : '服装配置加载失败'
  }
}
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn && !fashionConfig.value) void loadFashionConfig()
})
onMounted(() => {
  void loadModels()
  void loadFashionConfig()
})
onBeforeUnmount(() => {
  disposed = true
})
</script>
<style scoped lang="scss" src="./index.scss"></style>
