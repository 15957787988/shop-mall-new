<template>
  <div class="saleor-sidebar">
    <div class="saleor-sidebar__scroll scroll-area">
      <section class="saleor-sidebar__section">
        <h3 class="saleor-sidebar__section-title">
          商品原图
          <span class="saleor-sidebar__upload-note">支持 1-3 张图片，多角度效果更佳</span>
          <Popover placement="bottomLeft" :overlay-inner-style="{ padding: 0 }">
            <template #content>
              <img
                class="saleor-sidebar__upload-guide-img"
                :src="uploadGuideImg"
                alt="上传图片引导"
              />
            </template>
            <QuestionCircleOutlined class="saleor-sidebar__hint-icon" role="button" tabindex="0" />
          </Popover>
        </h3>
        <ImageUpload
          require-login
          :max-count="3"
          :file-size="10"
          :existing-urls="form.productImages"
          @upload-complete="form.productImages = $event"
        />
      </section>

      <section class="saleor-sidebar__section">
        <div class="saleor-sidebar__settings">
          <label class="saleor-sidebar__field">
            <span>上架平台</span>
            <Select v-model:value="form.platform" :options="platformOptions" />
          </label>
          <label class="saleor-sidebar__field">
            <span>站点</span>
            <Select v-model:value="form.country" :options="countryOptions" />
          </label>
          <label class="saleor-sidebar__field">
            <span>语言</span>
            <Select v-model:value="form.language" :options="languageOptions" />
          </label>
          <label class="saleor-sidebar__field">
            <span>模型</span>
            <Select
              v-model:value="form.modelId"
              :options="modelSelectOptions"
              :loading="modelsLoading"
              placeholder="加载模型…"
            />
          </label>
          <label class="saleor-sidebar__field">
            <span>图片比例</span>
            <Select v-model:value="form.aspectRatio" :options="ratioSelectOptions" />
          </label>
          <label v-if="resolutionSelectOptions.length" class="saleor-sidebar__field">
            <span>分辨率</span>
            <Select v-model:value="form.resolution" :options="resolutionSelectOptions" />
          </label>
          <label v-if="isGptImageFlare" class="saleor-sidebar__field">
            <span>输出格式</span>
            <Select v-model:value="form.outputFormat" :options="outputFormatOptions" />
          </label>
        </div>
      </section>

      <section class="saleor-sidebar__section">
        <div class="saleor-sidebar__section-head">
          <h3 class="saleor-sidebar__section-title">商品卖点 & 要求</h3>
          <AiWriteButton
            :loading="aiWriting"
            :disabled="form.productImages.length === 0"
            @click="handleAiWrite"
          />
        </div>
        <Input.TextArea
          v-model:value="form.sellingPoints"
          :rows="3"
          placeholder="如产品名称、核心卖点、适用人群等信息"
        />
      </section>

      <section class="saleor-sidebar__section">
        <h3 class="saleor-sidebar__section-title">套图结构配置</h3>
        <Radio.Group v-model:value="form.structureMode" class="saleor-sidebar__mode">
          <Radio value="custom">
            <strong>自定义配置</strong>
            <span class="saleor-sidebar__mode-desc">可自由调整各类型图片数量，至少选择 1 张</span>
          </Radio>
        </Radio.Group>

        <div v-if="form.structureMode === 'custom'" class="saleor-sidebar__structure-list">
          <div
            v-for="item in form.structureConfig"
            :key="item.key"
            class="saleor-sidebar__structure-item"
          >
            <div class="saleor-sidebar__structure-info">
              <span class="saleor-sidebar__structure-label">{{ item.label }}</span>
              <span class="saleor-sidebar__structure-desc">{{ item.desc }}</span>
            </div>
            <div class="saleor-sidebar__counter">
              <Button
                size="small"
                :disabled="item.count <= (item.min ?? 0) || totalImageCount <= MIN_TOTAL_IMAGES"
                @click="changeCount(item.key, -1)"
              >
                <MinusOutlined />
              </Button>
              <span>{{ item.count }}</span>
              <Button
                size="small"
                :disabled="totalImageCount >= MAX_TOTAL_IMAGES"
                @click="changeCount(item.key, 1)"
              >
                <PlusOutlined />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="saleor-sidebar__footer">
      <Button
        type="primary"
        block
        size="large"
        class="saleor-sidebar__generate"
        :disabled="!canGenerate"
        :loading="generating"
        @click="handleGenerate"
      >
        <span class="saleor-sidebar__generate-label">
          <span>生成商品套图</span>
          <span class="saleor-sidebar__generate-points">（{{ estimatedPointsText }}）</span>
        </span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import AiWriteButton from '@/components/AiWriteButton.vue'
