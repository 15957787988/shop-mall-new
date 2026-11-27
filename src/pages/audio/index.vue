<template>
  <div class="audio-page">
    <div class="audio-layout">
      <form class="audio-form" @submit.prevent="submit">
        <fieldset>
          <legend>音乐风格</legend>
          <div class="audio-styles">
            <article
              v-for="item in availableStyles"
              :key="item.id"
              :class="['audio-style', { active: style === item.id }]"
            >
              <button
                type="button"
                class="audio-style__select"
                :aria-pressed="style === item.id"
                :disabled="submitting || !!pending"
                @click="style = item.id"
              >
                <span :class="['audio-style__cover', `audio-style__cover--${item.id}`]"
                  ><SoundOutlined
                /></span>
                <span class="audio-style__text"
                  ><strong>{{ item.name }}</strong
                  ><small>{{ item.description }}</small></span
                >
                <CheckCircleFilled v-if="style === item.id" class="audio-style__check" />
              </button>
              <div class="audio-style__player">
                <button
                  type="button"
                  class="audio-style__play"
                  :disabled="!sampleUrl(item.id)"
                  :aria-label="`${previewPlaying && previewStyle === item.id ? '暂停' : '试听'}${
                    item.name
                  }`"
                  :aria-pressed="previewPlaying && previewStyle === item.id"
                  @click="togglePreview(item.id)"
                >
                  <PauseOutlined
                    v-if="previewPlaying && previewStyle === item.id"
                  /><PlayCircleFilled v-else />
                </button>
                <div class="audio-style__wave">
                  <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <clipPath :id="`preview-progress-${item.id}`">
                        <rect
                          :width="previewStyle === item.id ? previewProgress * 2 : 0"
                          height="40"
                        />
                      </clipPath>
                    </defs>
                    <g class="audio-style__bars">
                      <rect
                        v-for="(height, i) in waveBars"
                        :key="i"
                        :x="i * 5"
                        :y="(40 - height) / 2"
                        width="2.6"
                        :height="height"
                        rx="1.3"
                      />
                    </g>
                    <g class="audio-style__played" :clip-path="`url(#preview-progress-${item.id})`">
                      <rect
                        v-for="(height, i) in waveBars"
                        :key="i"
                        :x="i * 5"
                        :y="(40 - height) / 2"
                        width="2.6"
                        :height="height"
                        rx="1.3"
                      />
                    </g>
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    :value="previewStyle === item.id ? previewProgress : 0"
                    :disabled="!sampleUrl(item.id) || previewStyle !== item.id || !previewDuration"
                    :aria-label="`${item.name}试听进度`"
                    @input="seekPreview"
                  />
                </div>
                <span v-if="!sampleUrl(item.id)" class="audio-style__unavailable">暂无试听</span>
              </div>
            </article>
          </div>
        </fieldset>
        <div class="audio-lyrics-head">
          <label for="audio-lyrics">输入歌词</label><span>直接将输入内容作为歌词</span>
        </div>
        <div class="audio-lyrics">
          <textarea
            id="audio-lyrics"
            v-model="lyrics"
            maxlength="1000"
            :disabled="submitting || !!pending"
            placeholder="写下你想唱的内容…&#10;&#10;可以使用 [Verse]、[Chorus] 标记主歌和副歌。"
            required
          /><span>{{ lyrics.length }} / 1000</span>
        </div>
        <audio
          ref="previewAudio"
          :src="sampleUrl(previewStyle)"
          preload="none"
          @timeupdate="updatePreviewProgress"
          @loadedmetadata="updatePreviewProgress"
          @play="previewPlaying = true"
          @pause="previewPlaying = false"
          @ended="previewPlaying = false"
          @error="onPreviewError"
        />
        <p v-if="previewError" class="audio-error" role="status">{{ previewError }}</p>
        <p v-if="error" class="audio-error" role="alert">{{ error }}</p>
        <p v-if="config && !config.ready" class="audio-notice" role="status">
          {{ config.message }}
        </p>
        <div class="audio-form__footer">
          <span>生成后可试听完整作品</span
          ><Button
            type="primary"
            html-type="submit"
            size="large"
            :loading="submitting"
            :disabled="!lyrics.trim() || !config?.ready"
            ><SoundOutlined />{{
              pending
                ? '核对并继续原请求'
                : `生成音乐${config?.points ? ` · ${config.points} 积分` : ''}`
            }}</Button
          >
        </div>
      </form>
      <section class="audio-results" aria-labelledby="audio-results-title">
        <header><h2 id="audio-results-title">我的音乐</h2></header>
        <div v-if="!isLoggedIn" class="audio-empty">
          <SoundOutlined />
          <h3>下一首作品，来自你的歌词。</h3>
          <p>登录后开始创作，作品会保存在这里。</p>
          <Button @click="openLogin()">登录账号</Button>
        </div>
        <div v-else-if="!tasks.length" class="audio-empty">
          <div class="audio-wave" aria-hidden="true"><i v-for="n in 15" :key="n" /></div>
          <h3>音乐，等待你的第一句。</h3>
          <p>{{ loading ? '正在读取作品…' : '填写歌词，创作你的第一首音乐。' }}</p>
        </div>
        <p v-if="resultsError" class="audio-error" role="alert">{{ resultsError }}</p>
        <div v-if="tasks.length" class="audio-results__grid">
          <article
            v-for="task in tasks"
            :key="task.id"
            :class="['audio-task', { 'audio-task--ready': task.music.length }]"
          >
            <button
              v-if="task.music.length"
              type="button"
              class="audio-task__preview audio-track__cover"
              :aria-label="`播放${task.music[0].title || '音乐作品'}，查看全部音轨`"
              @click="openPlayer(task.id)"
            >
              <img
                v-if="coverUrl(task.music[0])"
                :src="coverUrl(task.music[0])"
                :alt="`${task.music[0].title || '音乐作品'}封面`"
                loading="lazy"
                @error="onCoverError"
              />
              <SoundOutlined v-else aria-label="暂无封面" />
              <span class="audio-task__play"><PlayCircleFilled /></span>
            </button>
            <template v-else>
              <header>
                <strong
                  >{{ task.style === 'rap' ? '说唱' : '电音' }}作品
                  <small>#{{ task.id }}</small></strong
                ><span>{{ stateLabel(task.state) }}</span>
              </header>
              <p v-if="task.error" class="audio-error" role="status">{{ task.error }}</p>
              <div
                v-if="!['SUCCESS', 'FAILED', 'REVIEW'].includes(task.state)"
                class="audio-task__pending"
                role="status"
              >
                <LoadingOutlined />正在制作，离开页面后仍可继续查看
              </div>
              <footer class="audio-task__actions media-actions">
                <time>{{ formatTime(task.createdAt) }}</time>
                <Popconfirm
                  v-if="['SUCCESS', 'FAILED'].includes(task.state)"
                  title="删除这组音乐作品？"
                  description="作品会从列表移除，计费记录保留。"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="remove(task.id)"
                  ><Button class="media-action media-action--danger" title="删除"
                    type="text"
                    :loading="deleting === task.id"
                    :disabled="!!deleting"
                    aria-label="删除音乐作品"
                    ><DeleteOutlined /></Button
                ></Popconfirm>
              </footer>
            </template>
          </article>
        </div>
      </section>
    </div>
    <Modal
      :open="!!selectedTask"
      :title="selectedTask?.music[0]?.title || '音乐作品'"
      :footer="null"
      :width="760"
      destroy-on-close
      @cancel="closePlayer"
    >
      <div v-if="selectedTask" ref="playerPanel" class="audio-player">
        <div class="audio-track__cover audio-player__cover">
          <img
            v-if="coverUrl(selectedTask.music[0])"
            :src="coverUrl(selectedTask.music[0])"
            alt="音乐作品封面"
            @error="onCoverError"
          /><SoundOutlined v-else aria-label="暂无封面" />
        </div>
        <div class="audio-player__tracks">
          <div
            v-for="(track, index) in selectedTask.music"
            :key="`${selectedTask.id}:${index}`"
            class="audio-track"
          >
            <strong
              >{{ track.title || `音轨 ${index + 1}` }} <small>音轨 {{ index + 1 }}</small></strong
            >
            <div class="audio-track__row">
              <audio
                controls
                preload="none"
                :aria-label="track.title || `音轨 ${index + 1}`"
                :src="track.audio_url"
                @play="pauseOtherTracks"
              >
                浏览器不支持音频播放。
              </audio>
              <Button aria-label="下载" title="下载"
                type="text"
                class="audio-track__download media-action"
                :loading="downloading === `${selectedTask.id}:${index}`"
                :disabled="!!downloading"
                @click="download(selectedTask.id, index)"
                ><DownloadOutlined
              /></Button>
            </div>
          </div>
        </div>
        <details class="audio-player__lyrics">
          <summary>查看歌词</summary>
          <p>{{ selectedTask.lyrics }}</p>
        </details>
        <p v-if="resultsError" class="audio-error" role="alert">{{ resultsError }}</p>
        <footer class="audio-task__actions audio-player__actions media-actions">
          <time>{{ formatTime(selectedTask.createdAt) }}</time>
          <Popconfirm
            v-if="['SUCCESS', 'FAILED'].includes(selectedTask.state)"
            title="删除这组音乐作品？"
            description="作品会从列表移除，计费记录保留。"
            ok-text="删除"
            cancel-text="取消"
            @confirm="remove(selectedTask.id)"
            ><Button class="media-action media-action--danger" aria-label="删除" title="删除" type="text" :loading="deleting === selectedTask.id" :disabled="!!deleting"
              ><DeleteOutlined /></Button
          ></Popconfirm>
        </footer>
      </div>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, nextTick, computed } from 'vue'
