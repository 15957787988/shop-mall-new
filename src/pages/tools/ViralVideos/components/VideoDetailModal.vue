<template>
  <Modal
    v-model:open="open"
    :title="null"
    :footer="null"
    :width="1040"
    centered
    destroy-on-close
    class="t8__detail-modal"
    @cancel="handleClose"
  >
    <Spin :spinning="loading">
      <div v-if="record" class="t8__detail">
        <div class="t8__detail-player">
          <video
            v-if="record.videoUrl"
            ref="videoRef"
            :src="record.videoUrl"
            :poster="record.coverUrl || undefined"
            controls
            autoplay
            playsinline
            class="t8__detail-video"
          />
          <div v-else class="t8__detail-video-empty">
            {{ statusLabel(record.videoStatus) }}
          </div>
        </div>
        <aside class="t8__detail-sidebar">
          <div class="t8__detail-sidebar-head">
            <h3 class="t8__detail-sidebar-title">生成参数</h3>
          </div>
          <dl class="t8__detail-params">
            <div class="t8__detail-param">
              <dt>脚本类型</dt>
              <dd>
                {{ videoTypeLabelByCode(record.videoType) }}
                <span v-if="isTypeHot(record.videoType)">🔥</span>
              </dd>
            </div>
            <div v-if="record.country" class="t8__detail-param">
              <dt>投放地区</dt>
              <dd>{{ record.country }}</dd>
            </div>
            <div v-if="record.language" class="t8__detail-param">
              <dt>目标语言</dt>
              <dd>{{ record.language }}</dd>
            </div>
            <div v-if="record.aspectRatio" class="t8__detail-param">
              <dt>视频比例</dt>
              <dd>{{ record.aspectRatio }}</dd>
            </div>
            <div v-if="record.sellingPoints" class="t8__detail-param t8__detail-param--block">
              <dt>商品卖点信息</dt>
              <dd class="t8__detail-selling">{{ record.sellingPoints }}</dd>
            </div>
          </dl>
          <div class="t8__detail-actions">
            <Button
              v-if="record.videoUrl"
              type="primary"
              block
              size="large"
              class="t8__detail-download-btn"
              @click="emit('download', record)"
            >
              <DownloadOutlined />
              下载
            </Button>
            <Button
              block
              size="large"
              class="t8__detail-regen-btn"
              :loading="regenerating"
              @click="emit('regenerate', record)"
            >
              重新生成
            </Button>
          </div>
        </aside>
      </div>
    </Spin>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, Modal, Spin } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import type { ShopVideoRecord } from '../api'
import { isTypeHot, statusLabel, videoTypeLabelByCode } from '../utils/helpers'

defineProps<{
  loading: boolean
  record: ShopVideoRecord | null
  regenerating: boolean
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  close: []
  download: [item: ShopVideoRecord]
  regenerate: [item: ShopVideoRecord]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)

function handleClose() {
  videoRef.value?.pause()
  emit('close')
}
</script>

<style scoped lang="scss">
:deep(.t8__detail-modal .ant-modal-content) {
  padding: 0;
  overflow: hidden;
}

:deep(.t8__detail-modal .ant-modal-body) {
  padding: 0;
}

.t8__detail {
  display: flex;
  min-height: 480px;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
}

.t8__detail-player {
  flex: 1;
  min-width: 0;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
}

.t8__detail-video {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.t8__detail-video-empty {
  padding: 48px 24px;
  font-size: 14px;
  color: var(--color-ink-muted);
}

.t8__detail-sidebar {
  display: flex;
  width: 100%;
  flex-direction: column;
  border-top: 1px solid var(--color-border-whisper);
  background: white;

  @media (min-width: 768px) {
    width: 320px;
    flex-shrink: 0;
    border-top: none;
    border-left: 1px solid var(--color-border-whisper);
  }
}

.t8__detail-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.t8__detail-sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink-primary);
}

.t8__detail-params {
  margin: 0;
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.t8__detail-param {
  margin-bottom: 16px;

  dt {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  dd {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-ink-primary);
  }

  &--block dd {
    white-space: pre-wrap;
  }
}

.t8__detail-selling {
  max-height: 200px;
  overflow-y: auto;
  font-size: 13px !important;
  line-height: 1.6 !important;
  color: var(--color-ink-secondary) !important;
}

.t8__detail-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--color-border-whisper);
}

.t8__detail-download-btn {
  border-radius: 10px !important;
  background: var(--color-ink-primary) !important;
  border-color: var(--color-ink-primary) !important;
}

.t8__detail-regen-btn {
  border-radius: 10px !important;
}
</style>
