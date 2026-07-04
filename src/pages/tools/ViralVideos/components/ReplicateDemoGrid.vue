<template>
  <div class="t8__replicate-demos">
    <div v-for="(pair, index) in REPLICATE_DEMOS" :key="index" class="t8__replicate-card">
      <div class="t8__replicate-pair">
        <div class="t8__replicate-item" @click="emit('open-demo', pair.reference.video)">
          <div class="t8__demo-video-wrap t8__demo-video-wrap--replicate">
            <video
              :src="pair.reference.video"
              muted
              playsinline
              preload="metadata"
              class="t8__demo-video"
            />
            <span class="t8__demo-play">
              <PlayCircleOutlined />
            </span>
            <div class="t8__replicate-product">
              <img
                v-if="pair.productImage"
                :src="pair.productImage"
                alt=""
                class="t8__replicate-product-img"
              />
              <span class="t8__replicate-product-label">商品图</span>
            </div>
          </div>
          <p class="t8__demo-card-label">{{ pair.reference.label }}</p>
        </div>

        <div class="t8__replicate-arrow" aria-hidden="true">
          <svg viewBox="0 0 48 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 18C14 8 34 8 44 18"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <path
              d="M36 13L44 18L36 23"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="t8__replicate-item" @click="emit('open-demo', pair.output.video)">
          <div class="t8__demo-video-wrap t8__demo-video-wrap--replicate">
            <video
              :src="pair.output.video"
              muted
              playsinline
              preload="metadata"
              class="t8__demo-video"
            />
            <span class="t8__demo-play">
              <PlayCircleOutlined />
            </span>
          </div>
          <p class="t8__demo-card-label">{{ pair.output.label }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import { REPLICATE_DEMOS } from '../utils/constants'

const emit = defineEmits<{
  'open-demo': [url: string]
}>()
</script>

<style scoped lang="scss">
.t8__replicate-demos {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;

  @media (min-width: 768px) {
    gap: 24px;
  }
}

.t8__replicate-card {
  flex: 0 0 auto;
  width: fit-content;
  border-radius: 16px;
  border: 1px solid var(--color-border-whisper);
  background: white;
  padding: 28px 20px 24px;
  box-shadow: var(--shadow-soft);
}

.t8__replicate-pair {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
}

.t8__replicate-item {
  flex: 0 0 132px;
  width: 132px;
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

  &--replicate {
    border-radius: 12px;
  }
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

.t8__demo-card-label {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  font-weight: 500;
  color: var(--color-ink-primary);
}

.t8__replicate-product {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 46px;
  min-height: 58px;
  overflow: hidden;
  border-radius: 6px;
  border: 2px solid white;
  background: var(--color-surface-2);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16);
  pointer-events: none;
}

.t8__replicate-product-img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.t8__replicate-product-label {
  display: block;
  padding: 2px 0 3px;
  font-size: 9px;
  line-height: 1.2;
  text-align: center;
  color: white;
  background: rgba(0, 0, 0, 0.55);
}

.t8__replicate-arrow {
  flex-shrink: 0;
  width: 44px;
  height: 28px;
  margin-bottom: 36px;
  color: #93c5fd;

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
}
</style>