import { ApiError } from '@/types/api'
import { Button, Modal, Popconfirm } from 'ant-design-vue'
import {
  CheckCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  LoadingOutlined,
  PauseOutlined,
  PlayCircleFilled,
  SoundOutlined,
} from '@ant-design/icons-vue'
import { useAuth } from '@/composables/useAuth'
import {
  deleteAudioTask,
  downloadAudioTrack,
  generateAudio,
  getAudioConfig,
  getAudioTasks,
  type AudioConfig,
  type AudioTask,
  type AudioTrack,
} from './api'
const { isLoggedIn, userInfo, openLogin } = useAuth()
const lyrics = ref(''),
  style = ref('rap'),
  error = ref('')
const config = ref<AudioConfig>(),
  tasks = ref<AudioTask[]>([])
const submitting = ref(false),
  loading = ref(false)
const pending = ref<{ lyrics: string; style: string; submitKey: string }>()
const previewAudio = ref<HTMLAudioElement>()
const previewStyle = ref('rap'),
  previewPlaying = ref(false),
  previewProgress = ref(0),
  previewDuration = ref(0),
  previewError = ref('')
// 装饰波形只表示播放进度，不伪称为音频分析结果。
const waveBars = Array.from(
  { length: 40 },
  (_, i) => 12 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.4)) * 24)
)
const sampleUrl = (id: string) => (id === 'rap' ? config.value?.referenceUrl : undefined)
async function togglePreview(id: string) {
  const audio = previewAudio.value
  if (!audio || !sampleUrl(id)) return
  previewError.value = ''
  if (previewStyle.value === id && !audio.paused) {
    audio.pause()
    return
  }
  if (previewStyle.value !== id) {
    audio.pause()
    previewStyle.value = id
    previewProgress.value = 0
    previewDuration.value = 0
    await nextTick()
  }
  try {
    await audio.play()
  } catch {
    previewPlaying.value = false
    previewError.value = '无法播放试听音频，请重试'
  }
}
function updatePreviewProgress() {
  const audio = previewAudio.value
  previewDuration.value = audio && Number.isFinite(audio.duration) ? audio.duration : 0
  previewProgress.value =
    audio && previewDuration.value ? (audio.currentTime / previewDuration.value) * 100 : 0
}
function seekPreview(event: Event) {
  if (!previewAudio.value || !previewDuration.value) return
  previewAudio.value.currentTime =
    (Number((event.target as HTMLInputElement).value) / 100) * previewDuration.value
  updatePreviewProgress()
}
function onPreviewError() {
  previewPlaying.value = false
  previewError.value = '试听加载失败，请稍后重试'
}
const styles = [
  { id: 'rap', name: '说唱', description: '节奏鲜明，清晰表达每一句' },
  { id: 'electronic', name: '电音', description: '电子律动，搭配你的歌词' },
]
const availableStyles = computed(() => styles.filter((item) => !!sampleUrl(item.id)))
const failedCovers = ref(new Set<string>())
function coverUrl(track: AudioTrack): string | undefined {
  return [track.image_url, track.image_large_url].find(
    (url) => !!url && url.startsWith('https://') && !failedCovers.value.has(url)
  )
}
function onCoverError(event: Event) {
  markCoverFailed((event.currentTarget as HTMLImageElement).currentSrc)
}
function markCoverFailed(url?: string) {
  if (url) failedCovers.value = new Set([...failedCovers.value, url])
}
const selectedTaskId = ref<number>()
const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value))
const playerPanel = ref<HTMLDivElement>()
function pauseTracks(except?: HTMLAudioElement) {
  playerPanel.value?.querySelectorAll('audio').forEach((audio) => {
    if (audio !== except) audio.pause()
  })
}
function pauseOtherTracks(event: Event) {
  previewAudio.value?.pause()
  pauseTracks(event.currentTarget as HTMLAudioElement)
}
function closePlayer() {
  pauseTracks()
  selectedTaskId.value = undefined
}
function openPlayer(id: number) {
  previewAudio.value?.pause()
  pauseTracks()
  selectedTaskId.value = id
}
const resultsError = ref(''),
  downloading = ref(''),
  deleting = ref<number>()
