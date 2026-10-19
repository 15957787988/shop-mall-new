<template>
  <Modal
    :open="open"
    title="重新生成"
    ok-text="开始生成"
    cancel-text="取消"
    :confirm-loading="loading"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <p class="regenerate-modal__desc">
      将复用该图片的原始提示词重新发起生成，可选择新的模型。
    </p>
    <label class="regenerate-modal__field">
      <span>生成模型</span>
      <Select
        v-model:value="selectedModelId"
        :options="modelSelectOptions"
        :loading="modelsLoading"
        placeholder="加载模型…"
      />
    </label>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Modal, Select } from 'ant-design-vue'
import { DEFAULT_SALEOR_MODEL_ID } from '@/constants/ai-model'
import { useProductImageModels } from '../hook/useProductImageModels'

const {
  modelSelectOptions,
  loading: modelsLoading,
  loadProductImageModels,
  defaultModelId: resolveDefaultModelId,
} = useProductImageModels()

const props = defineProps<{
  open: boolean
  defaultModelId?: number
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: [modelId: number]
  cancel: []
}>()

const selectedModelId = ref<number>(DEFAULT_SALEOR_MODEL_ID)

onMounted(() => {
  void loadProductImageModels()
})

watch(
  () => [props.open, props.defaultModelId] as const,
  async ([open, groupModelId]) => {
    if (!open) return
    await loadProductImageModels()
    selectedModelId.value = groupModelId ?? resolveDefaultModelId() ?? DEFAULT_SALEOR_MODEL_ID
  },
  { immediate: true },
)

function handleConfirm() {
  emit('confirm', selectedModelId.value)
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.regenerate-modal {
  &__desc {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-ink-secondary);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--color-ink-secondary);

    :deep(.ant-select) {
      width: 100%;
    }
  }
}
</style>
