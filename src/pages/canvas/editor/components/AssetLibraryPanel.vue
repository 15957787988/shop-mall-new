<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { galleryPoster, isVideoUrl } from '../../utils/galleryMedia'
import { listPersonalAssets } from '../../shims/assets'

const ASSET_DRAG_MIME = 'application/x-canvas-asset'
const PERSONAL_ASSET_MAX = 100

const props = defineProps({
  canEdit: { type: Boolean, default: false },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['insert-asset', 'asset-dragging', 'close'])

const loading = ref(false)
const loadError = ref('')
const searchInputRef = ref(null)
const loadedAssets = ref([])
const keyword = ref('')
const tab = ref('all')

const assets = computed(() => loadedAssets.value)

const counts = computed(() => {
  const all = assets.value.length
  const image = assets.value.filter((asset) => resolveAssetKind(asset) === 'image').length
  const video = assets.value.filter((asset) => resolveAssetKind(asset) === 'video').length
  return { all, image, video }
})
const filteredAssets = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return assets.value.filter((asset) => {
    const kind = resolveAssetKind(asset)
    if (tab.value !== 'all' && tab.value !== kind) return false
    if (!key) return true
    const haystack = `${asset.name || ''} ${asset.url || ''}`.toLowerCase()
    return haystack.includes(key)
  })
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    void loadAssets()
  },
  { immediate: true }
)

async function loadAssets() {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const personalAssets = await listPersonalAssets(undefined, { allowCachedFallback: false })
    loadedAssets.value = personalAssets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      url: asset.url,
      poster: asset.cover,
      name: asset.name,
      size: asset.size,
      duration: asset.duration
    }))
  } catch (e) {
    loadError.value = '素材暂时没有加载出来'
    loadedAssets.value = []
  } finally {
    loading.value = false
  }
}

defineExpose({ reload: loadAssets })

async function retryLoadAssets() {
  await loadAssets()
  await nextTick()
  searchInputRef.value?.focus()
}

function clearFilters() {
  keyword.value = ''
  tab.value = 'all'
}

function resolveAssetKind(asset) {
  if (asset?.kind === 'video') return 'video'
  if (asset?.kind === 'image') return 'image'
  return isVideoUrl(asset?.url || '') ? 'video' : 'image'
}

function resolveThumb(asset) {
  return galleryPoster(asset?.url || '', asset?.poster || '')
}

function onDragStart(event, asset) {
  if (!props.canEdit) return
  const payload = {
    id: asset.id,
    name: asset.name,
    url: asset.url,
    poster: asset.poster,
    duration: asset.duration,
    kind: resolveAssetKind(asset)
  }
  const serialized = JSON.stringify(payload)
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(ASSET_DRAG_MIME, serialized)
  event.dataTransfer.setData('text/plain', serialized)
  emit('asset-dragging', payload)
}

function onDragEnd() {
  emit('asset-dragging', null)
}

function quickInsert(asset) {
  if (!props.canEdit) return
  emit('insert-asset', {
    ...asset,
    kind: resolveAssetKind(asset)
  })
}
</script>

