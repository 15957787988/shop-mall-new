<template>
  <div ref="container" class="gallery-media">
    <img
      v-if="near && posterUrl && !imageFailed"
      :src="posterUrl"
      alt=""
      decoding="async"
      @load="finishImage"
      @error="failImage"
    />
    <div v-if="!posterUrl || imageFailed" class="media-placeholder">
      <span>{{ imageFailed ? '封面加载失败' : isVideo ? '视频模板' : '暂无封面' }}</span>
      <button v-if="imageFailed" type="button" @click.stop="retryImage">重试封面</button>
    </div>
    <div v-else-if="!imageReady" class="media-skeleton" aria-label="封面加载中"></div>
    <PreviewVideo v-if="videoStarted && isVideo && !disabled" :key="source" :source="source" :autoplay="animate" :active="visible" />
    <span v-if="isVideo && !animate" class="preview-hint">▶ 查看视频</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import PreviewVideo from './PreviewVideo.vue'
import { galleryPoster, isVideoUrl, canAutoplayPreview } from '../utils/galleryMedia'
const props = defineProps({
  source: { type: String, default: '' },
  poster: { type: String, default: '' },
  autoplay: { type: Boolean, default: true },
  disabled: Boolean
})
const container = ref(null)
const near = ref(false)
const visible = ref(false)
const imageReady = ref(false)
const imageFailed = ref(false)
const isVideo = computed(() => isVideoUrl(props.source))
const posterUrl = computed(() => galleryPoster(props.source, props.poster))
// A visible template must show content without waiting for pointer interaction.
const motionAllowed = ref(canAutoplayPreview())
const animate = computed(() => props.autoplay && motionAllowed.value)
const showVideo = computed(
  () =>
    isVideo.value &&
    visible.value &&
    !props.disabled &&
    // Let the lightweight cover finish before competing with video downloads.
    (!posterUrl.value || imageReady.value || imageFailed.value) &&
    (animate.value || !posterUrl.value || imageFailed.value)
)
// Keep a visited preview mounted so scrolling back does not restart its download.
const videoStarted = ref(false)
watch([() => props.source, showVideo, () => props.disabled], ([source, show, disabled], [previousSource]) => {
  if (source !== previousSource || disabled) videoStarted.value = false
  if (show) videoStarted.value = true
})
let imageTimer
let nearObserver
let visibleObserver
function finishImage() {
  clearTimeout(imageTimer)
  imageReady.value = true
}
function failImage() {
  clearTimeout(imageTimer)
  imageFailed.value = true
}
function retryImage() {
  clearTimeout(imageTimer)
  imageReady.value = false
  imageFailed.value = false
  if (near.value && posterUrl.value) imageTimer = setTimeout(failImage, 12000)
}
watch([near, posterUrl], retryImage)
onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    near.value = true
    visible.value = true
    return
  }
  nearObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        near.value = true
        nearObserver.disconnect()
      }
    },
    { rootMargin: '160px' }
  )
  visibleObserver = new IntersectionObserver(([entry]) => {
    visible.value = entry.isIntersecting
  })
  nearObserver.observe(container.value)
  visibleObserver.observe(container.value)
})
onBeforeUnmount(() => {
  clearTimeout(imageTimer)
  nearObserver?.disconnect()
  visibleObserver?.disconnect()
})
</script>

<style scoped lang="scss">
.gallery-media {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #20201f;
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-skeleton,
.media-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: #b8b2a9;
  background: #21201f;
}
button {
  border: 1px solid #55514b;
  border-radius: 6px;
  padding: 6px 12px;
  color: #ebe7df;
  background: #302e2a;
  cursor: pointer;
}
.preview-hint {
  position: absolute;
  bottom: 12px;
  right: 12px;
  border-radius: 14px;
  padding: 5px 10px;
  background: #0009;
  color: #fff;
  font-size: 12px;
  pointer-events: none;
}
:deep(.preview-video) {
  position: absolute;
  inset: 0;
}
</style>
