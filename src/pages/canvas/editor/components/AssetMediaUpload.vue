<template>
  <div
    class="asset-add-wrap"
    @click.stop
    @mousedown.stop
    @dragenter.prevent.stop="dragDepth++"
    @dragover.prevent.stop
    @dragleave.prevent.stop="dragDepth = Math.max(0, dragDepth - 1)"
    @drop.prevent.stop="onDrop"
  >
    <input ref="fileInputRef" type="file" :accept="accept" multiple hidden @change="onFileChange" />
    <button
      class="asset-add-btn"
      :class="{ dragging: dragDepth > 0 && canAdd }"
      :disabled="!canAdd || validating"
      title="点击或拖拽文件到此处添加素材"
      @click="openPicker"
    >
      <span>＋</span>
      <span>{{ dragDepth > 0 ? '松开添加' : '添加' }}</span>
    </button>

    <SelectorDialog v-model="selectorVisible" v-model:activeTab="selectorTab" width="820px">
      <template #asset>
        <AssetLibraryPanel
          :items="assetPanelItems"
          v-model:selectedKeys="selectedAssetIds"
          :kinds="assetKinds"
          :maxSelectable="remainingAssetSlots"
          :max-images="remainingByKind.image"
          :max-videos="remainingByKind.video"
          :max-audios="remainingByKind.audio"
          :loading="assetLoading"
          :showRefresh="true"
          :subtitle="assetSubtitle"
          empty-text="暂无可选素材"
          @refresh="loadAssetItems"
          @cancel="selectorVisible = false"
          @confirm="confirmAssetSelection"
        />
      </template>

      <template #local>
        <div class="selector-local-panel">
          <div class="selector-local-tip">支持从本地上传当前节点允许的素材类型</div>
          <label class="selector-local-empty">
            <input type="file" :accept="accept" multiple hidden @change="onLocalFilePick" />
            <span class="selector-local-plus">+</span>
            <p class="selector-local-title">添加素材</p>
            <div class="selector-local-desc">支持图片、视频、音频</div>
          </label>

          <div class="selector-local-selected">
            <div v-if="!localSelectedFiles.length" class="selector-local-empty-list"
              >暂未选择素材</div
            >
            <div v-else class="selector-local-list">
              <div
                v-for="(file, idx) in localSelectedFiles"
                :key="`${file.name}-${file.size}-${file.lastModified}-${idx}`"
                class="selector-local-item"
              >
                <span class="selector-local-kind">{{ localFileKindLabel(file) }}</span>
                <span class="selector-local-name" :title="file.name">{{ file.name }}</span>
                <button type="button" @click="removeLocalFile(idx)">移除</button>
              </div>
            </div>
          </div>

          <div class="selector-local-footer">
            <div class="selector-local-summary">{{ localSelectedSummary }}</div>
            <div class="selector-local-actions">
              <button type="button" @click="cancelLocalSelection">取消</button>
              <button
                type="button"
                :disabled="localSelectedFiles.length === 0"
                @click="confirmLocalSelection"
                >确定</button
              >
            </div>
          </div>
        </div>
      </template>
    </SelectorDialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMessage } from '../../shims/message'
import { listPersonalAssets } from '../../shims/assets'
import SelectorDialog from '../../shims/SelectorDialog.vue'
import AssetLibraryPanel from '../../shims/AssetPicker.vue'
import {
  validateAiImageConstraints,
  AI_IMAGE_CONSTRAINTS_TIP,
  formatAiImageValidationError
} from '../../shims/imageConstraints'
import { detectFileKind } from '../../composables/useMediaAssetUpload'
/**
 * 资产墙上传入口 — 点击直接选文件，按格式自动识别类型
 */
const props = defineProps({
  canAdd: { type: Boolean, default: true },
  accept: { type: String, required: true },
  /** 视频节点参考图：校验宽高 px 与宽高比 */
  videoImageConstraints: { type: Boolean, default: false },
  /** 本次还能添加的数量（来自 mediaLimits.platformMax* 减已占用） */
  maxImages: { type: Number, default: Infinity },
  maxVideos: { type: Number, default: Infinity },
  maxAudios: { type: Number, default: Infinity },
  /** 平台最大上限，仅用于提示文案 */
  capImages: { type: Number, default: Infinity },
  capVideos: { type: Number, default: Infinity },
  capAudios: { type: Number, default: Infinity }
})

