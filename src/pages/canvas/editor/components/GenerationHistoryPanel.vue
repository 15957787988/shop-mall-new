<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from '../../shims/feedback'
import { generationApi } from '../../api/generationApi'
import { useMediaPager } from '../../composables/useMediaPager'
import { Download, RefreshRight, VideoPlay, Close, Picture } from '../../shims/icons'
import { saveAs } from 'file-saver'
import { createGenerationPreviewLoader } from '../../utils/generationPreviewLoader'

const props = defineProps({
  projectId: { type: [String, Number], required: true },
  refreshKey: { type: Number, default: 0 },
  nodeIds: { type: Array, default: () => [] },
  recoverableVideoTaskIds: { type: Array, default: () => [] },
  useVideo: { type: Function, default: null },
})
const emit = defineEmits(['close', 'locate', 'count'])
const pager = useMediaPager((id, params) => generationApi.list(id, params))
const { items, imageCount, videoCount, loading, error, hasMore } = pager
const preview = ref(null)
const previewState = ref({ status: 'idle', media: null, error: '' })
const playbackError = ref(false)
const mediaReady = ref(false)
const mediaAspect = ref(16 / 9)
function onMediaReady(event) {
  const media = event.target
  const width = media.videoWidth || media.naturalWidth
  const height = media.videoHeight || media.naturalHeight
  if (width > 0 && height > 0) mediaAspect.value = width / height
  mediaReady.value = true
}
const downloadControllers = new Set()
const previewLoader = createGenerationPreviewLoader(generationApi.prepare, (state) => {
  previewState.value = state
  playbackError.value = false
  mediaReady.value = false
  mediaAspect.value = 16 / 9
})
watch(preview, (item) => {
  if (item) previewLoader.open(props.projectId, item)
  else previewLoader.close()
})
function retryPreview() {
  if (preview.value) previewLoader.open(props.projectId, preview.value)
}
const busy = ref(new Set())
const title = '生成记录'
const allCount = computed(() => imageCount.value + videoCount.value)
watch(
  () => props.projectId,
  () => {
    preview.value = null
    previewLoader.close()
    downloadControllers.forEach((controller) => controller.abort())
    pager.reset(String(props.projectId))
  },
  { immediate: true }
)
watch(
  () => props.refreshKey,
  () => pager.refresh()
)
watch(allCount, (value) => {
  emit('count', value)
})
onBeforeUnmount(() => {
  pager.dispose()
  previewLoader.close()
  downloadControllers.forEach((controller) => controller.abort())
})

function time(value) {
  if (!value || !dayjs(value).isValid()) return '时间未知'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}
function hasNode(item) {
  return props.nodeIds.includes(item.nodeId)
}
async function perform(key, action) {
  if (busy.value.has(key)) return
  busy.value.add(key)
  try {
    await action()
  } catch (e) {
    ElMessage.error(e?.message || '操作失败，请重试')
  } finally {
    busy.value.delete(key)
  }
}
function download(item) {
  return perform(`download:${item.id}`, async () => {
    const ext =
      item.kind === 'video'
        ? 'mp4'
        : new URL(item.url, window.location.origin).pathname.match(
            /\.(png|jpe?g|webp|gif)$/i
          )?.[1] || 'png'
    const name = String(item.name || `${item.kind}-${item.taskId || item.id}`)
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 100)
    const projectId = props.projectId
    const controller = new AbortController()
    downloadControllers.add(controller)
    try {
      const blob = await generationApi.download(projectId, item, controller.signal)
      if (controller.signal.aborted) return
      if (!(blob instanceof Blob) || !blob.size || blob.type.includes('application/json')) {
        throw new Error('未获取到文件，请重试')
      }
      saveAs(blob, `${name}.${ext}`)
      ElMessage.success('已开始下载')
    } catch (error) {
      if (!controller.signal.aborted) ElMessage.error(error?.message || '下载失败，请稍后重试')
    } finally {
      downloadControllers.delete(controller)
    }
  })
}
</script>

