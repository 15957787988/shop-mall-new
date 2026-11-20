<template>
  <section class="creation-section fashion-model">
    <h3 class="fashion-model__heading">模特形象<small>{{ batch ? '整批商品共用' : '整套共用同一模特' }}</small></h3>
    <div class="fashion-model__sources" role="group" aria-label="模特来源">
      <Button class="fashion-model__source" :class="{ 'is-active': source === 'ai' }" :aria-pressed="source === 'ai'" :disabled="disabled || busy || !!request" @click="source = 'ai'">
        <ThunderboltOutlined /><span>AI 生成</span>
      </Button>
      <Button class="fashion-model__source" :class="{ 'is-active': source === 'upload' }" :aria-pressed="source === 'upload'" :disabled="disabled || busy || !!request" @click="source = 'upload'">
        <UploadOutlined /><span>自行上传</span>
      </Button>
    </div>
    <template v-if="source === 'ai'">
      <div class="fashion-model__settings">
        <div class="fashion-model__fields">
          <Select v-for="field in fields" :key="field.key" v-model:value="attributes[field.key]" :aria-label="field.label" :options="field.options.map(value => ({ label: value, value }))" :disabled="disabled || busy || !!request" />
        </div>
        <Input.TextArea v-model:value="details" :rows="2" :maxlength="300" :disabled="disabled || busy || !!request" aria-label="模特形象补充细节" placeholder="补充细节（选填）：如发型、妆容偏好等" />
      </div>
      <div class="fashion-model__generation">
        <label>模特生图模型<Select v-model:value="modelId" :options="modelOptions" :loading="modelsLoading" :disabled="disabled || busy || !!request" placeholder="请选择模特生图模型" /></label>
        <label v-if="resolutionOptions.length">模特图分辨率<Select v-model:value="resolution" :options="resolutionOptions" :disabled="disabled || busy || !!request" /></label>
      </div>
      <Button block :loading="busy" :disabled="disabled || (!taskId && !request && (!model || model.disabled || points == null))" @click="generate">
        {{ taskId ? '继续查询模特形象' : request ? '核对模特生成请求' : urls.length ? '重新生成模特形象' : '生成模特形象' }}（{{ formatModelPoints(request ? requestPoints : points) }}）
      </Button>
      <p v-if="error" class="creation-error" role="alert">{{ error }}</p>
      <div v-if="urls.length" class="fashion-model__preview"><img :src="urls[0]" alt="基准模特图" /><span>基准模特图</span></div>
    </template>
    <template v-else>
      <p>上传模特照片，正面全身照效果最佳。</p>
      <ImageUpload require-login :max-count="1" :file-size="10" :existing-urls="urls" preview @upload-complete="emit('update:urls', $event)" @uploading-change="emit('busy', $event)" />
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Button, Input, Select } from 'ant-design-vue'
import { ThunderboltOutlined, UploadOutlined } from '@ant-design/icons-vue'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import { getStudioWork, submitStudioImage, type CommonAiModelItem } from '@/pages/fashion-set/api'
import { estimateModelPoints, formatModelPoints } from '@/lib/modelPricing'
import { useAuth } from '@/composables/useAuth'
const props = defineProps<{ urls: string[]; models?: CommonAiModelItem[]; modelsLoading?: boolean; disabled?: boolean; batch?: boolean }>()
const emit = defineEmits<{ 'update:urls': [urls: string[]]; busy: [busy: boolean] }>()
const { isLoggedIn, openLogin, userInfo } = useAuth()
const source = ref<'ai' | 'upload'>('ai')
const modelId = ref<number>()
const resolution = ref('')
const model = computed(() => props.models?.find(item => item.id === modelId.value))
const modelOptions = computed(() => (props.models || []).map(item => ({ value: item.id, label: item.name || item.model || String(item.id), disabled: !!item.disabled })))
const resolutionOptions = computed(() => (model.value?.resolution || []).map(value => ({ label: value, value })))
watch(() => props.models, (models) => {
  if (!models?.some(item => item.id === modelId.value && !item.disabled)) modelId.value = models?.find(item => !item.disabled)?.id
}, { immediate: true })
watch(model, (selected) => {
  if (!selected?.resolution?.includes(resolution.value)) resolution.value = selected?.resolution?.[0] || ''
}, { immediate: true })
const fields = [
  { key: 'gender', label: '性别', options: ['女性', '男性'] },
  { key: 'age', label: '年龄段', options: ['婴儿', '儿童', '青少年', '青年', '中年', '老年'] },
  { key: 'ethnicity', label: '人种', options: ['欧美白人', '中国人', '亚洲人', '非裔', '拉丁裔'] },
  { key: 'body', label: '体型', options: ['标准', '纤细', '肌肉'] },
]
const attributes = reactive<Record<string, string>>({ gender: '女性', age: '青年', ethnicity: '欧美白人', body: '标准' })
const details = ref('')
const busy = ref(false)
const error = ref('')
const taskId = ref<number>()
const request = ref<Parameters<typeof submitStudioImage>[0]>()
const requestPoints = ref<number | null>(null)
const ratio = computed(() => model.value?.ratio?.includes('3:4') ? '3:4' : model.value?.ratio?.[0] || '1:1')
const points = computed(() => estimateModelPoints(model.value, { resolution: resolution.value, ratio: ratio.value }))
let version = 0
let timer: ReturnType<typeof setTimeout> | undefined
function finish() { busy.value = false; emit('busy', false) }
async function poll(token: number) {
  if (!taskId.value || token !== version) return
  try {
    const work = await getStudioWork('image', taskId.value)
    if (token !== version) return
    if (!work) { error.value = '原任务不存在，请在作品中核对'; finish(); return }
    if (work.status === 20 && !work.picUrl) { error.value = '任务已完成但图片暂不可用，请继续查询'; finish(); return }
    if (work.status === 20 && work.picUrl) {
      emit('update:urls', [work.picUrl]); taskId.value = undefined; request.value = undefined; finish()
    } else if (work?.status === 30) {
      error.value = work.errorMessage || '模特形象生成失败，请重试'; taskId.value = undefined; request.value = undefined; finish()
    } else timer = setTimeout(() => void poll(token), 3000)
  } catch (e) {
    if (token !== version) return
    error.value = e instanceof Error ? e.message : '查询失败，请继续查询原任务'; finish()
  }
}
async function generate() {
  if (!isLoggedIn.value) { openLogin(); return }
  if (busy.value || (!request.value && !taskId.value && (!model.value || points.value == null))) return
  const token = ++version
  busy.value = true; emit('busy', true); error.value = ''
  try {
    if (!taskId.value) {
      if (!request.value) requestPoints.value = points.value
      request.value ||= { creationTool: 'model-image', idempotencyKey: crypto.randomUUID(), modelId: model.value!.id, model: model.value!.model, aspectRatio: ratio.value, resolution: resolution.value,
        prompt: `生成一张符合所选年龄段的真人服装展示模特正面全身基准照：${Object.values(attributes).join('，')}。${attributes.age === '婴儿' ? '婴儿使用有支撑的自然坐姿或躺姿，不使用成人站姿或行走姿势。' : '使用符合所选年龄与体态的自然站姿。'}体型特征仅在所选年龄的合理范围内体现。穿着符合年龄的简洁中性服装，面部清晰，双手与脚部完整，柔和摄影光线，干净背景。不要文字、水印或拼图。${details.value}` }
      const id = await submitStudioImage(request.value)
      if (token !== version) return
      taskId.value = id
    }
    await poll(token)
  } catch (e) {
    if (token !== version) return
    error.value = e instanceof Error ? e.message : '提交未确认，请核对原请求'; finish()
  }
}
watch(source, () => { emit('update:urls', []); error.value = '' })
watch(() => userInfo.value?.id, () => { version++; clearTimeout(timer); request.value = undefined; taskId.value = undefined; finish() })
onBeforeUnmount(() => { version++; clearTimeout(timer); emit('busy', false) })
</script>
<style scoped lang="scss">
.fashion-model {
  display: grid;
  gap: 16px;

  &__heading {
    justify-content: flex-start;
    gap: 10px;
    margin-bottom: 0;
    small { font-weight: 400; }
  }

  &__sources {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  &__source {
    display: flex;
    min-width: 0;
    height: 88px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    background: var(--color-surface-1);
    color: var(--color-ink-primary);
    font-size: 14px;

    :deep(.anticon) { font-size: 22px; }

    &.is-active {
      border-color: var(--color-ink-muted);
      background: var(--color-surface-2);
      box-shadow: inset 0 0 0 1px var(--color-border-whisper);
    }
  }

  &__settings {
    display: grid;
    gap: 12px;
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
  }

  &__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    :deep(.ant-select) { width: 100%; min-width: 0; }
  }

  &__generation {
    display: grid;
    gap: 12px;
    label { margin: 0; }
    :deep(.ant-select) { width: 100%; min-width: 0; }
  }

  &__preview {
    position: relative;
    img { display: block; width: 100%; max-height: 260px; object-fit: contain; border-radius: 8px; background: var(--color-surface-1); }
    span { display: block; margin-top: 6px; color: var(--color-ink-muted); font-size: 12px; }
  }
}
</style>