function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}
async function download(id: number, index: number) {
  if (downloading.value) return
  const owner = userInfo.value?.id
  downloading.value = `${id}:${index}`
  resultsError.value = ''
  try {
    await downloadAudioTrack(id, index)
  } catch (e) {
    if (!disposed && owner === userInfo.value?.id)
      resultsError.value = e instanceof Error ? e.message : '下载失败'
  } finally {
    downloading.value = ''
  }
}
async function remove(id: number) {
  if (deleting.value) return
  const owner = userInfo.value?.id
  deleting.value = id
  resultsError.value = ''
  try {
    await deleteAudioTask(id)
    if (!disposed && owner === userInfo.value?.id) {
      version++
      loading.value = false
      clearTimeout(timer)
      if (selectedTaskId.value === id) closePlayer()
      tasks.value = tasks.value.filter((task) => task.id !== id)
      void load()
    }
  } catch (e) {
    if (!disposed && owner === userInfo.value?.id)
      resultsError.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    deleting.value = undefined
  }
}
// 没有源音频的风格不展示；恢复旧草稿时也回到可用风格。
watch(availableStyles, (items) => {
  if (items.length && !items.some((item) => item.id === style.value) && !pending.value)
    style.value = items[0].id
})
function pendingStorageKey() {
  return `audio-request:${userInfo.value?.id}`
}
function restorePending() {
  try {
    const raw = sessionStorage.getItem(pendingStorageKey())
    if (!raw) return
    const saved = JSON.parse(raw) as { lyrics?: unknown; style?: unknown; submitKey?: unknown }
    if (
      typeof saved.lyrics === 'string' &&
      ['rap', 'electronic'].includes(String(saved.style)) &&
      typeof saved.submitKey === 'string'
    ) {
      pending.value = {
        lyrics: saved.lyrics,
        style: String(saved.style),
        submitKey: saved.submitKey,
      }
      lyrics.value = saved.lyrics
      style.value = String(saved.style)
    }
  } catch {
    error.value = '无法恢复原请求，请先核对作品记录。'
  }
}
let disposed = false,
  version = 0,
  timer: ReturnType<typeof setTimeout> | undefined
