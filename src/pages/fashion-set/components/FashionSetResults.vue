<template>
  <section class="fashion-results">
    <header v-if="!hideHeading" class="fashion-results__heading">
      <h2>{{ title || '服装组图记录' }}</h2>
      <Button :loading="loading" @click="load(1)"><ReloadOutlined />刷新</Button>
    </header>
    <Alert v-if="error" type="warning" show-icon :message="error" class="fashion-results__alert">
      <template #action
        ><Button size="small" :loading="loading" @click="load(1)">重试</Button></template
      >
    </Alert>
    <CreationDemo v-if="!isLoggedIn" tool="fashion-set" />
    <div v-else-if="loading && !works.length" class="fashion-results__loading">
      <GenerationLoading label="正在读取作品…" />
    </div>
    <CreationDemo v-else-if="!works.length && !error" tool="fashion-set" />
    <template v-else>
      <article v-for="group in groups" :key="group.id" class="fashion-group">
        <header class="fashion-group__header">
          <div class="fashion-group__title">
            <time>{{ formatTime(group.works[0].createTime) }}</time>
            <strong>{{ group.works[0].creationTitle || '服装组图' }}</strong>
            <StudioParams :work="group.works[0]" inline :show-points="false" />
          </div>
          <Button
            size="small"
            :loading="downloadingGroup === group.id"
            :disabled="loading || !!downloadingGroup || !group.works.some((work) => !!work.picUrl)"
            @click="downloadGroup(group)"
            ><DownloadOutlined />下载</Button
          >
        </header>
        <div class="fashion-group__grid">
          <div v-for="(url, index) in group.originals" :key="url" class="fashion-image">
            <button type="button" class="fashion-image__media" @click="openOriginal(group, index)">
              <img :src="url" alt="商品原图" loading="lazy" />
              <span class="fashion-image__label"
                >原图{{ group.originals.length > 1 ? ` ${index + 1}` : '' }}</span
              >
            </button>
          </div>
          <div v-for="work in group.works" :key="work.id" class="fashion-image">
            <button
              type="button"
              class="fashion-image__media"
              :disabled="pending(work) || !work.picUrl"
              :aria-busy="pending(work)"
              @click="openPreview(group, work)"
            >
              <span v-if="pending(work)" class="fashion-image__placeholder"><GenerationLoading /></span>
              <img
                v-else-if="work.picUrl"
                :src="work.picUrl"
                :alt="work.creationLabel || '生成图片'"
                loading="lazy"
              />
              <span v-else class="fashion-image__placeholder" :title="work.errorMessage">
                <WarningOutlined />
                {{ work.status === 30 ? '生成失败' : '结果暂不可用' }}
              </span>
              <span class="fashion-image__label">{{ work.creationLabel || '生成图片' }}</span>
            </button>
            <div class="fashion-image__actions">
              <button
                type="button"
                :aria-label="`下载${work.creationLabel || '图片'}`"
                title="下载"
                :disabled="pending(work) || !work.picUrl || downloading === work.id"
                @click="download(work)"
              >
                <DownloadOutlined />
              </button>
              <button
                type="button"
                :aria-label="`删除${work.creationLabel || '图片'}`"
                title="删除"
                :disabled="pending(work)"
                @click="remove(work)"
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
        </div>
      </article>
    </template>
    <ResultPagination
      :current="page"
      :total="total"
      :page-size="10"
      :loading="loading"
      @change="load"
    />
    <ImagePreviewGroup
      v-if="viewerVisible"
      :preview="{
        visible: viewerVisible,
        current: viewerIndex,
        onVisibleChange: (visible: boolean) => {
          viewerVisible = visible
        },
        onChange: (current: number) => {
          viewerIndex = current
        },
      }"
    >
      <Image
        v-for="(url, index) in previewUrls"
        :key="`${index}-${url}`"
        :src="url"
        class="fashion-preview-source"
      />
    </ImagePreviewGroup>
  </section>
</template>

