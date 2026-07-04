<template>
  <PageContainer flush>
    <div class="t8">
      <Sidebar
        v-model:active-tab="activeTab"
        :tab-form-state="tabFormState"
        :type-selections="typeSelections"
        :selections="selections"
        :ai-writing="aiWriting"
        :is-current-tab-busy="isCurrentTabBusy"
        :can-generate="canGenerate"
        :can-replicate="canReplicate"
        :estimate-hint="estimateHint"
        :total-video-count="totalVideoCount"
        :selected-type-count="selectedTypeCount"
        @ai-write="handleAiWrite"
        @generate="handleGenerate"
        @replicate="handleReplicate"
        @toggle-type="toggleTypeChecked"
        @change-type-count="changeTypeCount"
      />

      <ResultPanel
        :active-tab="activeTab"
        :show-history-gallery="showHistoryGallery"
        :history="history"
        :history-loading="historyLoading"
        :history-page-no="historyPageNo"
        :history-total="historyTotal"
        @item-click="handleGalleryItemClick"
        @regenerate="handleRegenerate"
        @download="handleDownload"
        @page-change="handleHistoryPageChange"
        @open-type-demo="openVideoTypeDemo"
        @open-replicate-demo="openReplicateDemoVideo"
      />
    </div>

    <DemoVideoLightbox
      :open="demoPlayingVideo.open"
      :current-video="currentDemoVideo"
      :can-prev="canPrevDemoVideo"
      :can-next="canNextDemoVideo"
      @close="closeDemoVideoPlayer"
      @prev="prevDemoVideo"
      @next="nextDemoVideo"
      @keydown="handleDemoLightboxKeydown"
    />

    <VideoDetailModal
      v-model:open="videoDetail.open"
      :loading="videoDetail.loading"
      :record="videoDetail.record"
      :regenerating="regenerating"
      @close="closeVideoDetail"
      @download="handleDownload"
      @regenerate="handleRegenerate"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import PageContainer from '@/components/ui/PageContainer.vue'
import Sidebar from './components/Sidebar.vue'
import ResultPanel from './components/ResultPanel.vue'
import DemoVideoLightbox from './components/DemoVideoLightbox.vue'
import VideoDetailModal from './components/VideoDetailModal.vue'
import { useShopVideo } from './hook/useShopVideo'

const {
  activeTab,
  tabFormState,
  typeSelections,
  selections,
  aiWriting,
  history,
  historyPageNo,
  historyTotal,
  historyLoading,
  videoDetail,
  regenerating,
  demoPlayingVideo,
  currentDemoVideo,
  canPrevDemoVideo,
  canNextDemoVideo,
  totalVideoCount,
  selectedTypeCount,
  isCurrentTabBusy,
  canGenerate,
  canReplicate,
  estimateHint,
  showHistoryGallery,
  toggleTypeChecked,
  changeTypeCount,
  openVideoTypeDemo,
  openReplicateDemoVideo,
  closeDemoVideoPlayer,
  handleDemoLightboxKeydown,
  prevDemoVideo,
  nextDemoVideo,
  closeVideoDetail,
  handleHistoryPageChange,
  handleGalleryItemClick,
  handleDownload,
  handleRegenerate,
  handleAiWrite,
  handleGenerate,
  handleReplicate,
} = useShopVideo()
</script>

<style scoped lang="scss">
.t8 {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;

  @media (min-width: 1024px) {
    flex-direction: row;
  }
}
</style>