const stateLabel = (state: string) =>
  ({
    SUCCESS: '已完成',
    FAILED: '生成失败',
    REVIEW: '待核对',
    NEW: '排队中',
    UPLOADING: '准备参考音频',
    UPLOAD_PENDING: '解析参考音频',
    GENERATING: '提交生成',
    GENERATION_PENDING: '生成中',
  }[state] || '处理中')
async function load() {
  if (loading.value || disposed || !isLoggedIn.value) return
  const current = version
  clearTimeout(timer)
  loading.value = true
  try {
    const result = await getAudioTasks()
    if (!disposed && current === version) tasks.value = result
  } catch (e) {
    if (!disposed && current === version)
      error.value = e instanceof Error ? e.message : '作品读取失败'
  } finally {
    if (current === version) loading.value = false
    if (!disposed && isLoggedIn.value && current === version) timer = setTimeout(load, 10000)
  }
}
async function submit() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  if (submitting.value || !config.value?.ready || !lyrics.value.trim()) return
  const owner = userInfo.value?.id
  pending.value ||= {
    lyrics: lyrics.value.trim(),
    style: style.value,
    submitKey: crypto.randomUUID(),
  }
  try {
    sessionStorage.setItem(pendingStorageKey(), JSON.stringify(pending.value))
  } catch {
    error.value = '浏览器无法保存请求记录，请允许会话存储后重试。'
    return
  }
  const storageKey = pendingStorageKey()
  submitting.value = true
  error.value = ''
  try {
    await generateAudio(pending.value)
    if (owner === userInfo.value?.id && !disposed) {
      sessionStorage.removeItem(storageKey)
      pending.value = undefined
      await load()
    }
  } catch (e) {
    if (owner === userInfo.value?.id && !disposed) {
      if (e instanceof ApiError && e.code >= 400 && e.code < 500) {
        sessionStorage.removeItem(storageKey)
        pending.value = undefined
      }
      error.value =
        (e instanceof Error ? e.message : '提交结果未确认') +
        (pending.value ? '。请核对原请求，避免重复新建。' : '')
    }
  } finally {
    submitting.value = false
  }
}
watch(
  () => userInfo.value?.id,
  () => {
    closePlayer()
    version++
    clearTimeout(timer)
    loading.value = false
    tasks.value = []
    pending.value = undefined
    error.value = ''
    resultsError.value = ''
    restorePending()
    void load()
  }
)
onMounted(async () => {
  restorePending()
  try {
    config.value = await getAudioConfig()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '配置读取失败'
  }
  void load()
})
onBeforeUnmount(() => {
  closePlayer()
  previewAudio.value?.pause()
  disposed = true
  clearTimeout(timer)
})
</script>
<style scoped lang="scss">
.audio-page {
  display: flex;
  flex-direction: column;
  block-size: calc(100dvh - var(--app-header-height));
  inline-size: 100%;
  padding: 0;
  color: var(--color-ink-primary);
}
.audio-layout {
  flex: 1;
  min-block-size: 0;
  display: grid;
  grid-template-columns: minmax(300px, 370px) minmax(0, 1fr);
  gap: 0;
}
.audio-form,
.audio-results {
  min-inline-size: 0;
  min-block-size: 0;
  padding: 24px;
  background: var(--color-surface-0);
}
.audio-form {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-inline-end: 1px solid var(--color-border-whisper);
}
.audio-results {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--color-surface-1);
  > header {
    flex-shrink: 0;
    margin-block-end: 20px;
  }
}
.audio-results__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 20px;
  align-items: start;
}
fieldset {
  flex-shrink: 0;
  border: 0;
  padding: 0;
  margin: 0 0 18px;
  min-inline-size: 0;
  legend {
    float: none;
    inline-size: auto;
    padding: 0;
    margin-block-end: 10px;
    font-size: 15px;
    font-weight: 600;
  }
}
// ponytail: 风格变多时网格自动换列，超过约两行在区域内滚动
.audio-styles {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  max-block-size: 252px;
  overflow-y: auto;
  padding: 2px;
}
.audio-style {
  min-inline-size: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--color-border-whisper);
  background: var(--color-surface-0);
  color: var(--color-ink-primary);
  transition: border-color 0.2s;
  &.active {
    border-color: var(--color-ink-primary);
    background: var(--color-surface-1);
  }
  &__select {
    display: flex;
    inline-size: 100%;
    align-items: center;
    text-align: start;
    gap: 10px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  &__select:disabled {
    cursor: default;
  }
  &__cover {
    display: grid;
    place-items: center;
    inline-size: 36px;
    block-size: 36px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--color-media-backdrop);
    color: var(--color-on-media);
    font-size: 18px;
  }
  &__cover--electronic {
    background: var(--color-success-mint);
  }
  &__text {
    flex: 1;
    min-inline-size: 0;
    strong {
      display: block;
      font-size: 16px;
      font-weight: 600;
    }
    small {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-block-start: 5px;
      color: var(--color-ink-secondary);
      font-size: 11px;
    }
  }
  &__check {
    flex-shrink: 0;
    font-size: 14px;
  }
  &__player {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-block-start: 10px;
  }
  &__play {
    display: grid;
    place-items: center;
    inline-size: 28px;
    block-size: 28px;
    flex-shrink: 0;
    border: 0;
    border-radius: 50%;
    background: var(--color-surface-2);
    color: var(--color-ink-primary);
    font-size: 20px;
    cursor: pointer;
  }
  &__play:disabled {
    color: var(--color-ink-quaternary);
    cursor: default;
  }
  &__wave {
    position: relative;
    flex: 1;
    min-inline-size: 0;
    block-size: 28px;
    svg {
      display: block;
      inline-size: 100%;
      block-size: 100%;
    }
    input {
      position: absolute;
      inset: 0;
      inline-size: 100%;
      block-size: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    &:focus-within {
      outline: 2px solid var(--color-success-mint);
      outline-offset: 3px;
      border-radius: 4px;
    }
    input:disabled {
      cursor: default;
    }
  }
  &__bars {
    fill: var(--color-ink-quaternary);
  }
  &__played {
    fill: var(--color-ink-primary);
  }
  &__unavailable {
    font-size: 10px;
    flex-shrink: 0;
    color: var(--color-ink-muted);
  }
}
.audio-lyrics-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-block-end: 10px;
  label {
    font-size: 15px;
    font-weight: 600;
  }
  span {
    font-size: 12px;
    color: var(--color-ink-muted);
  }
}
.audio-lyrics {
  flex: 1;
  min-block-size: 180px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--color-surface-1);
  padding: 14px 16px;
  textarea {
    flex: 1;
    display: block;
    inline-size: 100%;
    min-block-size: 0;
    resize: none;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: var(--color-ink-primary);
    line-height: 1.9;
  }
  > span {
    display: block;
    text-align: end;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
}

