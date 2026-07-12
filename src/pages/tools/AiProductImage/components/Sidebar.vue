<template>
  <div class="saleor-sidebar">
    <div class="saleor-sidebar__scroll scroll-area">
      <section class="saleor-sidebar__section">
        <h3 class="saleor-sidebar__section-title">
          商品原图
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
        <p class="saleor-sidebar__tip">同一产品最多 3 张 · 支持 JPG/PNG/WEBP · 单张不超过 10MB</p>
      </section>

      <section class="saleor-sidebar__section">
        <h3 class="saleor-sidebar__section-title">生成设置</h3>
        <div class="saleor-sidebar__settings">
          <label class="saleor-sidebar__field">
            <span>平台</span>
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
            <span>图片比例</span>
            <Select v-model:value="form.aspectRatio" :options="ratioSelectOptions" />
          </label>
        </div>
      </section>

      <section class="saleor-sidebar__section">
        <div class="saleor-sidebar__section-head">
          <h3 class="saleor-sidebar__section-title">商品卖点 & 要求</h3>
          <button
            type="button"
            class="saleor-sidebar__ai-write"
            :disabled="aiWriting || form.productImages.length === 0"
            @click="handleAiWrite"
          >
            <Spin v-if="aiWriting" size="small" />
            <BulbOutlined v-else />
            AI 帮写
          </button>
        </div>
        <Input.TextArea
          v-model:value="form.sellingPoints"
          :rows="5"
          placeholder="请输入商品名称、核心卖点、目标人群、期望场景、具体参数等..."
        />
      </section>

      <section class="saleor-sidebar__section">
        <h3 class="saleor-sidebar__section-title">套图结构配置</h3>
        <Radio.Group v-model:value="form.structureMode" class="saleor-sidebar__mode">
          <Radio value="custom">自定义配置（7-20 张）</Radio>
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
                shape="circle"
                :disabled="item.count <= (item.min ?? 0) || totalImageCount <= MIN_TOTAL_IMAGES"
                @click="changeCount(item.key, -1)"
              >
                <MinusOutlined />
              </Button>
              <span>{{ item.count }}</span>
              <Button
                size="small"
                shape="circle"
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
        一键生成套图（{{ totalImageCount }} 张 · {{ totalCostPoints }} 算力）
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { Input, Select, Button, Radio, Spin, Popover } from 'ant-design-vue'
import {
  PlusOutlined,
  MinusOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue'
import uploadGuideImg from '@/assets/image/aiProductImage-tips.png'
import { aiWriteSellingPoints } from '@/service/api/shop-image-group'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import {
  countryOptions,
  languageOptions,
  ratioOptions,
  platformOptions,
  defaultStructureConfig,
  MIN_TOTAL_IMAGES,
  MAX_TOTAL_IMAGES,
  POINTS_PER_IMAGE,
} from '../utils/constants'
import type { SaleorFormData } from '../utils/types'

const emit = defineEmits<{
  generate: [form: SaleorFormData, done: () => void]
}>()

const generating = defineModel<boolean>('generating', { default: false })

const { isLoggedIn, openLogin } = useAuth()
const { addToast } = useToast()

const aiWriting = ref(false)

const form = reactive<SaleorFormData>({
  productImages: ['https://xiuxiu-pro-new.meitudata.com/bizshoot/6a534a9271688xx5cqva889563.jpeg'],
  platform: '阿里巴巴',
  country: '中国',
  language: '中文',
  aspectRatio: '1024x1024',
  sellingPoints: '',
  structureMode: 'custom',
  structureConfig: defaultStructureConfig(),
})

const ratioSelectOptions = ratioOptions.map((opt) => ({
  label: opt.label,
  value: opt.value,
}))

const totalImageCount = computed(() =>
  form.structureConfig.reduce((sum, item) => sum + item.count, 0)
)

const totalCostPoints = computed(() => totalImageCount.value * POINTS_PER_IMAGE)

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
  // if (!isLoggedIn.value) {
  //   openLogin()
  //   return
  // }
  if (!form.productImages.length || aiWriting.value) {
    return
  }

  aiWriting.value = true
  try {
    form.sellingPoints = await aiWriteSellingPoints(form.productImages.slice(0, 3))
    addToast('AI 帮写完成', 'success')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI 帮写失败'
    addToast(msg, 'error')
  } finally {
    aiWriting.value = false
  }
}

function handleGenerate() {
  // if (!isLoggedIn.value) {
  //   openLogin()
  //   return
  // }
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
  background: #fff;
  box-shadow: var(--shadow-soft);

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__section {
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border-whisper);
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

  &__ai-write {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    font-size: 12px;
    color: var(--color-creative-violet);
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__tip {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  &__settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--color-ink-secondary);

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
    background: var(--color-surface-2);
    padding: 8px 10px;
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
    border-top: 1px solid var(--color-border-whisper);
  }

  &__generate {
    height: 42px;
    font-weight: 600;
  }

  &__upload-guide-img {
    display: block;
    width: 300px;
    max-width: 100%;
  }
}
</style>
