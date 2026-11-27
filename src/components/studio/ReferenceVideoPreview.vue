<template>
  <video
    ref="video"
    :src="src"
    :poster="poster"
    class="reference-video-preview"
    muted
    loop
    playsinline
    preload="metadata"
    tabindex="0"
    aria-label="参考视频，移入或聚焦播放，点击切换播放"
    @mouseenter="play"
    @mouseleave="pause"
    @focus="play"
    @blur="pause"
    @click.stop="toggle"
    @keydown.space.prevent="toggle"
    @keydown.enter.prevent="toggle"
    @loadedmetadata="firstFrame"
  />
</template>
<script setup lang="ts">
import { ref } from 'vue'
interface Props {
  src: string
  poster?: string
}
const props = defineProps<Props>()
const video = ref<HTMLVideoElement>()
let active = false
async function play() {
  active = true
  try {
    await video.value?.play()
    if (!active) video.value?.pause()
  } catch {
    /* 浏览器阻止播放时保留静态预览，用户仍可点击重试。 */
  }
}
function pause() {
  active = false
  video.value?.pause()
}
function toggle() {
  if (video.value?.paused) void play()
  else pause()
}
function firstFrame() {
  if (!props.poster && !active && video.value) {
    try {
      video.value.currentTime = 0.1
    } catch {
      /* 元数据不可寻址时保留默认首帧。 */
    }
  }
}
</script>
<style scoped lang="scss">
.reference-video-preview {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 12px;
  background: var(--color-surface-2);
  cursor: pointer;
}
</style>
