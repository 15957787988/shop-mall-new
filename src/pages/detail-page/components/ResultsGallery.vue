<template>
  <section class="results-gallery">
    <header v-if="!hideHeading && toolCode !== 'detail-page'" class="results-gallery__head">
      <div>
        <h2>
          {{ title || '创作记录' }} <small>{{ total }}</small>
        </h2>
        <p>任务保存在账户中，离开页面后可继续查看。</p>
      </div>
      <Button :loading="loading" @click="load(1)"><ReloadOutlined />刷新</Button>
    </header>
    <Alert v-if="error" type="warning" show-icon :message="error" class="results-gallery__alert">
      <template #action><Button size="small" :loading="loading" @click="load(1)">重试</Button></template>
    </Alert>
    <div v-if="!isLoggedIn" class="results-gallery__empty">
      <FolderOpenOutlined />
      <h3>把每一次创作留在这里</h3>
      <p>登录后可查看和下载你的作品。</p>
      <Button @click="openLogin()">登录账户</Button>
    </div>
    <div v-else-if="loading && !works.length" class="results-gallery__empty">
      <Spin />
      <p>正在读取作品…</p>
    </div>
    <div v-else-if="!works.length && !error" class="results-gallery__empty">
      <PictureOutlined />
      <h3>好作品，从这里开始</h3>
      <p>上传素材、选择输出内容，生成结果会显示在这里。</p>
    </div>
    <DetailPageResults
      v-else-if="toolCode === 'detail-page'"
      :works="works"
      @preview="preview = $event"
    />
    <div v-else class="results-gallery__grid">
      <article v-for="work in works" :key="work.id" class="result-tile">
        <button
          class="result-tile__media"
          type="button"
          :disabled="!src(work)"
          @click="preview = work"
        >
          <img
            v-if="kind === 'image' && src(work)"
            :src="src(work)"
            :alt="work.creationTitle || work.creationLabel || '生成图片'"
            loading="lazy"
          />
          <template v-else-if="kind === 'video' && src(work)"
            ><video
              :src="src(work)"
              :poster="work.previewUrl"
              preload="metadata"
              muted
              playsinline /><PlayCircleOutlined class="result-tile__play"
          /></template>
          <span v-if="kind === 'video' && work.duration" class="result-tile__duration">{{ work.duration }}s</span>
          <div v-if="!src(work)" class="result-tile__placeholder">
            <Spin v-if="pending(work)" /><WarningOutlined v-else /><span>{{
              pending(work) ? '正在生成' : '生成失败'
            }}</span>
          </div>
        </button>
        <div class="result-tile__info">
          <div class="result-tile__title">
            <strong>{{ work.creationTitle || work.creationLabel || work.modelName || work.model || '创作作品' }}</strong
            ><span :class="['result-tile__state', { failed: work.status === 30 }]">{{
              pending(work) ? '处理中' : work.status === 20 ? '已完成' : '失败'
            }}</span>
          </div>
          <p v-if="work.prompt" class="result-tile__description">{{ work.prompt }}</p>
          <p class="result-tile__date">{{ formatTime(work.createTime) }} · #{{ work.id }}</p>
          <p v-if="work.errorMessage" class="result-tile__error">{{ work.errorMessage }}</p>
          <div class="result-tile__actions">
            <button
              type="button"
              :disabled="!src(work) || downloading === work.id"
              @click="download(work)"
            >
              <DownloadOutlined />{{ downloading === work.id ? '下载中' : '下载' }}</button
            ><button
              type="button"
              :disabled="pending(work)"
              @click="remove(work)"
              aria-label="删除作品"
            >
              <DeleteOutlined />
            </button>
          </div>
        </div>
      </article>
    </div>
    <AutoLoadMore :has-more="toolCode !== 'detail-page' && works.length < total" :loading="loading" :count="works.length" @load="load(page + 1)" />
    <Modal
      :open="!!preview"
      :footer="null"
      width="1080px"
      centered
      destroy-on-close
      wrap-class-name="studio-preview"
      @cancel="preview = undefined"
    >
      <div v-if="preview" class="studio-preview__body">
        <div class="studio-preview__stage">
          <img v-if="kind === 'image'" :src="src(preview)" alt="生成图片" /><video
            v-else
            :src="src(preview)"
            controls
            playsinline
          />
          <div class="studio-preview__bar">
            <button type="button" @click="download(preview)"><DownloadOutlined />下载</button>
          </div>
        </div>
        <aside class="studio-preview__prompt">
          <h3>{{ preview.creationLabel || '作品详情' }}</h3>
          <div class="studio-preview__text">{{ preview.prompt }}</div>
          <StudioParams :work="preview" inset /><StudioReferences :work="preview" />
        </aside>
      </div>
    </Modal>
  </section>
