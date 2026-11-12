<template>
  <div class="asset-library" :class="{ 'asset-library--selectable': selectable }">
    <section class="asset-library__content">
      <header class="asset-library__toolbar">
        <div class="asset-library__filters">
          <Select
            v-if="projectId"
            v-model:value="scope"
            :options="[
              { value: 'all', label: '全部项目' },
              { value: 'project', label: '本项目' },
            ]"
            @change="resetPage"
          />
          <Button
            v-for="item in kindOptions"
            :key="item.value"
            :type="kind === item.value ? 'primary' : 'text'"
            @click="changeKind(item.value)"
            >{{ item.label }}</Button
          >
        </div>
        <div class="asset-library__actions">
          <Button :loading="loading" @click="load">刷新</Button>
          <Button type="primary" :loading="uploading" :disabled="!isLoggedIn" @click="uploadInput?.click()"
            ><UploadOutlined />上传素材</Button
          >
          <input
            ref="uploadInput"
            type="file"
            :accept="uploadAccept"
            multiple
            hidden
            @change="upload"
          />
        </div>
      </header>
      <p v-if="!selectable" class="asset-library__hint">
        仅展示本人上传的素材。移除资产记录不会删除原文件或影响已使用的作品。
      </p>
      <Alert v-if="error" :message="error" type="error" show-icon />
      <Spin :spinning="loading">
        <div class="asset-library__grid">
          <article
            v-for="asset in items"
            :key="asset.source + ':' + asset.id"
            class="asset-library__card"
            :title="asset.name"
            :class="{
              selected: isSelected(asset),
              unavailable: !allowedKinds.includes(asset.kind),
            }"
          >
            <div class="asset-library__media" @mouseenter="playPreview" @mouseleave="stopPreview">
              <button
                v-if="selectable"
                type="button"
                class="asset-library__pick"
                :class="{
                  'asset-library__pick--on': isSelected(asset),
                  'asset-library__pick--tile': asset.kind !== 'audio',
                }"
                :disabled="!allowedKinds.includes(asset.kind)"
                :aria-label="`选择${asset.name}`"
                :aria-pressed="isSelected(asset)"
                @click="toggle(asset)"
              />
              <img
                v-if="asset.kind === 'image'"
                :src="asset.url"
                :alt="asset.name"
                loading="lazy"
              />
              <template v-else-if="asset.kind === 'video'">
                <video
                  :src="asset.url"
                  :poster="
                    asset.coverUrl && asset.coverUrl !== asset.url ? asset.coverUrl : undefined
                  "
                  preload="metadata"
                  muted
                  loop
                  playsinline
                  tabindex="-1"
                  @loadedmetadata="rememberDuration(asset, $event)"
                />
                <span v-if="durations[key(asset)]" class="asset-library__duration">
                  {{ durations[key(asset)] }}
                </span>
                <PlayCircleOutlined class="asset-library__play" aria-hidden="true" />
              </template>
              <div v-else class="asset-library__audio">
                <SoundOutlined /><audio :src="asset.url" preload="none" controls />
              </div>
              <div v-if="!selectable" class="asset-library__card-actions">
                <button
                  type="button"
                  class="asset-library__action"
                  title="下载"
                  aria-label="下载"
                  :disabled="!!downloadingKey"
                  @click="download(asset)"
                >
                  <DownloadOutlined />
                </button>
                <Popconfirm title="仅移除资产记录，保留原文件，确定移除？" @confirm="remove(asset)">
                  <button
                    type="button"
                    class="asset-library__action asset-library__action--danger"
                    title="移除"
                    aria-label="移除"
                    :disabled="busyKey === key(asset)"
                  >
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              </div>
            </div>
            <div v-if="!selectable" class="asset-library__caption">
              <strong :title="asset.name">{{ asset.name || kindLabel(asset.kind) }}</strong
              ><span>{{ asset.createdAt?.replace('T', ' ') }}</span>
            </div>
          </article>
        </div>
        <Empty
          v-if="!loading && !error && !items.length"
          description="暂无上传素材，请先上传图片、视频或音频"
        />
      </Spin>
      <footer class="asset-library__footer">
        <Pagination
          v-if="!selectable || total > 24"
          v-model:current="pageNo"
          :total="total"
          :page-size="24"
          :show-size-changer="false"
          size="small"
          @change="load"
        />
        <div v-if="selectable" class="asset-library__selection">
          <div class="asset-library__selected" aria-label="已选素材">
            <button
              v-for="asset in selected"
              :key="key(asset)"
              type="button"
              class="asset-library__thumbnail"
              :aria-label="`取消选择${asset.name}`"
              :title="asset.name"
              @click="toggle(asset)"
            >
              <img v-if="asset.kind === 'image'" :src="asset.url" :alt="asset.name" />
              <video
                v-else-if="asset.kind === 'video'"
                :src="asset.url"
                :poster="
                  asset.coverUrl && asset.coverUrl !== asset.url ? asset.coverUrl : undefined
                "
                preload="metadata"
                muted
                playsinline
              />
              <SoundOutlined v-else />
            </button>
          </div>
          <Button @click="emit('cancel')">取消</Button>
          <Button
            type="primary"
            :disabled="!selected.length || loading || uploading"
            @click="emit('select', [...selected])"
            >添加</Button
          >
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Alert, Button, Empty, Pagination, Popconfirm, Select, Spin } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { listAssets, removeAsset } from './api'
import type { LibraryAsset } from './api'
import { libraryUploadAccept, matchesLibraryUpload } from './selection'
import { uploadFile } from '@/components/UploadFile/api'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/composables/useAuth'
import { downloadStudioFile } from '@/pages/ai/api'

