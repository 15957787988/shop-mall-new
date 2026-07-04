<template>
  <div class="t8__gallery">
    <div class="t8__gallery-header">
      <h2 class="t8__gallery-title">
        {{ activeTab === 'generate' ? '生成爆款结果' : '爆款复刻结果' }}
      </h2>
    </div>

    <Spin :spinning="loading">
      <div v-if="history.length" class="t8__gallery-grid">
        <div
          v-for="item in history"
          :key="item.id"
          class="t8__gallery-card"
          @click="emit('item-click', item)"
        >
          <div class="t8__gallery-cover">
            <img
              v-if="item.coverUrl"
              :src="item.coverUrl"
              alt=""
              class="t8__gallery-cover-img"
            />
            <div v-else class="t8__gallery-cover-placeholder">
              <ReloadOutlined
                v-if="!isShopVideoFinished(item.videoStatus)"
                spin
                class="t8__gallery-placeholder-icon"
              />
              <span
                v-if="!isShopVideoFinished(item.videoStatus)"
                class="t8__gallery-placeholder-time"
              >
                预计5～10分钟
              </span>
              <span v-else class="t8__gallery-placeholder-text">
                {{ statusLabel(item.videoStatus) }}
              </span>
            </div>

            <span v-if="item.videoUrl" class="t8__gallery-play">
              <PlayCircleOutlined />
            </span>

            <div v-if="isShopVideoFinished(item.videoStatus)" class="t8__gallery-hover">
              <button
                type="button"
                class="t8__gallery-action-btn"
                @click.stop="emit('regenerate', item)"
              >
                重新生成
              </button>
              <button
                v-if="item.videoUrl"
                type="button"
                class="t8__gallery-action-btn"
                @click.stop="emit('download', item)"
              >
                <DownloadOutlined />
                下载
              </button>
            </div>

            <div class="t8__gallery-meta">
              <span class="t8__gallery-type">
                {{ videoTypeLabelByCode(item.videoType) }}
                <span v-if="isTypeHot(item.videoType)">🔥</span>
              </span>
              <span v-if="item.createTime" class="t8__gallery-time">
                {{ formatRecordTime(item.createTime) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Pagination
        v-if="total > HISTORY_PAGE_SIZE"
        class="t8__gallery-pagination"
        :current="pageNo"
        :total="total"
        :page-size="HISTORY_PAGE_SIZE"
        :show-size-changer="false"
        @change="emit('page-change', $event)"
      />
    </Spin>
  </div>
</template>

<script setup lang="ts">
import { Pagination, Spin } from 'ant-design-vue'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import { isShopVideoFinished, type ShopVideoRecord } from '../api'
import { HISTORY_PAGE_SIZE } from '../utils/constants'
import {
  formatRecordTime,
  isTypeHot,
  statusLabel,
  videoTypeLabelByCode,
} from '../utils/helpers'
import type { TabKey } from '../utils/types'

defineProps<{
  activeTab: TabKey
  history: ShopVideoRecord[]
  loading: boolean
  pageNo: number
  total: number
}>()

const emit = defineEmits<{
  'item-click': [item: ShopVideoRecord]
  regenerate: [item: ShopVideoRecord]
  download: [item: ShopVideoRecord]
  'page-change': [page: number]
}>()
</script>

<style scoped lang="scss">
.t8__gallery {
  margin-bottom: 32px;
}

.t8__gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.t8__gallery-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-ink-primary);
}

.t8__gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 1100px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.t8__gallery-card {
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);

    .t8__gallery-play {
      opacity: 0;
    }

    .t8__gallery-hover {
      opacity: 1;
      pointer-events: auto;
    }

    .t8__gallery-cover-img {
      filter: brightness(0.55);
    }
  }
}

.t8__gallery-cover {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: #111;
  aspect-ratio: 9 / 12;
}

.t8__gallery-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.2s;
}

.t8__gallery-cover-placeholder {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-2);
  color: var(--color-ink-muted);
}

.t8__gallery-placeholder-icon {
  font-size: 20px;
  color: var(--color-creative-violet);
  margin-right: 6px;
}

.t8__gallery-placeholder-time {
  font-size: 12px;
}

.t8__gallery-placeholder-text {
  font-size: 11px;
}

.t8__gallery-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-ink-primary);
  font-size: 24px;
  transform: translate(-50%, -50%);
  opacity: 0.95;
  transition: opacity 0.2s;
  pointer-events: none;
}

.t8__gallery-hover {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 16px 28%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.t8__gallery-action-btn {
  display: inline-flex;
  min-width: 120px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 9999px;
  background: white;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink-primary);
  cursor: pointer;
  transition: transform 0.1s;

  &:hover {
    transform: scale(1.03);
  }
}

.t8__gallery-meta {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 32px 12px 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
}

.t8__gallery-type {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.t8__gallery-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
}

.t8__gallery-pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