<template>
  <aside class="history-panel" :aria-label="title" @pointerdown.stop @wheel.stop @keydown.stop>
    <header>
      <h2>{{ title }}</h2>
      <button type="button" class="icon-button" aria-label="关闭生成记录" @click="emit('close')">
        <Close />
      </button>
    </header>
    <div class="history-list" :aria-busy="loading">
      <p v-if="loading && !items.length" class="empty-state" role="status">正在加载…</p>
      <div v-else-if="!items.length && !error" class="empty-state">
        <strong>暂无生成记录</strong>
        <p>在当前画布成功生成的图片和视频会保存在这里。</p>
      </div>
      <div class="history-grid">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="history-card"
          :aria-label="`预览${item.kind === 'video' ? '视频' : '图片'} ${time(item.completedAt)}`"
          @click="preview = item"
        >
          <span class="media-thumb">
            <img
              v-if="item.kind === 'image' || item.poster"
              :src="item.kind === 'image' ? item.url : item.poster"
              alt=""
              referrerpolicy="no-referrer"
              loading="lazy"
            />
            <span v-else class="video-placeholder"><VideoPlay /></span>
            <span class="kind-badge">{{ item.kind === 'video' ? '视频' : '图片' }}</span>
          </span>
          <small>{{ time(item.completedAt) }}</small>
          <small v-if="!hasNode(item)">原节点已删除</small>
        </button>
      </div>
      <div v-if="error" class="load-error" role="alert">
        历史加载失败
        <button type="button" @click="items.length ? pager.loadMore() : pager.refresh()">
          重试
        </button>
      </div>
      <button
        v-else-if="hasMore"
        type="button"
        class="load-more"
        :disabled="loading"
        @click="pager.loadMore()"
      >
        {{ loading ? '加载中…' : '更多记录' }}
      </button>
    </div>
    <footer>仅自己可见 · {{ allCount }} 个成果</footer>
    <a-modal
      :open="!!preview"
      class="history-preview-dialog"
      width="1040px"
      :footer="null"
      :title="preview?.kind === 'video' ? '视频预览' : '图片预览'"
      destroy-on-close
      @cancel="preview = null"
    >
      <div class="preview-heading">
        <span>{{ time(preview?.completedAt) }}</span>
      </div>
      <div v-if="preview" class="history-preview">
        <div
          class="preview-stage"
          :class="{ 'has-error': previewState.status === 'error' || playbackError }"
          :style="{ '--preview-aspect': mediaAspect }"
          :aria-busy="previewState.status === 'loading'"
        >
          <template v-if="previewState.status === 'ready' && !playbackError">
            <video
              v-if="preview.kind === 'video'"
              :key="previewState.media.url"
              :src="previewState.media.url"
              :poster="previewState.media.poster || undefined"
              controls
              playsinline
              preload="metadata"
              @loadedmetadata="onMediaReady"
              @error="playbackError = true"
            />
            <img
              v-else
              :src="previewState.media.url"
              alt="生成成果"
              referrerpolicy="no-referrer"
              @load="onMediaReady"
              @error="playbackError = true"
            />
          </template>
          <div
            v-if="previewState.status === 'error' || playbackError"
            class="preview-state"
            role="alert"
          >
            <VideoPlay v-if="preview.kind === 'video'" /><Picture v-else />
            <strong>{{ playbackError ? '暂时无法预览' : '文件暂不可用' }}</strong>
            <p>
              {{
                playbackError
                  ? previewState.media?.downloadable
                    ? '文件加载失败，请重试；也可以下载到本地查看。'
                    : '文件加载失败，请重试或在新窗口打开原文件。'
                  : previewState.error
              }}
            </p>
            <button type="button" class="preview-button" @click="retryPreview">
              <RefreshRight />重新加载
            </button>
          </div>
          <div
            v-else-if="
              previewState.status === 'loading' || (preview.kind === 'image' && !mediaReady)
            "
            class="preview-state is-loading"
            role="status"
          >
            <span class="loading-dot"></span>
            <p>{{ previewState.status === 'loading' ? '正在准备文件…' : '正在加载预览…' }}</p>
          </div>
        </div>
        <div class="preview-bottom">
          <div class="preview-info">
            <span>{{
              preview.modelName || (preview.kind === 'video' ? '生成视频' : '生成图片')
            }}</span>
            <p v-if="previewState.status === 'ready' && !previewState.media.downloadable">
              此历史文件尚未转存，可预览或打开原文件。
            </p>
            <p v-else>删除节点后仍保留记录。删除原作品或画布后，文件可能无法访问。</p>
          </div>
          <div class="preview-actions">
            <a
              v-if="previewState.status === 'ready' && !previewState.media.downloadable"
              class="preview-button"
              :href="previewState.media.url"
              target="_blank"
              rel="noopener noreferrer"
              >打开原文件</a
            >
            <button
              v-if="
                preview.kind === 'video' &&
                hasNode(preview) &&
                recoverableVideoTaskIds.includes(String(preview.taskId))
              "
              type="button"
              class="preview-button"
              :disabled="
                previewState.status !== 'ready' || busy.has(`use:${preview.id}`) || !useVideo
              "
              @click="
                perform(`use:${preview.id}`, () => useVideo({ ...preview, ...previewState.media }))
              "
            >
              使用此视频
            </button>
            <button
              type="button"
              class="preview-button is-primary"
              :disabled="
                previewState.status !== 'ready' ||
                !previewState.media?.downloadable ||
                busy.has(`download:${preview.id}`)
              "
              @click="download(preview)"
            >
              <Download />{{ busy.has(`download:${preview.id}`) ? '下载中…' : '下载文件' }}
            </button>
          </div>
        </div>
      </div>
    </a-modal>
  </aside>