const emit = defineEmits(['change'])
const message = useMessage()

const fileInputRef = ref(null)
const dragDepth = ref(0)
const validating = ref(false)
const selectorVisible = ref(false)
const selectorTab = ref('local')
const selectedAssetIds = ref([])
const assetLoading = ref(false)
const assetItems = ref([])
const localSelectedFiles = ref([])

const supportsImage = computed(() => props.accept.includes('image/'))
const supportsVideo = computed(() => props.accept.includes('video/'))
const supportsAudio = computed(() => props.accept.includes('audio/'))

const assetKinds = computed(() => {
  const kinds = []
  if (supportsImage.value) kinds.push('image')
  if (supportsVideo.value) kinds.push('video')
  if (supportsAudio.value) kinds.push('audio')
  return kinds.length ? kinds : ['image']
})

const remainingAssetSlots = computed(() => {
  const total =
    Math.max(0, Number(props.maxImages) || 0) +
    Math.max(0, Number(props.maxVideos) || 0) +
    Math.max(0, Number(props.maxAudios) || 0)
  return total > 0 ? total : 1
})

const remainingByKind = computed(() => ({
  image: Math.max(0, Number(props.maxImages) || 0),
  video: Math.max(0, Number(props.maxVideos) || 0),
  audio: Math.max(0, Number(props.maxAudios) || 0)
}))

const localSelectedByKind = computed(() => {
  const counts = { image: 0, video: 0, audio: 0 }
  for (const file of localSelectedFiles.value) {
    const kind = detectFileKind(file)
    if (kind === 'image' || kind === 'video' || kind === 'audio') counts[kind] += 1
  }
  return counts
})

const localSelectedSummary = computed(() => {
  const parts = []
  if (supportsImage.value)
    parts.push(`图片 ${localSelectedByKind.value.image} / ${remainingByKind.value.image}`)
  if (supportsVideo.value)
    parts.push(`视频 ${localSelectedByKind.value.video} / ${remainingByKind.value.video}`)
  if (supportsAudio.value)
    parts.push(`音频 ${localSelectedByKind.value.audio} / ${remainingByKind.value.audio}`)
  return `已选${parts.join('，')}`
})

const assetSubtitle = computed(
  () => `素材来源：资产库 · 最多可再选 ${remainingAssetSlots.value} 个`
)

const assetPanelItems = computed(() =>
  assetItems.value
    .filter((item) => assetKinds.value.includes(item.type))
    .map((item) => ({
      id: String(item.id),
      type: item.type,
      url: item.url,
      cover: item.cover,
      name: item.name,
      duration: item.duration
    }))
)

watch(
  () => selectorVisible.value,
  (visible) => {
    if (!visible) {
      selectedAssetIds.value = []
      localSelectedFiles.value = []
      return
    }
    selectedAssetIds.value = []
    localSelectedFiles.value = []
    if (selectorTab.value === 'asset' && !assetItems.value.length) {
      loadAssetItems()
    }
  }
)

watch(
  () => selectorTab.value,
  (tab) => {
    if (tab === 'asset' && !assetItems.value.length) {
      loadAssetItems()
    }
  },
  { immediate: true }
)

function openPicker(e) {
  e.stopPropagation()
  if (!props.canAdd || validating.value) return
  selectorTab.value = 'local'
  selectorVisible.value = true
}

const KIND_LABEL = { image: '图片', video: '视频', audio: '音频' }

