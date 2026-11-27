<template>
  <PageContainer>
    <main class="media-parser">
      <header><span>素材工具</span><h1>粘贴链接，保存创作素材。</h1><p>抖音 · 小红书</p></header>
      <Alert v-if="configured === false" type="warning" show-icon message="链接解析服务未启动或不可用，请联系管理员" />
      <form class="media-parser__input" @submit.prevent="submit">
        <label for="share-link">分享链接</label>
        <Input.TextArea id="share-link" name="shareLink" required autocapitalize="none" autocorrect="off" :spellcheck="false" v-model:value="text" :maxlength="4096" :rows="3" placeholder="粘贴视频或图集的分享链接，带文案也可以" :disabled="busy" />
        <div><span>每次解析一条链接</span><Button html-type="submit" type="primary" :loading="busy" :disabled="busy || !!action || configured !== true">{{ busy ? stateLabel : '开始解析' }}</Button></div>
      </form>
      <Alert v-if="error" type="error" show-icon :message="error" />
      <section v-if="task" class="media-parser__results" aria-live="polite">
        <header><div><span>{{ task.platform }}</span><h2>{{ task.title }}</h2></div><Button class="media-action" aria-label="打包下载" title="打包下载" v-if="task.state === 'ready'" :loading="action === 'zip'" :disabled="!!action" @click="download()"><DownloadOutlined /></Button></header>
        <p v-if="busy">{{ stateLabel }}，请稍候…</p>
        <p v-else-if="task.state === 'failed'">解析未完成，请重新提交链接。</p>
        <div class="media-parser__grid">
          <article v-for="(file, index) in task.files" :key="file.name">
            <button class="media-parser__cover" type="button" :disabled="!!action" :aria-label="`预览素材 ${index + 1}`" @click="preview(index)">
              <img v-if="thumbs[index] || task.cover" :src="thumbs[index] || task.cover" :alt="`素材 ${index + 1}`" referrerpolicy="no-referrer" />
              <PictureOutlined v-else-if="file.kind === 'image'" /><PlayCircleOutlined v-else />
              <span>{{ file.kind === 'video' ? '播放视频' : '查看图片' }} {{ index + 1 }}</span>
            </button>
            <footer class="media-actions"><Button class="media-action" aria-label="下载" title="下载" :disabled="!!action" @click="download(index)"><DownloadOutlined /></Button><Button :disabled="!!action" @click="save(index)">存入资产库</Button></footer>
          </article>
        </div>
        <p v-if="task.state === 'ready'">预览与下载记录保留30分钟，保存到资产库后可长期使用。</p>
      </section>
      <div v-else class="media-parser__empty"><LinkOutlined /><p>解析后，在这里预览、下载或存入资产库。</p></div>
      <Modal :open="previewOpen" title="素材预览" :footer="null" :destroy-on-close="true" @cancel="closePreview">
        <video v-if="previewKind === 'video'" class="media-parser__player" :src="previewUrl" controls autoplay playsinline />
        <img v-else class="media-parser__player" :src="previewUrl" alt="解析图片预览" />
      </Modal>
    </main>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Alert, Button, Input, Modal, message } from 'ant-design-vue'
import { DownloadOutlined, LinkOutlined, PictureOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import { getConfig, getMedia, releaseTask, parseLink, saveAsset, type ParseTask } from './api'
const text = ref(''), error = ref(''), configured = ref<boolean>(), busy = ref(false), action = ref('')
const task = ref<ParseTask>(), thumbs = ref<Record<number, string>>({})
const previewOpen = ref(false), previewUrl = ref(''), previewKind = ref('image')
let disposed = false
const stateLabel = computed(() => '正在解析链接')
const explain = (e: unknown) => e instanceof Error ? e.message : '操作失败，请重试'
function clearUrls() { Object.values(thumbs.value).forEach(URL.revokeObjectURL); thumbs.value = {} }
async function submit() {
  if (busy.value || action.value) return
  busy.value = true; error.value = ''; clearUrls(); closePreview()
  const previous = task.value?.id
  task.value = undefined
  if (previous) await releaseTask(previous).catch(() => undefined)
  try {
    task.value = await parseLink(text.value)
    if (disposed) return
    if (task.value.state !== 'ready') throw new Error('解析尚未完成或失败，请稍后重新解析')
  } catch (e: unknown) { error.value = explain(e) } finally { busy.value = false }
}
async function run(key: string, fn: () => Promise<void>) {
  if (action.value) return
  action.value = key; error.value = ''
  try { await fn() } catch (e: unknown) { error.value = explain(e) } finally { action.value = '' }
}
async function preview(index: number) {
  await run(`preview-${index}`, async () => {
    if (!task.value) return
    const blob = await getMedia(task.value.id, index)
    if (disposed) return
    closePreview(); previewUrl.value = URL.createObjectURL(blob); previewKind.value = task.value.files[index].kind; previewOpen.value = true
    if (previewKind.value === 'image' && !thumbs.value[index]) thumbs.value[index] = URL.createObjectURL(blob)
  })
}
function closePreview() { previewOpen.value = false; if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
async function download(index?: number) {
  await run(index === undefined ? 'zip' : `download-${index}`, async () => {
    if (!task.value) return
    const blob = await getMedia(task.value.id, index), url = URL.createObjectURL(blob), anchor = document.createElement('a')
    anchor.href = url; anchor.download = index === undefined ? '素材合集.zip' : task.value.files[index].name
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
}
async function save(index: number) {
  await run(`save-${index}`, async () => { if (task.value) { await saveAsset(task.value.id, index); message.success('已保存到资产库') } })
}
onMounted(async () => { try { configured.value = (await getConfig()).ready } catch (e: unknown) { error.value = explain(e) } })
onBeforeUnmount(() => { disposed = true; closePreview(); clearUrls() })
</script>
<style scoped lang="scss">
.media-parser {
  max-width: 1120px; margin: 40px auto;
  > header { margin-bottom: 32px; h1 { font-size: clamp(26px, 3vw, 40px); margin: 10px 0; } span, p { color: var(--color-ink-secondary); } }
  &__input { background: var(--color-surface-0); border: 1px solid var(--color-border-whisper); border-radius: 20px; padding: 24px; margin: 20px 0; label { display: block; margin-bottom: 12px; font-weight: 600; } > div { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 16px; span { color: var(--color-ink-secondary); } } }
  &__results { margin-top: 32px; > header { display: flex; justify-content: space-between; align-items: center; gap: 16px; } h2 { font-size: 22px; overflow-wrap: anywhere; } > p { color: var(--color-ink-secondary); } }
  &__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
  article { background: var(--color-surface-0); border: 1px solid var(--color-border-whisper); border-radius: 16px; overflow: hidden; footer { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; } }
  &__cover { width: 100%; aspect-ratio: 4 / 3; position: relative; border: 0; cursor: pointer; background: var(--color-surface-2); color: var(--color-ink-secondary); > img { width: 100%; height: 100%; object-fit: contain; } > .anticon { font-size: 40px; } > span:last-child { position: absolute; bottom: 12px; left: 12px; padding: 4px 10px; border-radius: 20px; background: var(--color-media-veil); color: var(--color-on-media); } &:focus-visible { outline: 2px solid var(--color-workbench-blue); outline-offset: -3px; } }
  &__player { display: block; width: 100%; max-height: 65vh; object-fit: contain; }
  &__empty { text-align: center; padding: 70px 20px; color: var(--color-ink-secondary); .anticon { font-size: 36px; } }
}
@media (max-width: 600px) { .media-parser { margin: 20px auto; &__input { padding: 16px; } &__results > header { align-items: flex-start; } } }
</style>