</template>

<style lang="scss" scoped>
.history-panel {
  position: absolute;
  left: 92px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 12;
  width: 272px;
  height: min(84vh, 760px);
  display: flex;
  flex-direction: column;
  color: var(--consumer-text, #f1f0ed);
  background: #292927;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}
h2 {
  font-size: 16px;
  margin: 0;
}
button {
  font: inherit;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid var(--consumer-muted, #aaa9a4);
  outline-offset: 2px;
}
.icon-button {
  background: transparent;
  border: 0;
  color: var(--consumer-muted, #aaa9a4);
  font-size: 22px;
}
.history-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
}
.history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 12px;
}
.history-card {
  min-width: 0;
  padding: 0;
  text-align: left;
  background: transparent;
  border: 0;
  color: var(--consumer-muted, #aaa9a4);
}
.media-thumb {
  position: relative;
  display: block;
  height: 126px;
  background: var(--consumer-raised, #292927);
  border-radius: 7px;
  overflow: hidden;
}
.media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.kind-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  padding: 1px 5px;
  background: var(--consumer-panel, #20201f);
  color: var(--consumer-text, #f1f0ed);
  border-radius: 3px;
  font-size: 12px;
}
.video-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--consumer-muted, #aaa9a4);
}
.history-card small {
  display: block;
  font-size: 12px;
  margin-top: 5px;
}
.empty-state {
  text-align: center;
  color: var(--consumer-muted, #aaa9a4);
  padding: 30px 5px;
  font-size: 13px;
}
footer {
  padding: 12px 16px;
  border-top: 1px solid var(--consumer-line, #363633);
  color: var(--consumer-muted, #aaa9a4);
  font-size: 12px;
}
.load-error {
  color: #f4b8b8;
  margin-top: 12px;
}
.load-error button,
.load-more {
  background: transparent;
  border: 0;
  color: var(--consumer-muted, #aaa9a4);
  padding: 8px;
}
.load-more {
  display: block;
  margin: 12px auto 0;
}
.icon-button svg {
  width: 20px;
  height: 20px;
}
.video-placeholder svg {
  width: 28px;
  height: 28px;
}
.preview-heading {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding-right: 32px;
}
.preview-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.preview-heading span {
  color: var(--consumer-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.preview-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: auto;
  aspect-ratio: var(--preview-aspect);
  max-height: min(58vh, 560px);
  min-height: 200px;
  background: #0b0c0e;
  border-radius: 10px;
  overflow: hidden;
}
.preview-stage img,
.preview-stage video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.preview-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  text-align: center;
  color: var(--consumer-muted);
}
.preview-state > svg {
  width: 36px;
  height: 36px;
  margin-bottom: 16px;
}
.preview-state strong {
  font-size: 16px;
  font-weight: 500;
  color: var(--consumer-text);
}
.preview-state p {
  font-size: 13px;
  line-height: 1.6;
  max-width: 42ch;
  margin: 8px 0 20px;
}
.preview-state.is-loading {
  pointer-events: none;
}
.loading-dot {
  width: 8px;
  height: 8px;
  background: var(--consumer-muted);
  border-radius: 50%;
}
.preview-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 20px;
}
.preview-info {
  min-width: 0;
}
.preview-info > span {
  color: var(--consumer-text);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.preview-info p {
  color: var(--consumer-muted);
  font-size: 12px;
  line-height: 1.6;
  margin: 5px 0 0;
}
.preview-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.preview-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid var(--consumer-line);
  border-radius: 8px;
  background: var(--consumer-raised);
  color: var(--consumer-text);
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  text-decoration: none;
}
.preview-button svg {
  width: 16px;
  height: 16px;
}
.preview-button:hover:not(:disabled) {
  background: var(--consumer-line);
}
.preview-button.is-primary {
  background: var(--consumer-accent);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}
.preview-button.is-primary:hover:not(:disabled) {
  background: var(--el-color-primary-dark-2);
}
.preview-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
:global(.history-preview-dialog.el-dialog) {
  padding: 22px;
  max-height: calc(100dvh - 32px);
  overflow: auto;
}
:global(.history-preview-dialog .el-dialog__header) {
  padding-bottom: 18px;
}
@media (max-width: 600px) {
  .preview-bottom {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
    padding-top: 16px;
  }
  .preview-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .preview-stage {
    max-height: min(48vh, 400px);
    min-height: 160px;
  }
  .preview-stage.has-error {
    min-height: 260px;
  }
  :global(.history-preview-dialog.el-dialog) {
    padding: 16px;
  }

  .history-panel {
    left: 68px;
    width: calc(100% - 80px);
    max-width: 272px;
  }
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