function applyBatchLimits(files, existingCounts = { image: 0, video: 0, audio: 0 }) {
  const remain = {
    image:
      Math.max(0, Number(props.maxImages) || 0) - Math.max(0, Number(existingCounts.image) || 0),
    video:
      Math.max(0, Number(props.maxVideos) || 0) - Math.max(0, Number(existingCounts.video) || 0),
    audio:
      Math.max(0, Number(props.maxAudios) || 0) - Math.max(0, Number(existingCounts.audio) || 0)
  }
  const accepted = []
  const skippedByKind = { image: 0, video: 0, audio: 0 }
  for (const file of files) {
    const kind = detectFileKind(file)
    if (kind === 'image' || kind === 'video' || kind === 'audio') {
      if (remain[kind] > 0) {
        accepted.push(file)
        remain[kind] -= 1
      } else {
        skippedByKind[kind] += 1
      }
      continue
    }
    accepted.push(file)
  }
  const caps = { image: props.capImages, video: props.capVideos, audio: props.capAudios }
  const skippedParts = Object.entries(skippedByKind)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => {
      const cap = Number(caps[k])
      const capText = Number.isFinite(cap) ? ` ${cap} 个` : ''
      return `${KIND_LABEL[k]}已达最大上限${capText}，已忽略 ${n} 个`
    })
  if (skippedParts.length) {
    message.warning(skippedParts.join('；'))
  }
  return accepted
}

function onFileChange(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  return acceptFiles(files)
}

function onLocalFilePick(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  return acceptFiles(files)
}

function onDrop(e) {
  dragDepth.value = 0
  selectorTab.value = 'local'
  selectorVisible.value = true
  return acceptFiles(Array.from(e.dataTransfer?.files || []))
}

async function acceptFiles(files) {
  if (!props.canAdd || validating.value || !files.length) return
  const acceptedTypes = props.accept
    .split(',')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean)
  const allowed = files.filter(
    (file) =>
      !acceptedTypes.length ||
      acceptedTypes.some((type) =>
        type.startsWith('.')
          ? file.name.toLowerCase().endsWith(type)
          : type.endsWith('/*')
            ? file.type.toLowerCase().startsWith(type.slice(0, -1))
            : file.type.toLowerCase() === type
      )
  )
  if (allowed.length !== files.length) message.warning('已忽略不支持的文件格式')
  files = allowed
  if (!files.length) return
  validating.value = true
  try {
    const validFiles = await processFiles(files)
    if (!validFiles.length) return

    const existed = new Set(
      localSelectedFiles.value.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
    )
    for (const file of validFiles) {
      const key = `${file.name}-${file.size}-${file.lastModified}`
      if (existed.has(key)) continue
      existed.add(key)
      localSelectedFiles.value.push(file)
    }
  } finally {
    validating.value = false
  }
}

async function processFiles(files) {
  files = applyBatchLimits(files, localSelectedByKind.value)
  if (!files.length) return []

  if (!props.videoImageConstraints) {
    return files
  }

  const results = await Promise.all(
    files.map(async (file) => {
      if (!file.type.startsWith('image/')) {
        return { file, valid: true }
      }
      const validation = await validateAiImageConstraints(file)
      return { file, ...validation }
    })
  )

  const validFiles = results.filter((r) => r.valid).map((r) => r.file)
  const invalidFiles = results.filter((r) => !r.valid)

  if (invalidFiles.length > 0) {
    const msg = invalidFiles
      .map((item) => formatAiImageValidationError(item, item.file.name))
      .join('\n')
    message.warning(`以下图片不符合要求（${AI_IMAGE_CONSTRAINTS_TIP}）：\n\n${msg}`, {
      duration: 4000
    })
  }

  return validFiles
}

function localFileKindLabel(file) {
  const kind = detectFileKind(file)
  if (kind === 'image') return '图片'
  if (kind === 'video') return '视频'
  if (kind === 'audio') return '音频'
  return '文件'
}

function removeLocalFile(index) {
  if (index < 0 || index >= localSelectedFiles.value.length) return
  localSelectedFiles.value.splice(index, 1)
}

function cancelLocalSelection() {
  localSelectedFiles.value = []
  selectorVisible.value = false
}

function confirmLocalSelection() {
  if (!localSelectedFiles.value.length) return
  emit('change', [...localSelectedFiles.value])
  localSelectedFiles.value = []
  selectorVisible.value = false
}

