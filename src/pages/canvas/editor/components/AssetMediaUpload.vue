<template>
  <div
    class="asset-add-wrap"
    @click.stop
    @mousedown.stop
    @dragover.prevent.stop
    @drop.prevent.stop="onDrop"
  >
    <input ref="fileInput" type="file" :accept="accept" multiple hidden @change="onChange" />
    <button
      type="button"
      class="asset-add-btn"
      :disabled="!canAdd || validating"
      @click="sourceOpen = true"
    >
      <span>＋</span><span>添加</span>
    </button>
    <MediaSourceDialog
      v-model:open="sourceOpen"
      :kinds="kinds"
      :max-count="remaining"
      :project-id="String(route.query.projectId || '')"
      @local="fileInput?.click()"
      @select="selectAssets"
    />
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import MediaSourceDialog from '@/components/AssetLibrary/MediaSourceDialog.vue'
import { validateLibrarySelection } from '@/components/AssetLibrary/selection'
import { readAssetDuration } from '@/components/AssetLibrary/mediaMetadata'
import { useMessage } from '../../shims/message'
import { detectFileKind } from '../../composables/useMediaAssetUpload'
import {
  validateAiImageConstraints,
  formatAiImageValidationError,
} from '../../shims/imageConstraints'
const props = defineProps({
  canAdd: { type: Boolean, default: true },
  accept: { type: String, required: true },
  videoImageConstraints: { type: Boolean, default: false },
  maxImages: { type: Number, default: Infinity },
  maxVideos: { type: Number, default: Infinity },
  maxAudios: { type: Number, default: Infinity },
  capImages: Number,
  capVideos: Number,
  capAudios: Number,
})
const emit = defineEmits(['change', 'library-select'])
const route = useRoute()
const message = useMessage()
const fileInput = ref(null)
const sourceOpen = ref(false)
const validating = ref(false)
const limits = computed(() => ({
  image: props.maxImages,
  video: props.maxVideos,
  audio: props.maxAudios,
  document: Infinity,
}))
const kinds = computed(() =>
  ['image', 'video', 'audio'].filter(
    (kind) => props.accept.includes(kind + '/') && limits.value[kind] > 0
  )
)
const remaining = computed(() =>
  Math.min(
    50,
    kinds.value.reduce((total, kind) => total + limits.value[kind], 0)
  )
)
async function acceptFiles(files) {
  if (!props.canAdd || validating.value) return
  validating.value = true
  const counts = { image: 0, video: 0, audio: 0, document: 0 }
  const accepted = []
  try {
    for (const file of files) {
      const kind = detectFileKind(file)
      if (
        !(
          kinds.value.includes(kind) ||
          (kind === 'document' &&
            props.accept.includes('.' + file.name.split('.').pop().toLowerCase()))
        ) ||
        counts[kind] >= limits.value[kind]
      ) {
        message.warning('已忽略类型不支持或超过数量上限的素材')
        continue
      }
      if (kind === 'image' && props.videoImageConstraints) {
        const result = await validateAiImageConstraints(file)
        if (!result.valid) {
          message.warning(formatAiImageValidationError(result, file.name))
          continue
        }
      }
      counts[kind] += 1
      accepted.push(file)
    }
    if (accepted.length) emit('change', accepted)
  } finally {
    validating.value = false
  }
}
function onChange(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  void acceptFiles(files)
}
function onDrop(event) {
  void acceptFiles(Array.from(event.dataTransfer?.files || []))
}
async function selectAssets(assets) {
  if (!props.canAdd || validating.value) return
  validating.value = true
  try {
    const fresh = validateLibrarySelection(assets, [], remaining.value, props.accept.split(','))
    const counts = { image: 0, video: 0, audio: 0, document: 0 }
    const accepted = []
    for (const asset of fresh) {
      if (!kinds.value.includes(asset.kind) || ++counts[asset.kind] > limits.value[asset.kind])
        throw new Error('素材类型或数量超过当前节点上限')
      const maxMB = { image: 10, video: 50, audio: 15 }[asset.kind]
      if (asset.fileSize != null && Number(asset.fileSize) > maxMB * 1024 * 1024)
        throw new Error(`${asset.name} 不能超过 ${maxMB}MB`)
      if (asset.kind === 'image' && props.videoImageConstraints) {
        const result = await validateAiImageConstraints(asset.url)
        if (!result.valid) throw new Error(formatAiImageValidationError(result, asset.name))
      }
      const duration =
        asset.kind === 'image' ? undefined : await readAssetDuration(asset.url, asset.kind)
      accepted.push({
        kind: asset.kind,
        url: asset.url,
        name: asset.name,
        cover: asset.coverUrl,
        duration,
      })
    }
    emit('library-select', accepted)
    sourceOpen.value = false
  } catch (error) {
    message.error(error.message || '素材读取失败')
  } finally {
    validating.value = false
  }
}
</script>
<style scoped lang="scss">
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
  border: 1px dashed var(--color-border-whisper);
  border-radius: 8px;
  background: var(--color-surface-1);
  color: var(--color-creative-violet);
  cursor: pointer;
  span:last-child {
    font-size: 12px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