import { reactive, computed, ref, watch, onMounted } from 'vue'
import { Input, Select, Button, Radio, Popover } from 'ant-design-vue'
import { PlusOutlined, MinusOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import uploadGuideImg from '@/assets/image/aiProductImage-tips.png'
import { aiWriteSellingPoints } from '@/service/api/shop-image-group'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import {
  countryOptions,
  languageOptions,
  FALLBACK_RATIO_OPTIONS,
  platformOptions,
  defaultStructureConfig,
  MIN_TOTAL_IMAGES,
  MAX_TOTAL_IMAGES,
} from '../utils/constants'
import { estimateModelPoints } from '@/lib/modelPricing'
import { useProductImageModels } from '../../../composables/useProductImageModels'
import type { SaleorFormData } from '../utils/types'

const {
  models,
  getModelById,
  loading: modelsLoading,
  loadProductImageModels,
  ratioOptionsFor,
  resolutionOptionsFor,
  switchModel,
  defaultModelId,
} = useProductImageModels()

const modelSelectOptions = computed(() =>
  models.value.map((model) => ({
    label: model.name,
    value: model.modelId,
  }))
)

const emit = defineEmits<{
  generate: [form: SaleorFormData, done: () => void]
}>()

const generating = defineModel<boolean>('generating', { default: false })

const { isLoggedIn, openLogin } = useAuth()
const { addToast } = useToast()

const aiWriting = ref(false)

const form = reactive<SaleorFormData>({
  productImages: [
    // ponytail: dev 预填商品图暂关
    //'https://static.pixpix.media/molili-agent/2026/06/06/2063154693705699328/_1780729385198_bmssm6nS.webp?x-oss-process=image/resize,m_lfit,w_640/quality,q_85/format,webp',
    //'https://xiuxiu-pro-new.meitudata.com/bizshoot/6a4a681586879ll2lywdlc6589.png?imageView2/2/w/400/format/webp/q/80/ignore-error/1',
    //'https://static.pixpix.media/molili-agent/2026/06/06/2063152208400224256/_1780728792654_0ghjjB4x.webp?x-oss-process=image/resize,m_lfit,w_640/quality,q_85/format,webp',
    //'https://muxunai.oss-cn-hangzhou.aliyuncs.com/20260802/1785656437489.webp',
    //'https://try-c0lothes.cn/shop-mall-img/uploads/178511964646_5b5f921b47174cb78765bf54a58442ce.jpg',
    //'https://xiuxiu-pro-new.meitudata.com/bizshoot/6a8da053abb93inj4a7k8l5836.png',
    //'https://xiuxiu-pro-new.meitudata.com/bizshoot/6a8db806b80191grv578318250.png',
    //'https://img.alicdn.com/imgextra/i2/2220869854318/O1CN01913XAlEYF2E1WPjS_!!4611686018427380846-0-item_pic.jpg_.webp',
    //'https://img.alicdn.com/imgextra/i3/2206896265887/O1CN01TlN9s3wcuLD1chua_!!2206896265887.jpg_.webp',
  ],
  platform: '阿里巴巴',
  country: '中国',
  language: '中文',
  aspectRatio: '1:1',
  resolution: '',
  outputFormat: undefined,
  sellingPoints: '',
  structureMode: 'custom',
  structureConfig: defaultStructureConfig(),
  modelId: 0,
})

const ratioSelectOptions = computed(() => {
  const opts = ratioOptionsFor(form.modelId)
  return opts.length ? opts : FALLBACK_RATIO_OPTIONS
})

const resolutionSelectOptions = computed(() => resolutionOptionsFor(form.modelId))
const isGptImageFlare = computed(() => getModelById(form.modelId)?.model === 'gpt-image-2.6-flare')
const outputFormatOptions = ['png', 'jpeg', 'webp', 'svg', 'gif'].map(value => ({
  label: ['svg', 'gif'].includes(value) ? `${value}（仅文生图）` : value,
  value,
  disabled: ['svg', 'gif'].includes(value),
}))
watch(isGptImageFlare, enabled => { form.outputFormat = enabled ? 'png' : undefined }, { immediate: true })

function applyModel(id: number, prevId = 0) {
  const next = switchModel(prevId, id, form)
  if (next.modelId !== form.modelId) {
    form.modelId = next.modelId
  }
  form.aspectRatio = next.aspectRatio
  form.resolution = next.resolution
}

watch(
  () => form.modelId,
  (id, prev) => applyModel(id, prev ?? 0)
)

async function ensureModels() {
  await loadProductImageModels()
  const options = modelSelectOptions.value
  if (!options.length) return
  if (!options.some((item) => item.value === form.modelId)) {
    form.modelId = defaultModelId()
  }
}

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) void ensureModels()
})

