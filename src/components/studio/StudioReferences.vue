<template>
  <details v-if="items.length" class="references" open @toggle="toggle">
    <summary>参考素材</summary>
    <Tabs v-if="expanded" v-model:active-key="activeType" size="small" destroy-inactive-tab-pane>
      <Tabs.TabPane
        v-for="group in groups"
        :key="group.key"
        :tab="`${group.label} ${group.items.length}`"
      >
        <div class="references__grid">
          <template v-for="item in group.items" :key="item.key">
            <div v-if="item.kind === 'image'" class="references__tile">
              <Image :src="item.url" :alt="`参考图片 ${item.number}`" loading="lazy" />
              <span class="references__number">{{ item.number }}</span>
            </div>
            <button
              v-else
              type="button"
              class="references__tile references__button"
              :aria-label="`播放${item.label} ${item.number}`"
              @click="preview = item"
            >
              <video
                v-if="item.kind === 'video'"
                :src="item.url"
                muted
                playsinline
                preload="metadata"
                aria-hidden="true"
                @loadedmetadata="rememberDuration(item.url, $event)"
              />
              <CustomerServiceOutlined v-else class="references__audio-icon" />
              <audio
                v-if="item.kind === 'audio'"
                :src="item.url"
                preload="metadata"
                @loadedmetadata="rememberDuration(item.url, $event)"
              />
              <span class="references__number">{{ item.number }}</span>
              <span v-if="item.kind === 'video'" class="references__play"
                ><CaretRightOutlined
              /></span>
              <span v-if="durations[item.url]" class="references__duration">{{
                durations[item.url]
              }}</span>
            </button>
          </template>
        </div>
      </Tabs.TabPane>
    </Tabs>
    <Modal
      v-if="preview"
      :open="true"
      :title="`${preview.label} ${preview.number}`"
      :footer="null"
      :width="720"
      centered
      destroy-on-close
      @cancel="preview = null"
    >
      <video
        v-if="preview.kind === 'video'"
        :key="preview.url"
        :src="preview.url"
        class="references__player"
        controls
        autoplay
        playsinline
        preload="metadata"
        :aria-label="`${preview.label} ${preview.number}`"
      />
      <audio
        v-else
        :key="preview.url"
        :src="preview.url"
        class="references__audio-player"
        controls
        autoplay
        preload="metadata"
        :aria-label="`${preview.label} ${preview.number}`"
      />
    </Modal>
  </details>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Image, Modal, Tabs } from 'ant-design-vue'
import { CaretRightOutlined, CustomerServiceOutlined } from '@ant-design/icons-vue'
import type { StudioWork } from '@/service/api/studio'
interface ReferenceItem {
  key: string
  url: string
  kind: 'image' | 'video' | 'audio'
  label: string
  number: number
}
const props = defineProps<{ work: StudioWork; sourceVideoUrl?: string }>()
const expanded = ref(true)
const activeType = ref('images')
const preview = ref<ReferenceItem | null>(null)
const durations = ref<Record<string, string>>({})
const groups = computed(() => {
  const definitions = [
    {
      key: 'source',
      label: '原视频',
      kind: 'video' as const,
      urls: props.sourceVideoUrl ? [props.sourceVideoUrl] : [],
    },
    {
      key: 'images',
      label: '图片',
      kind: 'image' as const,
      urls: props.work.referenceImageUrls || [],
    },
    {
      key: 'videos',
      label: '视频',
      kind: 'video' as const,
      urls: props.work.referenceVideoUrls || [],
    },
    {
      key: 'audios',
      label: '音频',
      kind: 'audio' as const,
      urls: props.work.referenceAudioUrls || [],
    },
  ]
  return definitions
    .filter((group) => group.urls.length)
    .map((group) => ({
      ...group,
      items: group.urls.map(
        (url, index): ReferenceItem => ({
          key: `${group.key}-${index}`,
          url,
          kind: group.kind,
          label: group.label,
          number: index + 1,
        })
      ),
    }))
})
const items = computed(() => groups.value.flatMap((group) => group.items))
watch(
  groups,
  (value) => {
    if (!value.some((group) => group.key === activeType.value))
      activeType.value = value[0]?.key || 'images'
  },
  { immediate: true }
)
watch(
  () => props.work,
  () => {
    preview.value = null
  }
)
function rememberDuration(url: string, event: Event) {
  const duration = (event.currentTarget as HTMLMediaElement).duration
  if (Number.isFinite(duration) && duration > 0)
    durations.value[url] = `${Math.round(duration * 10) / 10}s`
}
function toggle(event: Event) {
  expanded.value = (event.currentTarget as HTMLDetailsElement).open
  if (!expanded.value) preview.value = null
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
  }
  :deep(.ant-tabs-nav) {
    margin-bottom: 8px;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    max-height: min(360px, 45vh);
    overflow: auto;
    padding: 3px;
  }
  &__tile {
    position: relative;
    min-width: 0;
    aspect-ratio: 1;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    overflow: hidden;
    background: var(--color-surface-1);
    :deep(.ant-image) {
      width: 100%;
      height: 100%;
      display: block;
    }
    :deep(.ant-image-img),
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  &__button {
    padding: 0;
    cursor: pointer;
    color: var(--color-ink-primary);
    video {
      object-fit: cover;
      pointer-events: none;
      display: block;
    }
    audio {
      display: none;
    }
    &:hover {
      border-color: var(--color-ink-primary);
    }
    &:focus-visible {
      outline: 2px solid var(--color-ink-primary);
      outline-offset: 1px;
    }
  }
  &__number,
  &__duration,
  &__play {
    position: absolute;
    color: var(--color-surface-1);
    background: var(--color-ink-primary);
    pointer-events: none;
  }
  &__number {
    top: 4px;
    left: 4px;
    min-width: 18px;
    height: 18px;
    padding: 0 3px;
    border-radius: 10px;
    text-align: center;
    line-height: 18px;
    font-size: 11px;
  }
  &__duration {
    bottom: 3px;
    right: 3px;
    padding: 0 3px;
    border-radius: 4px;
    font-size: 10px;
  }
  &__play {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  &__audio-icon {
    font-size: 28px;
  }
  &__player {
    display: block;
    width: 100%;
    max-height: 70vh;
    background: var(--color-ink-primary);
  }
  &__audio-player {
    display: block;
    width: 100%;
    margin: 20px 0;
  }
}
</style>