</template>
<script setup lang="ts">
import AutoLoadMore from '@/components/ui/AutoLoadMore.vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { Alert, Button, Modal, Spin } from 'ant-design-vue'
import { DeleteOutlined, DownloadOutlined, FolderOpenOutlined, PictureOutlined, PlayCircleOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { deleteStudioWork, downloadStudioFile, getStudioWork, pageStudioWorks, studioFileName, type StudioKind, type StudioWork } from '@/service/api/studio'
import DetailPageResults from './DetailPageResults.vue'
import StudioParams from '@/components/studio/StudioParams.vue'
import StudioReferences from '@/components/studio/StudioReferences.vue'

interface Props { hideHeading?: boolean; kind: StudioKind; toolCode?: string; title?: string; revision?: number }
const props = defineProps<Props>()
const { isLoggedIn, openLogin, userInfo } = useAuth()
const { addToast } = useToast()
const works = ref<StudioWork[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const preview = ref<StudioWork>()
const downloading = ref<number>()
let version = 0
let timer: ReturnType<typeof setTimeout> | undefined
const pending = (work: StudioWork) => work.status !== 20 && work.status !== 30
const src = (work: StudioWork) => props.kind === 'video' ? work.videoUrl || '' : work.picUrl || ''
function formatTime(value: StudioWork['createTime']) {
  if (!value) return ''
  const date = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0) : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}
function schedule() {
  clearTimeout(timer)
  if (!works.value.some(pending) || !isLoggedIn.value) return
  timer = setTimeout(poll, 5000)
}
async function poll() {
  const token = version
  const kind = props.kind
  try {
    const updates = await Promise.all(works.value.filter(pending).map(work => getStudioWork(kind, work.id)))
    if (token !== version) return
    for (const item of updates) if (item) works.value = works.value.map(work => work.id === item.id ? item : work)
    error.value = ''
    schedule()
  } catch {
    if (token === version) error.value = '状态更新中断，请点击刷新核对原任务；无需重新提交生成。'
  }
}
async function load(no = 1) {
  if (loading.value && no > 1) return
  const token = ++version
  clearTimeout(timer)
  error.value = ''
  if (!isLoggedIn.value) { works.value = []; total.value = 0; loading.value = false; return }
  loading.value = true
  try {
    const size = props.toolCode === 'detail-page' ? 100 : 12
    const result = await pageStudioWorks(props.kind, no, size, props.toolCode)
    if (token !== version) return
    if (props.toolCode === 'detail-page') {
      for (let next = 2; result.list.length < result.total; next++) {
        const more = await pageStudioWorks(props.kind, next, size, props.toolCode)
        if (token !== version) return
        if (!more.list?.length) break
        result.list.push(...more.list)
      }
    }
    if (token !== version) return
    works.value = no === 1 ? (result.list || []) : [...new Map([...works.value, ...(result.list || [])].map(work => [work.id, work])).values()]
    total.value = result.list?.length ? (result.total || 0) : works.value.length
    page.value = no
    schedule()
  } catch (e) {
    if (token === version) error.value = e instanceof Error ? e.message : '作品加载失败，请重试'
  } finally { if (token === version) loading.value = false }
}
async function download(work: StudioWork) {
  downloading.value = work.id
  try { await downloadStudioFile(src(work), studioFileName(props.kind, work.id, src(work))) }
  catch (e) { addToast(e instanceof Error ? e.message : '下载失败，请重试', 'error') }
  finally { downloading.value = undefined }
}
function remove(work: StudioWork) {
  Modal.confirm({ title: '删除这条作品记录？', content: '不会删除已下载的文件。', okText: '删除', cancelText: '取消', async onOk() {
    try { await deleteStudioWork(props.kind, work.id); await load(1) }
    catch (e) { addToast(e instanceof Error ? e.message : '删除失败', 'error') }
  } })
}
watch([() => props.kind, () => props.toolCode, () => props.revision, isLoggedIn, () => userInfo.value?.id], () => { works.value = []; preview.value = undefined; load(1) }, { immediate: true })
onBeforeUnmount(() => { version++; clearTimeout(timer) })
</script>
<style scoped lang="scss">
.results-gallery {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
    h2 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.025em;
    }
    small {
      color: var(--color-ink-muted);
      font-size: 13px;
      margin-left: 8px;
    }
    p {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--color-ink-secondary);
    }
  }
  &__alert {
    margin-bottom: 18px;
  }
  &__empty {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 30px;
    border: 1px dashed var(--color-border-whisper);
    border-radius: 20px;
    background: var(--color-surface-0);
    > .anticon {
      font-size: 44px;
      color: var(--color-accent-border);
      margin-bottom: 15px;
    }
    h3 {
      font-size: 19px;
      margin: 0 0 8px;
    }
    p {
      color: var(--color-ink-secondary);
      font-size: 13px;
    }
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
    gap: 20px;
  }
  &__pages {
    margin-top: 26px;
    text-align: center;
  }
}
.result-tile {
  min-width: 0;
  border: 0;
  background: var(--color-surface-0);
  border-radius: 15px;
  overflow: hidden;
  &__media {
    display: block;
    position: relative;
    width: 100%;
    aspect-ratio: 9 / 16;
    padding: 0;
    border: 0;
    background: var(--color-surface-2);
    cursor: zoom-in;
    img,
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    &:disabled {
      cursor: default;
    }
  }
  &__placeholder {
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--color-ink-muted);
    font-size: 13px;
  }
  &__play {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    color: var(--color-surface-0);
    filter: drop-shadow(0 1px 4px var(--color-ink-primary));
    font-size: 40px;
  }
  &__info {
    padding: 16px;
  }
  &__title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
    }
  }
  &__state {
    color: var(--color-success-mint);
    font-size: 11px;
    flex-shrink: 0;
    &.failed {
      color: var(--color-danger);
    }
  }
  &__duration {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 3px 8px;
    border-radius: 8px;
    background: var(--color-media-veil);
    color: var(--color-on-media);
  }
  &__description {
    display: -webkit-box;
    margin: 8px 0 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    /* autoprefixer: ignore next */
    -webkit-box-orient: vertical;
    font-size: 12px;
    color: var(--color-ink-muted);
    overflow-wrap: anywhere;
  }
  &__date {
    color: var(--color-ink-muted);
    font-size: 11px;
    margin: 8px 0 14px;
  }
  &__error {
    color: var(--color-danger);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  &__actions {
    display: flex;
    justify-content: space-between;
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 0;
      color: var(--color-creative-violet);
      cursor: pointer;
      font-size: 12px;
      padding: 4px 0;
    }
    button:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}
@media (max-width: 540px) {
  .results-gallery__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .result-tile__info {
    padding: 10px;
  }
}
</style>
<style scoped lang="scss">
.studio-preview {
  &__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    max-height: 84vh;
    overflow: auto;
  }
  &__stage {
    min-width: 0;
    background: var(--color-ink-primary);
    img,
    video {
      width: 100%;
      height: 65vh;
      object-fit: contain;
    }
  }
  &__bar {
    padding: 12px;
    text-align: right;
    button {
      border: 0;
      background: var(--color-media-control);
      color: var(--color-on-media);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
  }
  &__prompt {
    overflow: auto;
    h3 {
      padding: 16px;
      margin: 0;
    }
  }
  &__text {
    max-height: 300px;
    overflow: auto;
    padding: 0 16px 20px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 13px;
  }
}
@media (max-width: 720px) {
  .studio-preview__body {
    grid-template-columns: 1fr;
  }
  .studio-preview__stage img,
  .studio-preview__stage video {
    height: 42vh;
  }
}
</style>
