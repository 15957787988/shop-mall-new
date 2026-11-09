<template>
  <details
    v-if="sourceVideoUrl || images.length || videos.length || audios.length"
    class="references"
    open
    @toggle="toggle"
  >
    <summary>
      参考素材
      <span v-if="sourceVideoUrl">原视频 1</span>
      <span v-if="images.length">图片 {{ images.length }}</span>
      <span v-if="videos.length">视频 {{ videos.length }}</span>
      <span v-if="audios.length">音频 {{ audios.length }}</span>
    </summary>
    <div v-if="expanded" class="references__content">
      <section v-if="sourceVideoUrl">
        <h4>原参考视频（仅用于分析）</h4>
        <div class="references__media">
          <a :href="sourceVideoUrl" target="_blank" rel="noopener noreferrer">原参考视频 · 打开</a>
          <video :src="sourceVideoUrl" controls playsinline preload="metadata" aria-label="原参考视频（仅用于分析）" />
        </div>
      </section>
      <section v-if="images.length">
        <h4>参考图（{{ images.length }}）</h4>
        <Image.PreviewGroup>
          <div class="references__images">
            <Image
              v-for="(url, index) in images"
              :key="url"
              :src="url"
              :alt="`参考图 ${index + 1}`"
              loading="lazy"
            />
          </div>
        </Image.PreviewGroup>
      </section>
      <section v-if="videos.length">
        <h4>参考视频（{{ videos.length }}）</h4>
        <div v-for="(url, index) in videos" :key="url" class="references__media">
          <a :href="url" target="_blank" rel="noopener noreferrer"
            >参考视频 {{ index + 1 }} · 打开</a
          >
          <video
            :src="url"
            controls
            playsinline
            preload="none"
            :aria-label="`参考视频 ${index + 1}`"
          />
        </div>
      </section>
      <section v-if="audios.length">
        <h4>参考音频（{{ audios.length }}）</h4>
        <div v-for="(url, index) in audios" :key="url" class="references__media">
          <a :href="url" target="_blank" rel="noopener noreferrer"
            >参考音频 {{ index + 1 }} · 打开</a
          >
          <audio :src="url" controls preload="none" :aria-label="`参考音频 ${index + 1}`" />
        </div>
      </section>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Image } from 'ant-design-vue'
import type { StudioWork } from './api'

const props = defineProps<{ work: StudioWork; sourceVideoUrl?: string }>()
const expanded = ref(true)
const images = computed(() => props.work.referenceImageUrls || [])
const videos = computed(() => props.work.referenceVideoUrls || [])
const audios = computed(() => props.work.referenceAudioUrls || [])
function toggle(event: Event) {
  expanded.value = (event.currentTarget as HTMLDetailsElement).open
}
</script>

<style scoped lang="scss">
.references {
  flex-shrink: 0;
  margin: 0 16px 12px;
  color: var(--color-ink-secondary);
  font-size: 12px;

  summary {
    cursor: pointer;
    padding: 6px 0;
    span {
      margin-left: 8px;
    }
  }

  &__content {
    max-height: 200px;
    overflow: auto;
    padding: 10px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 8px;
    background: var(--color-surface-1);
  }

  section + section {
    margin-top: 12px;
  }
  h4 {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--color-ink-primary);
  }

  &__images {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
    :deep(.ant-image) {
      width: 100%;
    }
    :deep(.ant-image-img) {
      height: 72px;
      object-fit: contain;
    }
  }

  &__media {
    display: grid;
    gap: 6px;
    margin-bottom: 10px;
    a {
      color: var(--color-creative-violet);
    }
    video,
    audio {
      width: 100%;
      max-width: 360px;
    }
    video {
      max-height: 160px;
      background: var(--color-ink-primary);
    }
  }
}
</style>
