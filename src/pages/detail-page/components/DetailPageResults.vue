<template>
  <div class="detail-results">
    <article v-for="group in groups" :key="group.id" class="detail-batch">
      <header class="detail-batch__head">
        <div class="detail-batch__title"><h3><time>{{ formatTime(group.works[0].createTime) }}</time> {{ group.title }}</h3><StudioParams :work="group.works[0]" inline :show-points="false" /></div>
        <div class="detail-batch__actions">
          <Button :disabled="!group.works.some(work => work.picUrl)" @click="longPreview = group">预览长图</Button>
          <Button type="primary" :loading="downloading === group.id" :disabled="!group.works.some(work => work.picUrl)" @click="downloadGroup(group)"><DownloadOutlined />下载</Button>
        </div>
      </header>
      <div class="detail-batch__strip">
        <button v-for="(url, index) in group.originals" :key="`original-${index}`" type="button" class="detail-card detail-card--original" @click="openPreview(group, url)">
          <img :src="url" alt="商品原图" loading="lazy" />
          <span class="detail-card__original">原图</span>
        </button>
        <button v-for="work in group.works" :key="work.id" type="button" class="detail-card" :disabled="!work.picUrl" @click="openPreview(group, work.picUrl)">
          <img v-if="work.picUrl" :src="work.picUrl" :alt="work.creationLabel || '详情页模块'" loading="lazy" />
          <span v-else class="detail-card__placeholder"><Spin v-if="pending(work)" /><WarningOutlined v-else />{{ pending(work) ? '正在生成' : work.errorMessage || '生成失败' }}</span>
          <span class="detail-card__label">{{ work.creationLabel || '详情页模块' }}</span>
        </button>
      </div>
    </article>
    <Modal :open="!!longPreview" title="详情页长图预览" :footer="null" width="800px" @cancel="longPreview = undefined">
      <div v-if="longPreview" class="detail-long-preview">
        <template v-for="work in longPreview.works" :key="work.id">
          <img v-if="work.picUrl" :src="work.picUrl" :alt="work.creationLabel || '详情页模块'" />
          <p v-else>{{ work.creationLabel }}：{{ pending(work) ? '正在生成' : '生成失败' }}</p>
        </template>
      </div>
    </Modal>
    <ImagePreviewGroup v-if="viewerVisible" :preview="{ visible: viewerVisible, current: viewerIndex, onVisibleChange: (visible: boolean) => viewerVisible = visible, onChange: (current: number) => viewerIndex = current }">
      <Image v-for="(url, index) in previewUrls" :key="`${index}-${url}`" :src="url" class="detail-preview-source" />
    </ImagePreviewGroup>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Image, Modal, Spin } from 'ant-design-vue'
import { DownloadOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { downloadStudioFile, studioFileName, type StudioWork } from '@/pages/detail-page/api'
import { useToast } from '@/composables/useToast'
import { groupDetailWorks, type DetailWorkGroup } from '@/lib/creation/detail-results'
import StudioParams from '@/components/studio/StudioParams.vue'
const props = defineProps<{ works: StudioWork[] }>()
const ImagePreviewGroup = Image.PreviewGroup
const { addToast } = useToast()
const groups = computed(() => groupDetailWorks(props.works))
const longPreview = ref<DetailWorkGroup>()
const viewerVisible = ref(false)
const viewerIndex = ref(0)
const previewUrls = ref<string[]>([])
const viewerGroupId = ref('')
function openPreview(group: DetailWorkGroup, url?: string) {
  if (!url) return
  viewerGroupId.value = group.id
  previewUrls.value = [...group.originals, ...group.works.flatMap(work => work.picUrl ? [work.picUrl] : [])]
  viewerIndex.value = previewUrls.value.indexOf(url)
  viewerVisible.value = true
}
const downloading = ref('')
const pending = (work: StudioWork) => work.status !== 20 && work.status !== 30
watch(() => props.works, () => {
  if (!groups.value.some(group => group.id === viewerGroupId.value)) viewerVisible.value = false
  if (longPreview.value) longPreview.value = groups.value.find(group => group.id === longPreview.value?.id)
})
function formatTime(value: StudioWork['createTime']) {
  if (!value) return ''
  const date = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0) : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}
async function downloadGroup(group: DetailWorkGroup) {
  downloading.value = group.id
  try {
    for (const work of group.works) {
      if (work.picUrl) await downloadStudioFile(work.picUrl, studioFileName('image', work.id, work.picUrl))
    }
  } catch (error) { addToast(error instanceof Error ? error.message : '下载失败，请重试', 'error') }
  finally { downloading.value = '' }
}
</script>
<style scoped lang="scss">
.detail-results { display: grid; gap: var(--creation-group-gap); }
.detail-batch {
  min-width: 0;
  &__head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  &__title { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 16px; min-width: 0; flex: 1; }
  h3 { margin: 0; min-width: 0; overflow-wrap: anywhere; font-size: 14px; font-weight: 600; }
  time { margin-right: 8px; }
  &__actions { display: flex; gap: 8px; flex-shrink: 0; }
  &__strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: var(--creation-item-gap); }
}
.detail-card {
  position: relative; width: 100%; min-width: 0; aspect-ratio: 1; padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: var(--color-surface-0); cursor: zoom-in;
  img { width: 100%; height: 100%; object-fit: contain; }
  &:disabled { cursor: default; }
  &__original { position: absolute; top: 8px; left: 8px; padding: 4px 10px; border-radius: 6px; color: var(--color-on-media); background: var(--color-media-veil); }
  &__label { position: absolute; inset: auto 0 0; padding: 28px 12px 12px; text-align: left; font-size: 13px; font-weight: 600; color: var(--color-on-media); background: linear-gradient(transparent, var(--color-media-veil)); }
  &__placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 100%; padding: 20px; color: var(--color-ink-secondary); }
}
.detail-long-preview { max-height: 75vh; overflow-y: auto; img { display: block; width: 100%; height: auto; } }
.detail-preview-source { display: none; }
</style>