interface Props {
  selectable?: boolean
  kinds?: LibraryAsset['kind'][]
  maxCount?: number
  projectId?: string
  excludeUrls?: string[]
  uploadMaxSize?: number
}
const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  kinds: () => ['image', 'video', 'audio'],
  maxCount: 1,
  projectId: '',
  excludeUrls: () => [],
  uploadMaxSize: 50 * 1024 * 1024,
})
const emit = defineEmits<{ select: [assets: LibraryAsset[]]; cancel: [] }>()
const { addToast } = useToast()
const { isLoggedIn, sessionVersion } = useAuth()
const kind = ref(props.kinds.length === 1 ? props.kinds[0] : '')
const scope = ref('all')
const pageNo = ref(1)
const total = ref(0)
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const items = ref<LibraryAsset[]>([])
const selected = ref<LibraryAsset[]>([])
const busyKey = ref('')
const downloadingKey = ref('')
const uploadInput = ref<HTMLInputElement | null>(null)
const allowedKinds = computed(() => props.kinds)
const uploadKinds = computed(() =>
  props.kinds.filter((value) => !kind.value || kind.value === value)
)
const uploadAccept = computed(() => libraryUploadAccept(uploadKinds.value))
const kindOptions = computed(() => [
  { value: '', label: '全部' },
  ...props.kinds.map((value) => ({ value, label: kindLabel(value) })),
])
const durations = ref<Record<string, string>>({})
let previewVideo: HTMLVideoElement | null = null
function stopPreview() {
  previewVideo?.pause()
  previewVideo = null
}
function playPreview(event: MouseEvent) {
  const video = (event.currentTarget as HTMLElement).querySelector('video')
  if (!video) return
  stopPreview()
  previewVideo = video
  video.muted = true
  // Hover can end while the browser is still loading the first frame.
  void video
    .play()
    .then(() => {
      if (previewVideo !== video) video.pause()
    })
    .catch(() => {
      if (previewVideo === video) previewVideo = null
    })
}
function rememberDuration(asset: LibraryAsset, event: Event) {
  const seconds = (event.target as HTMLVideoElement).duration
  if (Number.isFinite(seconds) && seconds > 0)
    durations.value[key(asset)] = `${Number(seconds.toFixed(1))}s`
}
let seq = 0
let disposed = false
onBeforeUnmount(() => {
  disposed = true
  stopPreview()
  seq += 1
})
function kindLabel(value: string) {
  return ({ image: '图片', video: '视频', audio: '音频' } as Record<string, string>)[value] || value
}
function key(asset: LibraryAsset) {
  return asset.source + ':' + asset.id
}
function isSelected(asset: LibraryAsset) {
  return selected.value.some((item) => item.url === asset.url)
}
function toggle(asset: LibraryAsset) {
  if (props.excludeUrls.includes(asset.url)) return addToast('已添加该素材', 'info')
  if (isSelected(asset)) selected.value = selected.value.filter((item) => item.url !== asset.url)
  else if (selected.value.length >= props.maxCount)
    addToast(`最多可选择 ${props.maxCount} 个素材`, 'error')
  else selected.value.push(asset)
}
function changeKind(value: string) {
  kind.value = value
  resetPage()
}
function resetPage() {
  pageNo.value = 1
  void load()
}
async function load() {
  stopPreview()
  const request = ++seq
  if (!isLoggedIn.value) {
    items.value = []
    total.value = 0
    loading.value = false
    error.value = '请先登录后使用个人资产库'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await listAssets({
      source: 'uploaded',
      kind: kind.value || (props.kinds.length < 3 ? props.kinds.join(',') : undefined),
      projectId: scope.value === 'project' ? props.projectId : undefined,
      pageNo: pageNo.value,
      pageSize: 24,
    })
    if (request !== seq) return
    items.value = result.list.filter((asset) => props.kinds.includes(asset.kind))
    total.value = Number(result.total)
  } catch (e) {
    if (request === seq) {
      items.value = []
      total.value = 0
      error.value = e instanceof Error ? e.message : '资产加载失败，请重试'
    }
  } finally {
    if (request === seq) loading.value = false
  }
}
async function download(asset: LibraryAsset) {
  downloadingKey.value = key(asset)
  try {
    await downloadStudioFile(asset.url, asset.name || `${asset.kind}-${asset.id}`)
  } finally {
    downloadingKey.value = ''
  }
}
async function remove(asset: LibraryAsset) {
  busyKey.value = key(asset)
  try {
    await removeAsset(asset.id)
    selected.value = selected.value.filter((item) => item.url !== asset.url)
    if (items.value.length === 1 && pageNo.value > 1) pageNo.value -= 1
    await load()
  } catch (e) {
    addToast(e instanceof Error ? e.message : '移除失败', 'error')
  } finally {
    busyKey.value = ''
  }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (uploading.value || !files.length || !isLoggedIn.value) return
  let count = 0
  const session = sessionVersion.value
  const kinds = [...uploadKinds.value]
  uploading.value = true
  for (const file of files) {
    if (disposed || session !== sessionVersion.value || !isLoggedIn.value) break
    try {
      if (!matchesLibraryUpload(file.name, kinds))
        throw new Error(`${file.name} 格式不符合当前类型，仅支持 ${libraryUploadAccept(kinds)}`)
      if (props.uploadMaxSize > 0 && file.size > props.uploadMaxSize)
        throw new Error(`${file.name} 超过 ${props.uploadMaxSize / 1024 / 1024}MB，请压缩后上传`)
      await uploadFile(file, undefined, { saveToLibrary: true })
      count += 1
    } catch (e) {
      addToast(e instanceof Error ? e.message : `${file.name} 上传失败`, 'error')
    }
  }
  uploading.value = false
  if (disposed || session !== sessionVersion.value || !isLoggedIn.value) return
  if (count) {
    scope.value = 'all'
    pageNo.value = 1
    addToast(`已上传 ${count} 个素材`, 'success')
  }
  await load()
}
watch([sessionVersion, isLoggedIn], () => {
  seq += 1
  items.value = []
  selected.value = []
  total.value = 0
  void load()
})
defineExpose({ reload: load })
void load()
</script>

<style src="./asset-library.scss" lang="scss" scoped />