async function loadAssetItems() {
  assetLoading.value = true
  try {
    const personalAssets = (
      await listPersonalAssets(undefined, { allowCachedFallback: false })
    ).filter((item) => {
      if (item.kind === 'image') return supportsImage.value
      if (item.kind === 'video') return supportsVideo.value
      return false
    })

    assetItems.value = personalAssets.map((item) => ({
      id: item.id,
      type: item.kind === 'video' ? 'video' : item.kind === 'audio' ? 'audio' : 'image',
      url: item.url,
      cover: item.cover || item.url,
      name: item.name,
      duration: Number(item.duration) || undefined
    }))
  } catch {
    message.error('加载资产库失败，请重试')
  } finally {
    assetLoading.value = false
  }
}

function confirmAssetSelection(items) {
  if (!Array.isArray(items) || !items.length) return

  const remain = { ...remainingByKind.value }
  const accepted = []
  const skippedByKind = { image: 0, video: 0, audio: 0 }

  for (const item of items) {
    const kind = item?.type
    if (kind === 'image' || kind === 'video' || kind === 'audio') {
      if (remain[kind] > 0) {
        accepted.push(item)
        remain[kind] -= 1
      } else {
        skippedByKind[kind] += 1
      }
      continue
    }
    accepted.push(item)
  }

  const caps = { image: props.capImages, video: props.capVideos, audio: props.capAudios }
  const skippedParts = Object.entries(skippedByKind)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => {
      const cap = Number(caps[k])
      const capText = Number.isFinite(cap) ? ` ${cap} 个` : ''
      return `${KIND_LABEL[k]}已达最大上限${capText}，已忽略 ${n} 个`
    })
  if (skippedParts.length) {
    message.warning(skippedParts.join('；'))
  }

  if (!accepted.length) return

  emit(
    'library-select',
    accepted
      .filter((item) => !!item?.url)
      .map((item) => ({
        kind: item.type,
        url: item.url,
        name: item.name || '',
        duration: Number(item.duration) || undefined,
        cover: item.cover || item.url
      }))
  )
  selectorVisible.value = false
}
</script>

<style lang="scss" scoped>

.asset-add-wrap {
  flex-shrink: 0;
}

.asset-add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 52px;
  height: 52px;
  background: rgba($accent-primary, 0.07);
  border: 1.5px dashed rgba($accent-primary, 0.25);
  border-radius: $radius-md;
  color: $accent-text;
  font-size: 16px;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s;
  font-family: inherit;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  span:last-child {
    font-size: 12px;
    font-weight: 500;
  }

  &.dragging,
  &:hover:not(:disabled) {
    background: rgba($accent-primary, 0.14);
    border-color: rgba($accent-primary, 0.5);
  }
}

.selector-local-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
  flex: 1;
  overflow: hidden;
}

.selector-local-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.selector-local-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--consumer-muted);
}

.selector-local-plus {
  font-size: 28px;
  line-height: 1;
  color: var(--el-color-primary-light-3);
}

.selector-local-title {
  margin: 8px 0 4px;
  font-size: 14px;
}

.selector-local-desc {
  font-size: 12px;
}

.selector-local-selected {
  min-height: 0;
  flex: 1;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--el-border-color));
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  overflow-y: auto;
  overflow-x: hidden;
}

.selector-local-empty-list {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--el-text-color-secondary) 85%, var(--el-color-primary));
  font-size: 13px;
}

.selector-local-list {
  display: flex;
  flex-direction: column;
}

.selector-local-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--el-color-primary) 10%, var(--el-border-color));
  background: color-mix(in srgb, var(--el-color-primary-dark-9) 20%, #fff);
  transition: background-color 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--el-color-primary-dark-9) 45%, #fff);
  }

  &:last-child {
    border-bottom: 0;
  }
}

.selector-local-kind {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1;
  color: color-mix(in srgb, var(--el-color-primary-dark-2) 85%, var(--el-color-primary));
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--el-color-primary-light-9) 40%, transparent);
  background: color-mix(in srgb, var(--el-color-primary-dark-1) 70%, #fff);
}

.selector-local-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: color-mix(in srgb, var(--el-text-color-primary) 92%, #000);
  font-size: 13px;
}

.selector-local-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--el-border-color) 85%, transparent);
}

.selector-local-summary {
  color: color-mix(in srgb, var(--el-text-color-secondary) 80%, var(--el-color-primary));
  font-size: 13px;
}

.selector-local-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
