<template>
  <div class="creation-workbench">
    <aside class="creation-form">
      <div class="creation-form__body scroll-area">
        <Alert v-if="submitError" type="warning" show-icon :message="submitError" />
        <fieldset :disabled="locked" :inert="locked ? '' : undefined">
          <section v-if="isFashion" class="creation-section">
            <h3>{{ tool.name }}</h3>
            <Radio.Group
              v-if="tool.code === 'fashion-set'"
              v-model:value="fashionMode"
              option-type="button"
              button-style="solid"
              :options="[
                { label: '服装穿戴', value: 'wear' },
                { label: '基础套图', value: 'basic' },
              ]"
            />
          </section>
          <section
            v-for="group in uploadGroups"
            :key="`${tool.code}-${group.key}`"
            class="creation-section"
          >
            <h3>
              {{ group.label
              }}<small>{{ group.min ? '必填' : '可选' }} · 最多 {{ group.max }} 张</small>
            </h3>
            <p>{{ group.hint }}</p>
            <Radio.Group
              v-if="isFashion && group.key === 'garment'"
              v-model:value="productMode"
              class="fashion-product-mode"
              option-type="button"
              button-style="solid"
              :options="[
                { label: '单个商品', value: 'single' },
                { label: '批量上传', value: 'batch' },
              ]"
            />
            <p v-if="isFashion && productMode === 'batch'">
              一次最多上传 50 张，每张原图作为独立商品或一套搭配；模特和生成设置整批共用。
            </p>
            <ImageUpload
              :key="`${tool.code}-${group.key}-${uploadVersion}-${productMode}`"
              :existing-urls="references[group.key] || []"
              :max-count="isFashion && productMode === 'batch' ? 50 : group.max"
              :file-size="10"
              :empty-desc="'JPG / PNG / WebP · 单张小于 10MB'"
              preview
              drag
              @upload-complete="references[group.key] = $event"
              @uploading-change="uploads[group.key] = $event"
            />
          </section>
          <section v-if="isFashion" class="creation-section">
            <p v-if="isFashionWear">
              每套生成 3 张穿搭图：锁定人物与整套搭配，变化姿势、景别和场景。
            </p>
            <h3>图片比例</h3>
            <Select v-model:value="aspect" :options="ratioOptions" class="fashion-ratio" />
          </section>
          <section v-if="!isFashion" class="creation-section">
            <h3>商品信息<small>建议填写真实卖点</small></h3>
            <label
              >商品 / 品牌名称<Input
                v-model:value="title"
                :maxlength="100"
                placeholder="如：轻量通勤双肩包"
            /></label>
            <div class="creation-copy-heading">
              <label for="creation-selling-points">商品卖点 / 展示文案</label>
              <AiWriteButton
                v-if="tool.code === 'detail-page'"
                :loading="aiWriting"
                :disabled="locked || !images.length || Object.values(uploads).some(Boolean)"
                @click="handleAiWrite"
              />
            </div>
            <Input.TextArea
              id="creation-selling-points"
              v-model:value="sellingPoints"
              :rows="3"
              :maxlength="1000"
              placeholder="只填写商品真实信息，例如材质、使用场景和希望出现的文案"
            />
          </section>
          <section v-if="!isFashionWear" class="creation-section">
            <h3>
              {{ tool.code === 'detail-page' ? '快捷优化项' : isFashion ? '生成类型' : '输出内容'
              }}<small>已选 {{ outputs.length }} 张</small>
            </h3>
            <p v-if="tool.code === 'detail-page'">
              可多选，每项生成一张独立图片。尺寸、参数、成分和售后政策请在商品信息中填写，未提供的内容不会编造。
            </p>
            <div
              :class="[
                'module-options',
                { 'module-options--fashion-basic': isFashion && fashionMode === 'basic' },
              ]"
            >
              <label
                v-for="module in tool.modules"
                :key="module.id"
                :class="{ selected: selectedModules.includes(module.id) }"
                ><input v-model="selectedModules" type="checkbox" :value="module.id" /><span
                  class="module-options__copy"
                >
                  <span>{{ module.name }}</span>
                  <small v-if="module.description">{{ module.description }}</small> </span
                ><InputNumber
                  v-if="
                    isFashion &&
                    fashionMode === 'basic' &&
                    ['detail', 'selling-point'].includes(module.id) &&
                    selectedModules.includes(module.id)
                  "
                  v-model:value="fashionCounts[module.id === 'detail' ? 'detail' : 'selling']"
                  :min="1"
                  :max="3"
                  aria-label="生成张数"
                  @click.stop.prevent />
                <CheckOutlined v-if="selectedModules.includes(module.id)"
              /></label>
            </div>
          </section>
          <section v-if="!isFashionWear" class="creation-section">
            <h3>{{ isFashion ? '补充要求' : '创作方向' }}</h3>
            <div v-if="!isFashion" class="creation-fields">
              <label
                >{{ tool.code === 'detail-page' ? '上架平台 / 用途' : '用途'
                }}<Select
                  v-model:value="platform"
                  :options="platformOptions"
                  :disabled="locked" /></label
              ><label
                >文案语言<Select
                  v-model:value="language"
                  :options="languageOptions"
                  :disabled="locked"
              /></label>
            </div>
            <label
              >补充要求<Input.TextArea
                v-model:value="requirements"
                :rows="3"
                :maxlength="1000"
                placeholder="选填，例如：风格方向、商品卖点、使用场景、展示细节等"
            /></label>
          </section>
          <section class="creation-section">
            <h3>{{ isFashionWear ? '穿戴生成设置' : '生成设置' }}</h3>
            <label
              >{{ isFashionWear ? '穿戴生图模型' : '图片模型'
              }}<Select
                v-model:value="modelId"
                :options="modelOptions"
                :loading="modelsLoading"
                :disabled="locked"
                placeholder="请选择模型"
            /></label>
            <p v-if="modelsError" class="creation-error">
              {{ modelsError }} <button type="button" @click="loadModels">重试</button>
            </p>
            <div class="creation-fields">
              <label v-if="!isFashion && ratioOptions.length"
                >比例<Select
                  v-model:value="aspect"
                  :options="ratioOptions"
                  :disabled="locked" /></label
              ><label v-if="resolutionOptions.length"
                >清晰度<Select
                  v-model:value="resolution"
                  :options="resolutionOptions"
                  :disabled="locked"
              /></label>
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
          :loading="submitting || planning"
          :disabled="planning || (!pendingItems && !canSubmit)"
          @click="generate"
          ><ThunderboltOutlined />{{
            planning
              ? '正在分析商品与整理方案'
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
      <DetailPageHistory :revision="revision" hide-heading />
    </main>
  </div>
</template>

<script setup lang="ts">
import AiWriteButton from '@/components/AiWriteButton.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Alert, Button, Input, InputNumber, Radio, Select } from 'ant-design-vue'
import { CheckOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { loadStudioModels, type CommonAiModelItem } from '@/pages/detail-page/api'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/types/api'
import { aiWriteSellingPoints } from '@/pages/detail-page/api'
import { buildImagePrompts, imageTool } from '@/lib/creation/catalog'
import {
  planDetailPage,
  submitCollection,
  type CollectionItem,
  type DetailPagePlanRequest,
} from '@/pages/detail-page/api'
import DetailPageHistory from './components/DetailPageHistory.vue'
import type { FashionMode } from '@/pages/detail-page/api'

// ponytail: dev 预填商品图，上线前删或改 env 门控
const MOCK_REFERENCE_URL =
  'https://img.alicdn.com/imgextra/i2/4244469338/O1CN0109CWwaB4dcJ2vHAO_!!4611686018427385434-0-item_pic.jpg_.webp'

const route = useRoute()
const fashionMode = ref<FashionMode>('wear')
const productMode = ref<'single' | 'batch'>('single')
const fashionCounts = reactive({ detail: 1, selling: 1 })
const modelBuilding = ref(false)
const tool = computed(() => imageTool('detail-page'))
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
const language = ref('中文')
const platformOptions = ['电商商品展示', 'Amazon A+', '独立站', '社交媒体'].map((value) => ({
  label: value,
  value,
}))
const languageOptions = ['中文', '英语', '日语'].map((value) => ({ label: value, value }))
const references = reactive<Record<string, string[]>>({})
const uploads = reactive<Record<string, boolean>>({})
const selectedModules = ref<string[]>([])
const outputs = ref<{ label: string; prompt: string }[]>([])
const models = ref<CommonAiModelItem[]>([])
const modelsLoading = ref(false)
const modelsError = ref('')
const modelId = ref<number>()
const aspect = ref('')
const resolution = ref('')
const submitting = ref(false)
const planning = ref(false)
const aiWriting = ref(false)
const visualPlan = ref('')
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
const productReferences = computed(() => [references])
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
    outputs.value.every((output) => !!output.prompt.trim()) &&
    tool.value.groups.every((group) => (references[group.key] || []).length >= group.min)
)
const pendingKey = computed(
  () => `creation-pending:${userInfo.value?.id || 'anonymous'}:${tool.value.code}`
)
watch(modelId, () => {
  const model = currentModel.value
  if (!model?.ratio?.includes(aspect.value)) aspect.value = model?.ratio?.[0] || ''
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
  ],
  () => {
    visualPlan.value = ''
    plannedFingerprint.value = ''
    const prompts = buildImagePrompts(tool.value, {
      title: title.value,
      sellingPoints: sellingPoints.value,
      requirements: requirements.value,
      platform: platform.value,
      language: language.value,
      references: promptReferences.value,
      selectedModules: selectedModules.value,
    })
    outputs.value = prompts
  },
  { deep: true }
)
watch(fashionMode, () => {
  selectedModules.value = [...tool.value.defaults]
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
    fashionCounts.detail = 1
    fashionCounts.selling = 1
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
  if (
    locked.value ||
    tool.value.code !== 'detail-page' ||
    !images.value.length ||
    Object.values(uploads).some(Boolean)
  )
    return
  const owner = userInfo.value?.id
  const urls = images.value.slice(0, 3)
  const originalText = sellingPoints.value
  aiWriting.value = true
  try {
    const text = await aiWriteSellingPoints(urls)
    if (
      disposed ||
      owner !== userInfo.value?.id ||
      tool.value.code !== 'detail-page' ||
      JSON.stringify(urls) !== JSON.stringify(images.value.slice(0, 3)) ||
      originalText !== sellingPoints.value
    )
      return
    if (!text?.trim()) throw new Error('AI 未返回卖点文案，请重试')
    sellingPoints.value = text
    addToast('AI 帮写完成，请核对商品信息', 'success')
  } catch (e) {
    if (!disposed && owner === userInfo.value?.id && tool.value.code === 'detail-page')
      addToast(e instanceof Error ? e.message : 'AI 帮写失败', 'error')
  } finally {
    aiWriting.value = false
  }
}
function detailPlanRequest(): DetailPagePlanRequest {
  return {
    imageUrls: [...images.value],
    title: title.value,
    sellingPoints: sellingPoints.value,
    requirements: requirements.value,
    platform: platform.value,
    language: language.value,
    modules: tool.value.modules
      .filter((module) => selectedModules.value.includes(module.id))
      .map((module) => module.id),
  }
}
async function prepareDetailPlan(): Promise<boolean> {
  if (!isLoggedIn.value) {
    openLogin()
    return false
  }
  if (locked.value || !canSubmit.value || tool.value.code !== 'detail-page') return false
  const request = detailPlanRequest()
  const fingerprint = JSON.stringify(request)
  const owner = userInfo.value?.id
  planning.value = true
  submitError.value = ''
  try {
    const plan = await planDetailPage(request)
    // 离开页面、切换账号或修改输入后，不使用旧方案继续提交生图。
    if (
      disposed ||
      owner !== userInfo.value?.id ||
      tool.value.code !== 'detail-page' ||
      fingerprint !== JSON.stringify(detailPlanRequest())
    )
      return false
    if (
      !plan.visualPlan?.trim() ||
      !Array.isArray(plan.outputs) ||
      plan.outputs.length !== request.modules.length ||
      plan.outputs.some(
        (output, index) =>
          output.id !== request.modules[index] ||
          !output.label ||
          !output.prompt?.trim() ||
          output.prompt.length > 10000
      )
    ) {
      throw new Error('详情页规划返回不完整，尚未提交图片生成，请重试整理方案')
    }
    outputs.value = plan.outputs.map((output) => ({ label: output.label, prompt: output.prompt }))
    visualPlan.value = plan.visualPlan
    plannedFingerprint.value = fingerprint
    return true
  } catch (e) {
    if (!disposed && owner === userInfo.value?.id && tool.value.code === 'detail-page')
      submitError.value = e instanceof Error ? e.message : '方案整理失败，尚未提交图片生成'
    return false
  } finally {
    planning.value = false
  }
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
  if (
    !pendingItems.value &&
    code === 'detail-page' &&
    plannedFingerprint.value !== JSON.stringify(detailPlanRequest())
  ) {
    if (!(await prepareDetailPlan())) return
  }
  if (disposed || owner !== userInfo.value?.id || code !== tool.value.code) return
  if (!pendingItems.value) {
    const model = currentModel.value!
    pendingItems.value = productReferences.value.flatMap((product, productIndex) => {
      const batchId = crypto.randomUUID()
      const productImages = tool.value.groups.flatMap((group) => product[group.key] || [])
      const productOutputs = outputs.value
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
        targetPlatform: platform.value,
        language: language.value,
        modelId: model.id,
        model: model.model,
        sellingPoints: sellingPoints.value,
        requirements: requirements.value,
        prompt: output.prompt.trim(),
        aspectRatio: aspect.value,
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
onMounted(loadModels)
onBeforeUnmount(() => {
  disposed = true
})
</script>
<style scoped lang="scss" src="./index.scss"></style>