<script setup lang="ts">
import GenerationLoading from '@/components/ui/GenerationLoading.vue'
import CreationDemo from '@/components/CreationDemo.vue'
import ResultPagination from '@/components/ui/ResultPagination.vue'
import StudioParams from '@/components/studio/StudioParams.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Alert, Button, Image, Modal } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import {
  deleteStudioWork,
  downloadStudioFile,
  getStudioWork,
  pageStudioWorks,
  studioFileName,
  type StudioWork,
} from '@/pages/fashion-set/api'

interface Props {
  hideHeading?: boolean
  title?: string
  revision?: number
}
interface ResultGroup {
  id: string
  works: StudioWork[]
  originals: string[]
}
const ImagePreviewGroup = Image.PreviewGroup
const props = defineProps<Props>()
const { isLoggedIn, userInfo } = useAuth()
const { addToast } = useToast()
const works = ref<StudioWork[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const viewerVisible = ref(false)
const viewerIndex = ref(0)
const previewUrls = ref<string[]>([])
const viewerGroupId = ref('')
const downloading = ref<number>()
const downloadingGroup = ref('')
let version = 0
let timer: ReturnType<typeof setTimeout> | undefined
const pending = (work: StudioWork) => work.status !== 20 && work.status !== 30
const groups = computed(() => {
  const batches = new Map<string, ResultGroup>()
  for (const work of works.value) {
    // 只用真实批次分组；旧记录缺少批次时独立展示，不按相同标题或时间误合并。
    const id = work.creationBatchId ? `batch:${work.creationBatchId}` : `work:${work.id}`
    if (!batches.has(id)) batches.set(id, { id, works: [], originals: [] })
    batches.get(id)!.works.push(work)
  }
  return [...batches.values()]
    .map((group) => {
      group.works.sort(
        (a, b) => (a.creationIndex ?? a.id) - (b.creationIndex ?? b.id) || a.id - b.id
      )
      group.originals = [
        ...new Set(group.works.flatMap((work) => work.referenceImageUrls || [])),
      ].slice(0, 3)
      return group
    })
    .sort(
      (a, b) =>
        Math.max(...b.works.map((work) => work.id)) - Math.max(...a.works.map((work) => work.id))
    )
})
function formatTime(value: StudioWork['createTime']) {
  if (!value) return ''
  const date = Array.isArray(value)
    ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}
function groupPreviewUrls(group: ResultGroup) {
  return [
    ...group.originals,
    ...group.works.flatMap((work) => (work.picUrl ? [work.picUrl] : [])),
  ]
}
function openAt(group: ResultGroup, index: number) {
  const urls = groupPreviewUrls(group)
  if (!urls[index]) return
  viewerGroupId.value = group.id
  previewUrls.value = urls
  viewerIndex.value = index
  viewerVisible.value = true
}
function openOriginal(group: ResultGroup, index: number) {
  openAt(group, index)
}
function openPreview(group: ResultGroup, work: StudioWork) {
  const generatedIndex = group.works.filter((item) => item.picUrl).findIndex((item) => item.id === work.id)
  if (generatedIndex < 0) return
  openAt(group, group.originals.length + generatedIndex)
}
function closePreview() {
  viewerVisible.value = false
}
function schedule() {
  clearTimeout(timer)
  if (works.value.some(pending) && isLoggedIn.value) timer = setTimeout(poll, 5000)
}
async function poll() {
  const token = version
  try {
    const updates = await Promise.all(
      works.value.filter(pending).map((work) => getStudioWork('image', work.id))
    )
    if (token !== version) return
    for (const item of updates)
      if (item) works.value = works.value.map((work) => (work.id === item.id ? item : work))
    error.value = ''
    schedule()
  } catch {
    if (token === version) error.value = '状态更新中断，请点击刷新核对原任务；无需重新提交生成。'
  }
}
async function load(no = 1) {
  const token = ++version
  clearTimeout(timer)
  error.value = ''
  if (!isLoggedIn.value) {
    works.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const result = await pageStudioWorks('image', no, 10, 'fashion-set')
    if (token !== version) return
    const lastPage = Math.max(1, Math.ceil(result.total / 10))
    if (no > lastPage) {
      await load(lastPage)
      return
    }
    works.value = result.list || []
    total.value = result.total || 0
    page.value = no
    schedule()
  } catch (e) {
    if (token === version) error.value = e instanceof Error ? e.message : '作品加载失败，请重试'
  } finally {
    if (token === version) loading.value = false
  }
}
async function download(work: StudioWork) {
  if (!work.picUrl) return
  downloading.value = work.id
  try {
    await downloadStudioFile(work.picUrl, studioFileName('image', work.id, work.picUrl))
  } catch (e) {
    addToast(e instanceof Error ? e.message : '下载失败，请重试', 'error')
  } finally {
    downloading.value = undefined
  }
}
async function downloadGroup(group: ResultGroup) {
  if (loading.value || downloadingGroup.value) return
  downloadingGroup.value = group.id
  try {
    const token = version
    for (const work of group.works.filter((work) => !!work.picUrl)) {
      if (token !== version) return
      await downloadStudioFile(work.picUrl!, studioFileName('image', work.id, work.picUrl!))
    }
  } catch (e) {
    addToast(e instanceof Error ? e.message : '整组下载中断，请重试未保存的图片', 'error')
  } finally {
    downloadingGroup.value = ''
  }
}
function remove(work: StudioWork) {
  Modal.confirm({
    title: '删除这张图片？',
    content: '不会删除组内其他图片或已下载的文件。',
    okText: '删除',
    cancelText: '取消',
    async onOk() {
      const token = version
      try {
        await deleteStudioWork('image', work.id)
        if (token !== version) return
        const groupId = work.creationBatchId ? `batch:${work.creationBatchId}` : `work:${work.id}`
        if (viewerGroupId.value === groupId) closePreview()
        await load(page.value)
      } catch (e) {
        if (token === version) addToast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
  })
}
watch(
  [() => props.revision, isLoggedIn, () => userInfo.value?.id],
  () => {
    works.value = []
    total.value = 0
    page.value = 1
    closePreview()
    load(1)
  }
)
onMounted(() => { void load(1) })
onBeforeUnmount(() => {
  version++
  clearTimeout(timer)
})
</script>

<style scoped lang="scss">
.fashion-results {
  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  &__heading,
  &__alert {
    margin-bottom: var(--creation-group-gap);
  }
  &__heading h2 {
    margin: 0;
    font-size: 20px;
  }
  &__loading {
    min-height: 400px;
    display: grid;
    place-content: center;
    text-align: center;
    color: var(--color-ink-muted);
  }
}
.fashion-group {
  padding: 16px 20px 20px;
  margin-bottom: var(--creation-group-gap);
  border-radius: 12px;
  background: var(--color-surface-0);
  box-shadow: var(--shadow-soft);
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: var(--creation-group-gap);
  }
  &__title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }
  &__title time {
    font-size: 13px;
    color: var(--color-ink-secondary);
  }
  &__title strong {
    font-size: 15px;
    color: var(--color-ink-primary);
    overflow-wrap: anywhere;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
    gap: var(--creation-item-gap);
  }
}
.fashion-image {
  position: relative;
  min-width: 0;
  &__media {
    display: block;
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: 0;
    border-radius: 12px;
    overflow: hidden;
    background: var(--color-surface-2);
    cursor: zoom-in;
  }
  &__media:disabled {
    cursor: default;
  }
  &__media img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  &__label {
    position: absolute;
    left: 8px;
    bottom: 8px;
    max-width: calc(100% - 16px);
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--color-media-veil);
    color: var(--color-on-media);
    font-size: 12px;
    text-align: left;
    overflow-wrap: anywhere;
  }
  &__placeholder {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  &__actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  &:hover &__actions,
  &:focus-within &__actions {
    opacity: 1;
  }
  &__actions button {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 6px;
    background: var(--color-media-veil);
    color: var(--color-on-media);
    cursor: pointer;
  }
  &__actions button:disabled {
    opacity: 0.45;
    cursor: default;
  }
}
.fashion-preview-source {
  display: none;
}
@media (hover: none) {
  .fashion-image__actions {
    opacity: 1;
  }
}
@media (max-width: 720px) {
  .fashion-group {
    padding: 12px;
  }
  .fashion-group__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
