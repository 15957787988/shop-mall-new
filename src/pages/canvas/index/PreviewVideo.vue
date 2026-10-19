<template>
  <div class="preview-video" :class="{ 'inline-preview': !controls }">
    <video
      v-if="enabled && !failed && !recovering"
      ref="video"
      :src="source"
      :class="{ pending: loading }"
      :controls="controls"
      :autoplay="autoplay && !controls && active"
      muted
      loop
      playsinline
      preload="metadata"
      @loadeddata="ready"
      @playing="ready"
      @pause="ready"
      @waiting="waitForVideo"
      @error="handleError"
    />
    <button v-if="playBlocked && !failed" class="play-button" type="button" @click.stop="start"
      >播放预览</button
    >
    <div v-if="failed" class="video-status" role="status">
      <span>视频暂时无法播放</span><button type="button" @click.stop="retry">重试</button>
    </div>
    <div v-else-if="loading" class="video-status loading" role="status">视频加载中…</div>
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
const props = defineProps({
  source: { type: String, required: true },
  controls: Boolean,
  autoplay: { type: Boolean, default: true },
  enabled: { type: Boolean, default: true },
  active: { type: Boolean, default: true }
})
const video = ref(null)
const failed = ref(false)
const playBlocked = ref(false)
const loading = ref(false)
const recovering = ref(false)
let automaticRetries = 0
let recoveryTimer
let timeout
let playAttempt = 0
function release() {
  clearTimeout(recoveryTimer)
  recoveryTimer = null
  playAttempt++
  clearTimeout(timeout)
  timeout = null
  if (!video.value) return
  video.value.pause()
  video.value.removeAttribute('src')
  video.value.load()
}
function waitForVideo() {
  if (props.active === false || timeout) return
  loading.value = true
  timeout = setTimeout(handleError, 12000)
}
function ready() {
  clearTimeout(timeout)
  timeout = null
  loading.value = false
}
function fail() {
  release()
  timeout = null
  loading.value = false
  failed.value = true
}
function handleError() {
  if (recovering.value || failed.value || !props.enabled || props.active === false) return
  if (automaticRetries >= 1) {
    fail()
    return
  }
  automaticRetries++
  recovering.value = true
  release()
  loading.value = true
  recoveryTimer = setTimeout(resume, 300)
}
function resume() {
  clearTimeout(recoveryTimer)
  recoveryTimer = null
  if (!props.enabled || props.active === false) return
  recovering.value = false
  nextTick(start)
}
function start() {
  if (!props.enabled || props.active === false || !video.value) return
  playBlocked.value = false
  if (video.value.readyState >= 2) ready()
  else waitForVideo()
  if (props.autoplay === false) return
  const attempt = ++playAttempt
  video.value.play().catch((error) => {
    if (attempt !== playAttempt) return
    // Policy refusal is not a broken media source: retain its frame and offer play.
    if (error?.name === 'NotAllowedError') {
      playBlocked.value = !props.controls
      if (video.value?.readyState >= 2) ready()
    } else if (error?.name !== 'AbortError') handleError()
  })
}
async function retry() {
  automaticRetries = 0
  recovering.value = false
  failed.value = false
  await nextTick()
  start()
}
watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) {
      release()
      ready()
    } else resume()
  },
  { flush: 'pre' }
)
watch(() => props.active, (active) => {
  if (active) resume()
  else {
    clearTimeout(recoveryTimer)
    recoveryTimer = null
    playAttempt++
    video.value?.pause()
    ready()
  }
})
onMounted(start)
onBeforeUnmount(release)
</script>
<style scoped lang="scss">
.preview-video {
  width: 100%;
  height: 100%;
  position: relative;
  background: #111110;
}
video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.video-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: #161615d9;
  font-size: 14px;
}
.loading {
  pointer-events: none;
}
.play-button {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1;
}
button {
  color: #fff;
  background: #33334c;
  border: 1px solid #66667b;
  padding: 7px 18px;
  border-radius: 6px;
  cursor: pointer;
}
</style>

<style scoped>
.inline-preview {
  background: transparent;
}
.inline-preview video.pending {
  opacity: 0;
}
.inline-preview .video-status {
  inset: auto 8px 10px;
  padding: 8px;
  border-radius: 8px;
  background: #111b;
}
</style>
