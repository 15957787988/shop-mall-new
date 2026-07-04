<template>
  <Modal
    :open="open"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    :width="680"
    wrap-class-name="t8__demo-lightbox-wrap"
    centered
    destroy-on-close
    @cancel="emit('close')"
    @after-open-change="handleOpenChange"
  >
    <div
      ref="lightboxRef"
      class="t8__demo-lightbox-panel"
      tabindex="-1"
      @keydown="emit('keydown', $event)"
    >
      <header class="t8__demo-lightbox-head">
        <div class="t8__demo-lightbox-head-text">
          <h2 class="t8__demo-lightbox-title">{{ currentVideo?.title }}</h2>
          <span v-if="currentVideo?.desc" class="t8__demo-lightbox-desc">
            {{ currentVideo.desc }}
          </span>
        </div>
        <button
          type="button"
          class="t8__demo-lightbox-close"
          aria-label="关闭"
          @click="emit('close')"
        >
          <CloseOutlined />
        </button>
      </header>

      <div class="t8__demo-lightbox-stage">
        <button
          v-if="canPrev"
          type="button"
          class="t8__demo-lightbox-nav t8__demo-lightbox-nav--prev"
          aria-label="上一个"
          @click="emit('prev')"
        >
          <LeftOutlined />
        </button>

        <video
          v-if="currentVideo?.url"
          :key="currentVideo.url"
          :src="currentVideo.url"
          controls
          autoplay
          playsinline
          class="t8__demo-lightbox-video"
        />

        <button
          v-if="canNext"
          type="button"
          class="t8__demo-lightbox-nav t8__demo-lightbox-nav--next"
          aria-label="下一个"
          @click="emit('next')"
        >
          <RightOutlined />
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Modal } from 'ant-design-vue'
import { CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import type { DemoVideoItem } from '../utils/types'

defineProps<{
  open: boolean
  currentVideo: DemoVideoItem | null
  canPrev: boolean
  canNext: boolean
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
  keydown: [e: KeyboardEvent]
}>()

const lightboxRef = ref<HTMLElement | null>(null)

function handleOpenChange(open: boolean) {
  if (open) {
    void nextTick(() => lightboxRef.value?.focus())
  }
}
</script>

<style scoped lang="scss">
:global(.t8__demo-lightbox-wrap .ant-modal-body) {
  padding: 0;
}

:global(.t8__demo-lightbox-wrap .ant-modal-content) {
  overflow: hidden;
  border-radius: 16px;
}

.t8__demo-lightbox-panel {
  display: flex;
  width: min(680px, 100%);
  max-height: calc(100vh - 48px);
  flex-direction: column;
  outline: none;
}

.t8__demo-lightbox-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
}

.t8__demo-lightbox-head-text {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.t8__demo-lightbox-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink-primary);
}

.t8__demo-lightbox-desc {
  font-size: 14px;
  color: var(--color-ink-muted);
}

.t8__demo-lightbox-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-ink-secondary);
  font-size: 16px;
  cursor: pointer;

  &:hover {
    background: var(--color-surface-2);
  }
}

.t8__demo-lightbox-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 56px 28px;
}

.t8__demo-lightbox-video {
  width: 100%;
  max-width: 280px;
  max-height: min(500px, calc(100vh - 180px));
  aspect-ratio: 9 / 16;
  border-radius: 8px;
  background: #111;
  object-fit: cover;
}

.t8__demo-lightbox-nav {
  position: absolute;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 16px;
  transform: translateY(-50%);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.95);
  }

  &--prev {
    left: 16px;
  }

  &--next {
    right: 16px;
  }
}
</style>
