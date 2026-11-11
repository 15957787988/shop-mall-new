<template>
  <Modal
    class="media-source-modal"
    :class="{ 'asset-picker-modal': library }"
    :open="open"
    :title="library ? '从资产库选择' : '选择上传方式'"
    :width="library ? 1080 : 640"
    :footer="null"
    centered
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <AssetLibrary
      v-if="library"
      selectable
      :kinds="kinds"
      :max-count="maxCount"
      :project-id="projectId"
      :exclude-urls="excludeUrls"
      @select="emit('select', $event)"
      @cancel="emit('update:open', false)"
    />
    <div v-else class="media-source-options">
      <button type="button" class="media-source-card" @click="local">
        <span class="media-source-card__icon"><UploadOutlined /></span>
        <span class="media-source-card__title">本地上传</span>
        <span class="media-source-card__description">从电脑选择文件</span>
      </button>
      <button type="button" class="media-source-card" @click="library = true">
        <span class="media-source-card__icon"><FolderOpenOutlined /></span>
        <span class="media-source-card__title">从资产库选择</span>
        <span class="media-source-card__description">复用当前账号已上传的素材</span>
      </button>
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import { FolderOpenOutlined, UploadOutlined } from '@ant-design/icons-vue'
import AssetLibrary from './AssetLibrary.vue'
import type { LibraryAsset } from './api'
interface Props {
  open: boolean
  kinds: LibraryAsset['kind'][]
  maxCount: number
  projectId?: string
  excludeUrls?: string[]
  libraryOnly?: boolean
}
const props = withDefaults(defineProps<Props>(), { projectId: '', excludeUrls: () => [] })
const emit =
  defineEmits<{ 'update:open': [value: boolean]; local: []; select: [assets: LibraryAsset[]] }>()
const library = ref(props.libraryOnly)
watch(
  () => props.open,
  () => {
    library.value = props.libraryOnly
  }
)
function local() {
  emit('update:open', false)
  emit('local')
}
</script>
<style scoped lang="scss">
.media-source-modal {
  :deep(.ant-modal-content) {
    padding: 28px;
    border-radius: 20px;
  }
  :deep(.ant-modal-header) {
    margin-bottom: 24px;
  }
  :deep(.ant-modal-title) {
    font-size: 20px;
    line-height: 1.5;
  }
}
.media-source-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 4px 0;
}
.media-source-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 204px;
  padding: 24px;
  border: 1px solid var(--color-border-whisper);
  border-radius: 16px;
  background: var(--color-surface-0);
  color: var(--color-ink-primary);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s;

  &:hover {
    border-color: var(--color-creative-violet);
    background: var(--color-accent-soft);
    box-shadow: var(--shadow-soft);
  }
  &:focus-visible {
    outline: 2px solid var(--color-creative-violet);
    outline-offset: 3px;
  }
  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    margin-bottom: 20px;
    border-radius: 12px;
    background: var(--color-accent-soft);
    color: var(--color-creative-violet);
    font-size: 26px;
  }
  &__title {
    margin-bottom: 8px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.5;
  }
  &__description {
    color: var(--color-ink-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
}
@media (max-width: 520px) {
  .media-source-options {
    grid-template-columns: 1fr;
  }
  .media-source-card {
    min-height: 148px;
    padding: 20px;
    &__icon {
      margin-bottom: 12px;
    }
  }
}
</style>
