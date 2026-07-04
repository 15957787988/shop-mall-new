<template>
  <section class="t8__main scroll-area">
    <div
      class="t8__main-inner"
      :class="{ 't8__main-inner--vcenter': !showHistoryGallery && activeTab === 'replicate' }"
    >
      <div v-if="!showHistoryGallery" class="t8__hero">
        <h1 class="t8__hero-title">
          {{ activeTab === 'generate' ? '爆款电商视频' : '爆款视频复刻' }}
        </h1>
        <p class="t8__hero-desc">
          {{
            activeTab === 'generate'
              ? '上传商品图，AI 一键批量生成多类型高转化视频。'
              : '上传商品图和参考视频，AI 一键批量复刻高转化视频。'
          }}
        </p>
      </div>

      <HistoryGallery
        v-if="showHistoryGallery"
        :active-tab="activeTab"
        :history="history"
        :loading="historyLoading"
        :page-no="historyPageNo"
        :total="historyTotal"
        @item-click="emit('item-click', $event)"
        @regenerate="emit('regenerate', $event)"
        @download="emit('download', $event)"
        @page-change="emit('page-change', $event)"
      />

      <template v-if="!showHistoryGallery">
        <GenerateDemoGrid
          v-if="activeTab === 'generate'"
          @open-demo="emit('open-type-demo', $event)"
        />
        <ReplicateDemoGrid
          v-if="activeTab === 'replicate'"
          @open-demo="emit('open-replicate-demo', $event)"
        />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ShopVideoRecord } from '../api'
import type { TabKey } from '../utils/types'
import { type VideoTypeId } from '../utils/constants'
import HistoryGallery from './HistoryGallery.vue'
import GenerateDemoGrid from './GenerateDemoGrid.vue'
import ReplicateDemoGrid from './ReplicateDemoGrid.vue'

defineProps<{
  activeTab: TabKey
  showHistoryGallery: boolean
  history: ShopVideoRecord[]
  historyLoading: boolean
  historyPageNo: number
  historyTotal: number
}>()

const emit = defineEmits<{
  'item-click': [item: ShopVideoRecord]
  regenerate: [item: ShopVideoRecord]
  download: [item: ShopVideoRecord]
  'page-change': [page: number]
  'open-type-demo': [typeId: VideoTypeId]
  'open-replicate-demo': [url: string]
}>()
</script>

<style scoped lang="scss">
.t8__main {
  order: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-1);
  padding: 16px;

  @media (min-width: 1024px) {
    height: 100%;
  }
}

.t8__main-inner {
  margin: 0 auto;
  width: 100%;

  &--vcenter {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100%;
  }
}

.t8__hero {
  text-align: center;
  margin-bottom: 40px;

  .t8__main-inner--vcenter & {
    margin-bottom: 32px;
  }
}

.t8__hero-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--color-ink-primary);

  @media (min-width: 1024px) {
    font-size: 30px;
  }
}

.t8__hero-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-ink-secondary);
}
</style>
