<template>
  <aside class="studio-preview__prompt prompt-details">
    <header class="prompt-details__header">
      <h3>提示词</h3>
      <button
        type="button"
        class="prompt-details__copy"
        title="复制提示词"
        aria-label="复制提示词"
        :disabled="!work.prompt"
        @click="copyPrompt"
      >
        <CopyOutlined aria-hidden="true" />
      </button>
    </header>
    <div class="studio-preview__text">{{ work.prompt || '无提示词' }}</div>
    <StudioReferences :work="work" :source-video-url="sourceVideoUrl" />
    <div class="prompt-details__params">
      <time v-if="createdAt" class="prompt-details__date">{{ createdAt }}</time>
      <StudioParams :work="work" />
    </div>
  </aside>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime } from '@/lib/formatTime'
import { CopyOutlined } from '@ant-design/icons-vue'
import type { StudioWork } from '@/service/api/studio'
import { useToast } from '@/composables/useToast'
import StudioReferences from './StudioReferences.vue'
import StudioParams from './StudioParams.vue'
interface Props {
  work: StudioWork
  sourceVideoUrl?: string
}
const props = defineProps<Props>()
const createdAt = computed(() => {
  const value = props.work.createTime
  if (Array.isArray(value)) {
    return formatDateTime(
      new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0)
    )
  }
  return formatDateTime(value)
})
const { addToast } = useToast()
async function copyPrompt() {
  if (!props.work.prompt) return
  try {
    await navigator.clipboard.writeText(props.work.prompt)
    addToast('已复制', 'success')
  } catch {
    addToast('复制失败', 'error')
  }
}
</script>
<style scoped lang="scss">
.prompt-details.studio-preview__prompt {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--color-surface-0);
  .prompt-details__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    padding: 12px 48px 8px 16px;
    h3 {
      margin: 0;
      padding: 0;
      font-size: 16px;
    }
  }
  .studio-preview__text {
    flex: 1;
    min-height: 80px;
    overflow: auto;
    padding: 0 16px 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.6;
  }
  .prompt-details__copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--color-ink-secondary);
    font-size: 16px;
    cursor: pointer;
    &:hover:not(:disabled) {
      background: var(--color-surface-1);
      color: var(--color-ink-primary);
    }
    &:focus-visible {
      outline: 2px solid var(--color-workbench-blue);
      outline-offset: 2px;
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
  .prompt-details__date {
    display: block;
    margin-bottom: 8px;
    text-align: right;
    font-size: 12px;
    color: var(--color-ink-muted);
  }
  .prompt-details__params {
    margin-top: auto;
    padding: 0 16px 16px;
    :deep(.params) {
      justify-content: flex-end;
    }
  }
  @media (max-width: 960px) {
    width: 100%;
    max-height: 360px;
  }
}
</style>
