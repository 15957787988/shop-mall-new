<template>
  <aside class="studio-preview__prompt prompt-details">
    <h3>提示词</h3>
    <div class="studio-preview__text">{{ work.prompt || '无提示词' }}</div>
    <StudioReferences :work="work" :source-video-url="sourceVideoUrl" />
    <button type="button" class="studio-preview__copy" :disabled="!work.prompt" @click="copyPrompt">
      <CopyOutlined />复制
    </button>
    <div class="prompt-details__params"><StudioParams :work="work" /></div>
  </aside>
</template>
<script setup lang="ts">
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
  h3 {
    margin: 0;
    padding: 16px 48px 8px 16px;
    font-size: 16px;
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
  .studio-preview__copy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-end;
    margin: 0 16px 16px;
    padding: 6px 14px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 8px;
    background: var(--color-surface-0);
    color: var(--color-ink-primary);
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
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