onMounted(() => {
  void ensureModels()
})

const totalImageCount = computed(() =>
  form.structureConfig.reduce((sum, item) => sum + item.count, 0)
)

const estimatedPoints = computed(() =>
  estimateModelPoints(getModelById(form.modelId), {
    resolution: form.resolution,
    outputFormat: form.outputFormat,
    ratio: form.aspectRatio,
    imageCount: form.productImages.length,
    count: totalImageCount.value,
  })
)
const estimatedPointsText = computed(() =>
  estimatedPoints.value == null ? '价格未配置' : `${estimatedPoints.value.toFixed(3)} 积分`
)

const canGenerate = computed(
  () =>
    form.productImages.length > 0 &&
    form.sellingPoints.trim().length > 0 &&
    totalImageCount.value >= MIN_TOTAL_IMAGES &&
    totalImageCount.value <= MAX_TOTAL_IMAGES
)

function changeCount(key: string, delta: number) {
  const item = form.structureConfig.find((i) => i.key === key)
  if (!item) {
    return
  }
  const next = item.count + delta
  if (delta > 0 && totalImageCount.value >= MAX_TOTAL_IMAGES) {
    return
  }
  if (delta < 0 && totalImageCount.value <= MIN_TOTAL_IMAGES) {
    return
  }
  if (next >= (item.min ?? 0)) {
    item.count = next
  }
}

async function handleAiWrite() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (!form.productImages.length || aiWriting.value) {
    return
  }

  aiWriting.value = true
  try {
    form.sellingPoints = await aiWriteSellingPoints(form.productImages, 'product-set')
    addToast('AI 帮写完成', 'success')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI 帮写失败'
    addToast(msg, 'error')
  } finally {
    aiWriting.value = false
  }
}

function handleGenerate() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (!canGenerate.value || generating.value) {
    return
  }

  generating.value = true
  emit('generate', { ...form, structureConfig: [...form.structureConfig] }, () => {
    generating.value = false
  })
}
</script>

<style scoped lang="scss">
.saleor-sidebar {
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: var(--color-surface-0);

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    padding: 8px 16px 24px;
  }

  &__section {
    padding: 12px 0;

    & + & {
      margin-top: 8px;
    }
  }

  &__section-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;

    .saleor-sidebar__section-title {
      margin-bottom: 0;
    }
  }

  &__settings {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 12px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
    color: var(--color-ink-primary);

    :deep(.ant-select) {
      width: 100%;
    }
  }

  &__mode {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__structure-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
  }

  &__structure-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-radius: 8px;
    background: var(--color-surface-0);
    border: 1px solid var(--color-border-whisper);
    box-shadow: var(--shadow-soft);
    padding: 14px 12px;
  }

  &__structure-info {
    min-width: 0;
    flex: 1;
  }

  &__structure-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
  }

  &__structure-desc {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.3;
    color: var(--color-ink-muted);
  }

  &__counter {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    span {
      min-width: 20px;
      text-align: center;
      font-weight: 600;
    }
  }

  &__footer {
    padding: 12px 16px;
    background: var(--color-surface-0);
  }

  &__generate {
    height: 46px;
    padding-inline: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  &__generate-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 2px;
  }

  &__generate-points {
    font-size: inherit;
    font-weight: inherit;
  }

  &__upload-note {
    margin-left: 4px;
    font-size: 11px;
    font-weight: 400;
    color: var(--color-ink-muted);
  }

  &__mode-desc {
    display: block;
    margin: 4px 0 0 0px;
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  &__mode :deep(.ant-radio-wrapper) {
    margin: 0;
    padding: 12px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 8px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);
  }

  :deep(.ant-select-selector),
  :deep(textarea.ant-input) {
    border-radius: 8px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);
  }

  :deep(.image-upload__empty),
  :deep(.image-upload__add) {
    width: 100%;
    aspect-ratio: 1;
    padding: 12px;
    border: 1px solid var(--color-border-whisper);
    background: transparent;
  }

  :deep(.image-upload__empty) {
    width: calc((100% - 16px) / 3);
  }

  :deep(.image-upload__empty-desc) {
    display: none;
  }

  :deep(.image-upload__empty-icon) {
    background: transparent;
    box-shadow: none;
  }

  &__upload-guide-img {
    display: block;
    width: 300px;
    max-width: 100%;
  }
}
</style>
