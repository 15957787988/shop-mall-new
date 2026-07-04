<template>
  <div class="t8__demo-grid">
    <div
      v-for="type in VIDEO_TYPE_CONFIG"
      :key="type.id"
      class="t8__demo-card"
      @click="emit('open-demo', type.id)"
    >
      <div class="t8__demo-video-wrap">
        <video
          :src="type.previewVideo"
          muted
          playsinline
          preload="metadata"
          class="t8__demo-video"
        />
        <span class="t8__demo-play">
          <PlayCircleOutlined />
        </span>
      </div>
      <h3 class="t8__demo-card-title">{{ type.label }}</h3>
      <p class="t8__demo-card-desc">{{ type.desc }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import { VIDEO_TYPE_CONFIG, type VideoTypeId } from '../utils/constants'

const emit = defineEmits<{
  'open-demo': [typeId: VideoTypeId]
}>()
</script>

<style scoped lang="scss">
.t8__demo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 12px;
  max-width: 720px;
  margin: 0 auto;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 24px 16px;
  }
}

.t8__demo-card {
  cursor: pointer;

  &:hover .t8__demo-play {
    background: rgba(0, 0, 0, 0.72);
  }
}

.t8__demo-video-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background: #111;
  aspect-ratio: 9 / 16;
}

.t8__demo-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.t8__demo-play {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 14px;
  pointer-events: none;
}

.t8__demo-card-title {
  margin: 8px 0 2px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  color: var(--color-ink-primary);
}

.t8__demo-card-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  color: var(--color-ink-muted);
}
</style>