audio {
  display: block;
  inline-size: 100%;
  max-inline-size: 100%;
}
.audio-form__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-block-start: 16px;
  .ant-btn {
    inline-size: 100%;
  }
  > span {
    font-size: 12px;
    color: var(--color-ink-muted);
  }
}
.audio-results > header,
.audio-task > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  h2 {
    margin: 0;
    font-size: 18px;
  }
}
.audio-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-ink-muted);
  > .anticon {
    font-size: 40px;
  }
  h3 {
    margin-block: 24px 10px;
    font-size: 17px;
    color: var(--color-ink-primary);
  }
  p {
    font-size: 12px;
    line-height: 1.8;
  }
}
.audio-wave {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  block-size: 70px;
  i {
    inline-size: 5px;
    block-size: 20px;
    border-radius: 4px;
    background: var(--color-ink-quaternary);
    &:nth-child(3n) {
      block-size: 42px;
    }
    &:nth-child(4n) {
      block-size: 64px;
    }
    &:nth-child(5n) {
      block-size: 32px;
    }
  }
}
.audio-task {
  padding: 20px;
  border: 1px solid var(--color-border-whisper);
  border-radius: 14px;
  background: var(--color-surface-0);
  min-inline-size: 0;
  header {
    font-size: 13px;
    span,
    small {
      color: var(--color-ink-muted);
      font-weight: 400;
    }
  }
  &__lyrics {
    summary {
      cursor: pointer;
    }
    p {
      white-space: pre-wrap;
    }
    overflow-wrap: anywhere;
    max-block-size: 90px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.7;
    color: var(--color-ink-secondary);
    margin-block: 14px;
  }
  &__pending {
    display: flex;
    gap: 8px;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
}
.audio-task__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-block-start: 16px;
  padding-block-start: 10px;
  border-block-start: 1px solid var(--color-border-whisper);
  time {
    font-size: 11px;
    color: var(--color-ink-muted);
  }
}
.audio-track__cover {
  display: grid;
  place-items: center;
  inline-size: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-surface-2);
  color: var(--color-ink-muted);
  font-size: 48px;
  img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }
}
.audio-track {
  display: grid;
  gap: 10px;
  margin-block-start: 18px;
  font-size: 12px;
  a {
    color: var(--color-ink-secondary);
  }
  strong small {
    font-weight: 400;
    color: var(--color-ink-muted);
    margin-inline-start: 6px;
  }
}
.audio-task--ready {
  padding: 0;
  overflow: hidden;
}
.audio-task__preview {
  position: relative;
  border: 0;
  padding: 0;
  cursor: pointer;
  border-radius: inherit;
}
.audio-task__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--color-on-media);
  background: var(--color-media-veil);
  font-size: 52px;
  transition: font-size 0.2s;
}
.audio-task__preview:hover .audio-task__play {
  font-size: 58px;
}
.audio-task__preview:focus-visible {
  outline-offset: -4px;
}
.audio-player {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  align-items: start;
  gap: 20px;
  max-block-size: 70dvh;
  overflow-y: auto;
  padding-block-start: 12px;
}
.audio-player__tracks {
  min-inline-size: 0;
  .audio-track {
    margin-block: 0 18px;
  }
  .audio-track__row {
    display: flex;
    align-items: center;
    gap: 8px;
    audio {
      flex: 1;
      min-inline-size: 0;
    }
  }
  .audio-track__download {
    flex-shrink: 0;
    padding-inline: 8px;
  }
}
.audio-player__lyrics,
.audio-player__actions,
.audio-player > .audio-error {
  grid-column: 1 / -1;
  margin: 0;
}
.audio-player__lyrics {
  font-size: 13px;
  color: var(--color-ink-secondary);
  summary {
    cursor: pointer;
  }
  p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.8;
  }
}
.audio-error {
  color: var(--color-danger);
  font-size: 12px;
  line-height: 1.8;
}
.audio-notice {
  color: var(--color-ink-secondary);
  font-size: 12px;
  line-height: 1.8;
}
button:focus-visible,
a:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-success-mint);
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .audio-page {
    block-size: auto;
  }
  .audio-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .audio-lyrics {
    min-block-size: 280px;
  }
  .audio-results {
    overflow: visible;
  }
}
@media (max-width: 500px) {
  .audio-player {
    grid-template-columns: minmax(0, 1fr);
  }
  .audio-player__cover {
    max-inline-size: 220px;
    justify-self: center;
  }
  .audio-page {
    padding: 0;
  }
  .audio-form,
  .audio-results {
    padding: 20px 16px;
  }
  .audio-styles {
    grid-template-columns: minmax(0, 1fr);
  }
  .audio-form__footer > span {
    display: none;
  }
  .audio-form__footer .ant-btn {
    inline-size: 100%;
  }
}
</style>
