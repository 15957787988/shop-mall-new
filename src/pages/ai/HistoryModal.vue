<template>
  <Modal
    v-model:open="open"
    :title="kind === 'image' ? '图片历史' : '视频历史'"
    :footer="null"
    width="960px"
    destroy-on-close
  >
    <Spin :spinning="loading">
      <div v-if="!loading && loadError" class="hist__empty">{{ loadError }}</div>
      <div v-else-if="!loading && !list.length" class="hist__empty">暂无历史</div>
      <div v-else class="hist__grid">
        <article v-for="item in list" :key="item.id" class="hist__card">
          <div class="hist__media">
            <Image
              v-if="kind === 'image' && mediaUrl(item)"
              :src="mediaUrl(item)"
              :alt="item.prompt || '生成图片'"
            />
            <button
              v-else-if="kind === 'video' && mediaUrl(item)"
              type="button"
              class="hist__play"
              @click="openPreview(item)"
            >
              <img v-if="poster(item)" :src="poster(item)" alt="" />
              <PlayCircleOutlined />
            </button>
            <span v-else class="hist__wait">{{ statusText(item) }}</span>
          </div>
          <p class="hist__prompt">{{ item.prompt || '无提示词' }}</p>
          <div class="hist__bar">
            <time>{{ formatTime(item.createTime) }}</time>
            <button
              type="button"
              class="hist__download"
              :disabled="!mediaUrl(item) || downloadingId === item.id"
              @click="handleDownload(item)"
            >
              <DownloadOutlined />
              下载
            </button>
          </div>
        </article>
      </div>
      <Pagination
        v-if="total > 0"
        class="hist__pager"
        :current="pageNo"
        :page-size="PAGE_SIZE"
        :total="total"
        :show-size-changer="false"
        :show-total="showTotal"
        @change="load"
      />
    </Spin>
  </Modal>

  <Modal
    v-model:open="previewOpen"
    title="预览"
    :footer="null"
    width="720px"
    destroy-on-close
  >
    <video v-if="previewItem && mediaUrl(previewItem)" :src="mediaUrl(previewItem)" controls autoplay playsinline />
    <div v-if="previewItem" class="hist__preview-actions">
      <Button type="primary" :loading="downloadingId === previewItem.id" @click="handleDownload(previewItem)">
        下载
      </Button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DownloadOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import { Button, Image, Modal, Pagination, Spin } from 'ant-design-vue'
import { useToast } from '@/composables/useToast'
import {
  downloadStudioFile,
  pageStudioWorks,
  studioFileName,
  type StudioKind,
  type StudioWork,
} from './api'

const PAGE_SIZE = 30

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  kind: StudioKind
}>()

const { addToast } = useToast()

const list = ref<StudioWork[]>([])
const total = ref(0)
const pageNo = ref(1)
const loading = ref(false)
const loadError = ref('')
const downloadingId = ref<number>()
const previewOpen = ref(false)
const previewItem = ref<StudioWork>()
let seq = 0

function mediaUrl(item: StudioWork) {
  if (props.kind === 'video') return item.status === 20 && item.videoUrl ? item.videoUrl : ''
  if (item.picUrl) return item.picUrl
  const first = item.picUrls?.[0]
  if (!first) return ''
  return typeof first === 'string' ? first : first.url || ''
}

function poster(item: StudioWork) {
  return item.previewUrl || item.lastFrameUrl || ''
}

function statusText(item: StudioWork) {
  if (item.status === 30) return '失败'
  if (item.status === 0 || item.status === 10 || item.status === 11 || item.status === 12) return '生成中'
  return '暂无结果'
}

function formatTime(value: StudioWork['createTime']) {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    const date = new Date(value)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`
  }
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0] = value
    const p = (n: number) => String(n).padStart(2, '0')
    return `${y}-${p(m)}-${p(d)} ${p(h)}:${p(min)}`
  }
  return value.replace('T', ' ').slice(0, 16)
}

async function load(page: number) {
  const current = ++seq
  loading.value = true
  loadError.value = ''
  try {
    const pageData = await pageStudioWorks(props.kind, page, PAGE_SIZE)
    if (current !== seq) return
    list.value = pageData.list ?? []
    total.value = pageData.total ?? 0
    pageNo.value = page
  } catch (error: unknown) {
    if (current !== seq) return
    list.value = []
    total.value = 0
    const msg = error instanceof Error ? error.message : '历史加载失败'
    loadError.value = msg.includes('登录') ? '请先登录' : msg
    addToast(loadError.value, 'error')
  } finally {
    if (current === seq) loading.value = false
  }
}

function showTotal(count: number) {
  return `共 ${count} 条`
}

function openPreview(item: StudioWork) {
  previewItem.value = item
  previewOpen.value = true
}

async function handleDownload(item: StudioWork) {
  const url = mediaUrl(item)
  if (!url || downloadingId.value) return
  downloadingId.value = item.id
  try {
    await downloadStudioFile(url, studioFileName(props.kind, item.id, url))
  } catch (error: unknown) {
    addToast(error instanceof Error ? error.message : '下载失败', 'error')
  } finally {
    downloadingId.value = undefined
  }
}

watch(open, (visible) => {
  previewOpen.value = false
  if (visible) void load(1)
})
</script>

<style scoped lang="scss">
.hist__empty {
  padding: 48px 0;
  text-align: center;
  color: var(--color-ink-muted);
}

.hist__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  max-height: 62vh;
  overflow: auto;
}

.hist__card {
  min-width: 0;
}

.hist__media {
  display: flex;
  height: 120px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background: var(--color-surface-2);

  :deep(.ant-image),
  :deep(.ant-image-img) {
    width: 100%;
    height: 120px;
    object-fit: cover;
  }
}

.hist__play {
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .anticon {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 28px;
    color: #fff;
    transform: translate(-50%, -50%);
  }
}

.hist__wait {
  font-size: 12px;
  color: var(--color-ink-muted);
}

.hist__prompt {
  margin: 6px 0 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-ink-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hist__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-ink-muted);
}

.hist__download {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--color-creative-violet);
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.hist__pager {
  margin-top: 16px;
  text-align: right;
}

.hist__preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

video {
  display: block;
  width: 100%;
  max-height: 60vh;
  background: #000;
}

@media (max-width: 960px) {
  .hist__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