<template>
  <div class="asset-library-wrap" @click.stop>
    <aside class="asset-library-panel">
      <div class="asset-header">
        <div class="asset-title-wrap">
          <div class="asset-title">资产库</div>
          <div class="asset-capacity">{{ counts.all }} / {{ PERSONAL_ASSET_MAX }}</div>
        </div>
        <button class="asset-close-btn" @click="emit('close')">关闭</button>
      </div>

      <div class="asset-search">
        <input
          ref="searchInputRef"
          v-model="keyword"
          type="text"
          placeholder="搜索素材名称 / URL"
        />
      </div>

      <div class="asset-tabs">
        <button :class="{ active: tab === 'all' }" @click="tab = 'all'"
          >全部 {{ counts.all }}</button
        >
        <button :class="{ active: tab === 'image' }" @click="tab = 'image'"
          >图片 {{ counts.image }}</button
        >
        <button :class="{ active: tab === 'video' }" @click="tab = 'video'"
          >视频 {{ counts.video }}</button
        >
      </div>

      <div v-if="loading" class="asset-empty" role="status">正在加载素材…</div>
      <div v-else-if="loadError" class="asset-empty" role="alert">
        <p>{{ loadError }}</p>
        <button class="asset-state-action" @click="retryLoadAssets">重新加载</button>
      </div>
      <div v-else-if="!filteredAssets.length" class="asset-empty">
        <template v-if="assets.length && (keyword.trim() || tab !== 'all')">
          <p>{{
            keyword.trim() ? '未找到相关素材' : `还没有${tab === 'image' ? '图片' : '视频'}素材`
          }}</p>
          <button class="asset-state-action" @click="clearFilters">清除筛选</button>
        </template>
        <template v-else>
          <p>还没有素材</p>
          <p>在资产库上传，或从作品中添加后，即可在这里选用。</p>
        </template>
      </div>
      <div v-else class="asset-list">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id || asset.url"
          class="asset-item"
          :class="{ readonly: !canEdit }"
          :draggable="canEdit"
          role="button"
          :tabindex="canEdit ? 0 : -1"
          :aria-disabled="!canEdit"
          :aria-label="`将${asset.name || '未命名素材'}添加到画布`"
          @keydown.enter.prevent="!$event.repeat && quickInsert(asset)"
          @keydown.space.prevent="!$event.repeat && quickInsert(asset)"
          @dragstart="onDragStart($event, asset)"
          @dragend="onDragEnd"
          @dblclick="quickInsert(asset)"
        >
          <div class="asset-thumb">
            <img
              v-if="resolveThumb(asset)"
              :src="resolveThumb(asset)"
              :alt="asset.name || 'asset'"
              referrerpolicy="no-referrer"
            />
            <div v-else class="asset-fallback">{{
              resolveAssetKind(asset) === 'video' ? '视频' : '图片'
            }}</div>
            <span class="asset-kind">{{
              resolveAssetKind(asset) === 'video' ? '视频' : '图片'
            }}</span>
          </div>
          <div class="asset-name" :title="asset.name || asset.url || '未命名素材'">{{
            asset.name || asset.url || '未命名素材'
          }}</div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>

.asset-state-action {
  padding: 6px 10px;
  border: 1px solid $border-default;
  border-radius: 6px;
  background: transparent;
  color: $text-primary;
  font: inherit;
  cursor: pointer;
}
.asset-state-action:focus-visible,
.asset-item:focus-visible {
  outline: 2px solid $text-muted;
  outline-offset: 2px;
}

.asset-library-wrap {
  position: absolute;
  left: 92px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 12;
  pointer-events: none;
}

.asset-library-panel {
  width: 272px;
  height: min(84vh, 760px);
  background: #292927;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

.asset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.asset-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asset-title {
  color: $text-primary;
  font-size: 14px;
  font-weight: 600;
}

.asset-capacity {
  font-size: 12px;
  color: $text-dim;
}

.asset-close-btn {
  font-size: 12px;
  color: var(--consumer-accent);
  background: transparent;
  border: 1px solid rgba(var(--consumer-accent-rgb), 0.45);
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(var(--consumer-accent-rgb), 0.14);
  }
}

.asset-search {
  padding: 10px 12px;

  input {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 10px;
    color: $text-primary;
    background: rgba(255, 255, 255, 0.03);
    outline: none;
    font-size: 12px;

    &:focus {
      border-color: $accent-primary;
    }
  }
}

.asset-tabs {
  display: flex;
  gap: 8px;
  padding: 0 12px 10px;

  button {
    flex: 1;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: $text-dim;
    border-radius: 8px;
    padding: 5px 6px;
    cursor: pointer;
    font-size: 12px;

    &.active {
      color: var(--consumer-accent);
      border-color: rgba(var(--consumer-accent-rgb), 0.55);
      background: rgba(var(--consumer-accent-rgb), 0.12);
    }
  }
}

.asset-empty {
  margin: 12px;
  padding: 18px 12px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  color: $text-dim;
  text-align: center;
  font-size: 12px;
}

.asset-error {
  margin: 0 12px 10px;
  color: #ff8f8f;
  font-size: 12px;
}

.asset-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 12px 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 8px;
}

.asset-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  cursor: grab;
  transition:
    transform 0.12s,
    border-color 0.12s,
    background 0.12s;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba($accent-primary, 0.45);
    background: rgba($accent-primary, 0.08);
  }

  &.readonly {
    cursor: default;
  }

  &:active {
    cursor: grabbing;
  }
}

.asset-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: rgba(0, 0, 0, 0.22);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.asset-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-dim;
  font-size: 12px;
}

.asset-kind {
  position: absolute;
  right: 6px;
  top: 6px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
}

.asset-name {
  padding: 8px;
  color: $text-secondary;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
