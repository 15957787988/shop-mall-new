<template>
  <section class="results-gallery">
    <header v-if="!hideHeading" class="results-gallery__head">
      <div>
        <h2>
          {{ title || '创作记录' }} <small>{{ total }}</small>
        </h2>
        <p>任务保存在账户中，离开页面后可继续查看。</p>
      </div>

    </header>
    <Alert v-if="error" type="warning" show-icon :message="error" class="results-gallery__alert">
      <template #action
        ><Button size="small" :loading="loading" @click="load(1)">重试</Button></template
      >
    </Alert>
    <div v-if="!isLoggedIn" class="results-gallery__empty">
      <FolderOpenOutlined />
      <h3>把每一次创作留在这里</h3>
      <p>登录后可查看和下载你的作品。</p>
      <Button @click="openLogin()">登录账户</Button>
    </div>
    <div v-else-if="loading && !works.length" class="results-gallery__empty">
      <GenerationLoading label="正在读取作品…" />
    </div>
    <div v-else-if="!works.length && !error" class="results-gallery__empty">
      <PictureOutlined />
      <h3>好作品，从这里开始</h3>
      <p>上传素材、选择输出内容，生成结果会显示在这里。</p>
    </div>
    <div v-else class="results-gallery__grid">
      <article v-for="work in works" :key="work.id" class="result-tile">
        <button
          class="result-tile__media"
          :aria-busy="pending(work)"
          type="button"
          :disabled="pending(work) || !src(work)"
          @click="preview = work"
        >
          <div v-if="pending(work)" class="result-tile__placeholder">
            <GenerationLoading />
          </div>
          <img
            v-else-if="src(work)"
            :src="src(work)"
            :alt="work.creationTitle || work.creationLabel || '生成图片'"
            loading="lazy"
          />
          <div v-if="!pending(work) && !src(work)" class="result-tile__placeholder">
            <WarningOutlined /><span>{{ work.status === 30 ? '生成失败' : '结果暂不可用' }}</span>
          </div>
        </button>
        <div class="result-tile__info">
          <div class="result-tile__actions media-actions">
            <button class="media-action" aria-label="下载" title="下载"
              type="button"
              :disabled="pending(work) || !src(work) || downloading === work.id"
              @click="download(work)"
            >
              <DownloadOutlined />{{ downloading === work.id ? '下载中' : '下载' }}</button
            ><button class="media-action media-action--danger" title="删除"
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
    <ResultPagination
      :current="page"
      :total="total"
      :page-size="12"
      :loading="loading"
      @change="load"
    />
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
          <img :src="src(preview)" alt="精修成片" />
          <div class="studio-preview__bar media-actions">
            <button class="media-action" aria-label="下载" title="下载" type="button" @click="download(preview)"><DownloadOutlined />下载</button>
          </div>
        </div>
        <aside class="studio-preview__prompt">
          <h3>{{ preview.creationLabel || '作品详情' }}</h3>
          <StudioParams :work="preview" inset /><StudioReferences :work="preview" />
          <StudioWorkDate :value="preview.createTime" />
        </aside>
      </div>
    </Modal>
  </section>
</template>
<script setup lang="ts">
import StudioWorkDate from '@/components/studio/StudioWorkDate.vue'
import GenerationLoading from '@/components/ui/GenerationLoading.vue'
import ResultPagination from '@/components/ui/ResultPagination.vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Alert, Button, Modal } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  PictureOutlined,
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
} from '@/pages/product-retouch/api'
import type { StudioKind, StudioWork } from '@/pages/product-retouch/api'
import StudioParams from '@/components/studio/StudioParams.vue'
import StudioReferences from '@/components/studio/StudioReferences.vue'

interface Props {
  hideHeading?: boolean
  title?: string
  revision?: number
}
const props = defineProps<Props>()
const kind = 'image' as StudioKind
const toolCode = 'product-retouch' as string
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
const src = (work: StudioWork) => work.picUrl || ''
function schedule() {
  clearTimeout(timer)
  if (!works.value.some(pending) || !isLoggedIn.value) return
  timer = setTimeout(poll, 5000)
}
async function poll() {
  const token = version
  try {
    const updates = await Promise.all(
      works.value.filter(pending).map((work) => getStudioWork(kind, work.id))
    )
    if (token !== version) return
    for (const item of updates)
      if (item) works.value = works.value.map((work) => (work.id === item.id ? item : work))
    error.value = ''
    schedule()
  } catch {
    if (token === version) error.value = '状态更新中断，请点击重试核对原任务；无需重新提交生成。'
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
    const result = await pageStudioWorks(kind, no, 12, toolCode)
    if (token !== version) return
    const lastPage = Math.max(1, Math.ceil(result.total / 12))
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
  downloading.value = work.id
  try {
    await downloadStudioFile(src(work), studioFileName(kind, work.id, src(work)))
  } catch (e) {
    addToast(e instanceof Error ? e.message : '下载失败，请重试', 'error')
  } finally {
    downloading.value = undefined
  }
}
function remove(work: StudioWork) {
  Modal.confirm({
    title: '删除这条作品记录？',
    content: '不会删除已下载的文件。',
    okText: '删除',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteStudioWork(kind, work.id)
        await load(page.value)
      } catch (e) {
        addToast(e instanceof Error ? e.message : '删除失败', 'error')
      }
    },
  })
}
watch([() => props.revision, isLoggedIn, () => userInfo.value?.id], () => {
  works.value = []
  total.value = 0
  page.value = 1
  preview.value = undefined
  load(1)
})
onMounted(() => {
  void load(1)
})
onBeforeUnmount(() => {
  version++
  clearTimeout(timer)
})
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
    aspect-ratio: 1 / 1;
    padding: 0;
    border: 0;
    background: var(--color-surface-2);
    cursor: zoom-in;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
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
  &__info {
    padding: 16px;
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
    grid-template-columns: minmax(0, 1fr) 260px;
    max-height: 84vh;
    overflow: auto;
  }
  &__stage {
    min-width: 0;
    background: var(--color-media-backdrop);
    img {
      display: block;
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
}
@media (max-width: 720px) {
  .studio-preview__body {
    grid-template-columns: 1fr;
  }
  .studio-preview__stage img {
    height: 42vh;
  }
}
</style>
