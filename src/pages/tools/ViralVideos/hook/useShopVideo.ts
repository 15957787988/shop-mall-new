import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'
import { aiWriteSellingPoints } from '@/service/api/shop-image-group'
import {
  generateShopVideo,
  replicateShopVideo,
  pageShopVideo,
  getShopVideo,
  regenerateShopVideo,
  isShopVideoFinished,
  SHOP_VIDEO_STATUS,
  SHOP_VIDEO_TYPE,
  type ShopVideoRecord,
} from '@/pages/tools/ViralVideos/api'
import {
  VIDEO_TYPE_CONFIG,
  REPLICATE_DEMOS,
  MARKETS,
  LANGUAGES,
  RATIO_OPTIONS,
  MAX_VIDEO_COUNT,
  POLL_INTERVAL_MS,
  MAX_POLL_COUNT,
  HISTORY_PAGE_SIZE,
  type VideoTypeId,
} from '@/pages/tools/ViralVideos/utils/constants'
import {
  buildOssDownloadUrl,
  downloadVideoByXhr,
  tabKeyForType,
  triggerRemoteDownload,
} from '@/pages/tools/ViralVideos/utils/helpers'
import type {
  DemoVideoItem,
  TabFormState,
  TabKey,
} from '@/pages/tools/ViralVideos/utils/types'
import { MODEL_ID_SHOP_VIDEO } from '@/constants/ai-model'

export function useShopVideo() {
  const { isLoggedIn, openLogin } = useAuth()
  const { addToast } = useToast()

  const activeTab = ref<TabKey>('generate')
  const tabFormState = reactive<Record<TabKey, TabFormState>>({
    generate: { uploadedUrls: [], primaryImageIndex: 0, sellingPoints: '', referenceVideoUrl: '' },
    replicate: { uploadedUrls: [], primaryImageIndex: 0, sellingPoints: '', referenceVideoUrl: '' },
  })
  const currentForm = computed(() => tabFormState[activeTab.value])
  const typeSelections = reactive<
    Partial<Record<VideoTypeId, { checked: boolean; count: number }>>
  >({})
  const aiWriting = ref(false)
  const selections = reactive({
    market: MARKETS[0],
    language: LANGUAGES[0],
    ratioLabel: RATIO_OPTIONS[0].label,
  })

  const history = ref<ShopVideoRecord[]>([])
  const historyPageNo = ref(1)
  const historyTotal = ref(0)
  const historyLoading = ref(false)

  const videoDetail = reactive({
    open: false,
    loading: false,
    record: null as ShopVideoRecord | null,
  })
  const regenerating = ref(false)

  const demoPlayingVideo = reactive({ open: false, index: 0, playlist: [] as DemoVideoItem[] })
  const currentDemoVideo = computed(() => demoPlayingVideo.playlist[demoPlayingVideo.index] ?? null)
  const canPrevDemoVideo = computed(() => demoPlayingVideo.index > 0)
  const canNextDemoVideo = computed(
    () => demoPlayingVideo.index < demoPlayingVideo.playlist.length - 1
  )

  const videoTypeDemoPlaylist = computed<DemoVideoItem[]>(() =>
    VIDEO_TYPE_CONFIG.map((type) => ({
      url: type.previewVideo,
      title: type.label,
      desc: type.desc,
    }))
  )

  const replicateDemoPlaylist = computed<DemoVideoItem[]>(() =>
    REPLICATE_DEMOS.flatMap((pair) => [
      { url: pair.reference.video, title: pair.reference.label },
      { url: pair.output.video, title: pair.output.label },
    ])
  )

  const ratioValue = computed(
    () => RATIO_OPTIONS.find((r) => r.label === selections.ratioLabel)?.value ?? '9:16'
  )

  const totalVideoCount = computed(() =>
    VIDEO_TYPE_CONFIG.reduce((sum, type) => {
      const selection = typeSelections[type.id]
      return sum + (selection?.checked ? selection.count : 0)
    }, 0)
  )

  const selectedTypeCount = computed(
    () => VIDEO_TYPE_CONFIG.filter((type) => typeSelections[type.id]?.checked).length
  )

  function toggleTypeChecked(id: VideoTypeId, checked: boolean) {
    if (checked) {
      if (totalVideoCount.value >= MAX_VIDEO_COUNT) {
        addToast('单次最多支持选择5条视频')
        return
      }
      typeSelections[id] = { checked: true, count: 1 }
      return
    }
    const selection = typeSelections[id]
    if (!selection) return
    selection.checked = false
    selection.count = 1
  }

  function changeTypeCount(id: VideoTypeId, value: number | string | null) {
    const selection = typeSelections[id]
    if (!selection) return
    const next = Math.max(1, Number(value) || 1)
    const otherTotal = totalVideoCount.value - selection.count
    if (otherTotal + next > MAX_VIDEO_COUNT) {
      addToast('单次最多支持选择5条视频')
      selection.count = Math.max(1, MAX_VIDEO_COUNT - otherTotal)
      return
    }
    selection.count = next
  }

  function openDemoVideoGallery(playlist: DemoVideoItem[], startIndex = 0) {
    if (playlist.length === 0) return
    demoPlayingVideo.playlist = playlist
    demoPlayingVideo.index = Math.min(Math.max(0, startIndex), playlist.length - 1)
    demoPlayingVideo.open = true
  }

  function closeDemoVideoPlayer() {
    demoPlayingVideo.open = false
    demoPlayingVideo.index = 0
    demoPlayingVideo.playlist = []
  }

  function openVideoTypeDemo(typeId: VideoTypeId) {
    const idx = VIDEO_TYPE_CONFIG.findIndex((type) => type.id === typeId)
    openDemoVideoGallery(videoTypeDemoPlaylist.value, idx >= 0 ? idx : 0)
  }

  function openReplicateDemoVideo(url: string) {
    const idx = replicateDemoPlaylist.value.findIndex((item) => item.url === url)
    openDemoVideoGallery(replicateDemoPlaylist.value, idx >= 0 ? idx : 0)
  }

  function handleDemoLightboxKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeDemoVideoPlayer()
      return
    }
    if (e.key === 'ArrowLeft') {
      prevDemoVideo()
      return
    }
    if (e.key === 'ArrowRight') {
      nextDemoVideo()
    }
  }

  function prevDemoVideo() {
    if (canPrevDemoVideo.value) demoPlayingVideo.index -= 1
  }

  function nextDemoVideo() {
    if (canNextDemoVideo.value) demoPlayingVideo.index += 1
  }

  async function openVideoDetail(item: ShopVideoRecord) {
    videoDetail.open = true
    videoDetail.loading = true
    videoDetail.record = item
    try {
      videoDetail.record = await getShopVideo(item.id)
    } catch {
      // ponytail: get 不可用时沿用列表项字段
    } finally {
      videoDetail.loading = false
    }
  }

  function closeVideoDetail() {
    videoDetail.open = false
    videoDetail.record = null
  }

  function handlePollFinished(type: 1 | 2, records: ShopVideoRecord[]) {
    const failed = records.filter((r) => r.videoStatus === SHOP_VIDEO_STATUS.FAIL)
    const success = records.filter((r) => r.videoStatus === SHOP_VIDEO_STATUS.SUCCESS)
    if (failed.length === records.length) {
      addToast('视频生成失败', 'error')
    } else if (failed.length > 0) {
      addToast(`部分完成：${success.length} 成功，${failed.length} 失败`, 'success')
    } else {
      addToast('全部视频生成完成', 'success')
    }
    if (activeTab.value === tabKeyForType(type)) {
      void loadHistory(historyPageNo.value)
    }
  }

  function useTabVideoPolling(videoType: 1 | 2) {
    const pendingIds = ref<number[]>([])
    const generating = ref(false)
    const pollCount = ref(0)

    const { polling: isPolling, start, stop } = usePolling<ShopVideoRecord[]>({
      interval: POLL_INTERVAL_MS,
      fetcher: async () => {
        const page = await pageShopVideo({
          pageNo: 1,
          pageSize: 50,
          type: videoType,
        })
        return page.list ?? []
      },
      shouldStop: (list) => {
        if (pendingIds.value.length === 0) return true
        const tracked = list.filter((r) => pendingIds.value.includes(r.id))
        if (tracked.length === 0) return pollCount.value > MAX_POLL_COUNT
        return (
          tracked.every((r) => isShopVideoFinished(r.videoStatus)) ||
          pollCount.value > MAX_POLL_COUNT
        )
      },
      onData: (list) => {
        pollCount.value++
        if (activeTab.value === tabKeyForType(videoType)) {
          void loadHistory(historyPageNo.value)
        }
        const tracked = list.filter((r) => pendingIds.value.includes(r.id))
        const allFinished =
          tracked.length > 0 && tracked.every((r) => isShopVideoFinished(r.videoStatus))
        if (allFinished) {
          handlePollFinished(videoType, tracked)
          generating.value = false
          pendingIds.value = []
        } else if (pollCount.value > MAX_POLL_COUNT) {
          stop()
          generating.value = false
          addToast('轮询超时，请稍后在历史中查看', 'error')
        }
      },
      onError: () => {
        pollCount.value++
        if (pollCount.value > MAX_POLL_COUNT) {
          stop()
          generating.value = false
        }
      },
    })

    function startPoll(ids: number[]) {
      stop()
      pollCount.value = 0
      pendingIds.value = ids
      start()
    }

    return { pendingIds, generating, isPolling, startPoll, stop }
  }

  const generatePolling = useTabVideoPolling(SHOP_VIDEO_TYPE.GENERATE)
  const replicatePolling = useTabVideoPolling(SHOP_VIDEO_TYPE.REPLICATE)

  function scrollToGallery() {
    document.querySelector('.t8__gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function getTabPolling(type: 1 | 2) {
    return type === SHOP_VIDEO_TYPE.GENERATE ? generatePolling : replicatePolling
  }

  const isCurrentTabBusy = computed(() =>
    activeTab.value === 'generate'
      ? generatePolling.generating.value || generatePolling.isPolling.value
      : replicatePolling.generating.value || replicatePolling.isPolling.value
  )

  const canGenerate = computed(
    () =>
      tabFormState.generate.uploadedUrls.length > 0 &&
      tabFormState.generate.sellingPoints.trim().length > 0 &&
      totalVideoCount.value > 0 &&
      !generatePolling.generating.value &&
      !generatePolling.isPolling.value
  )

  const canReplicate = computed(
    () =>
      tabFormState.replicate.uploadedUrls.length > 0 &&
      Boolean(tabFormState.replicate.referenceVideoUrl) &&
      !replicatePolling.generating.value &&
      !replicatePolling.isPolling.value
  )

  const estimateHint = computed(() =>
    activeTab.value === 'generate' ? '首条生成可享 129 算力优惠' : '按 volcanArk 多模态单条计价'
  )

  const showHistoryGallery = computed(
    () => isLoggedIn.value && (historyLoading.value || historyTotal.value > 0)
  )

  function buildGenerateReq() {
    const form = tabFormState.generate
    const videoTypes = VIDEO_TYPE_CONFIG.filter((type) => typeSelections[type.id]?.checked).map(
      (type) => ({
        videoType: type.videoType,
        count: typeSelections[type.id]!.count,
      })
    )

    return {
      productImages: form.uploadedUrls.slice(0, 3),
      sellingPoints: form.sellingPoints.trim(),
      country: selections.market,
      language: selections.language,
      aspectRatio: ratioValue.value,
      type: SHOP_VIDEO_TYPE.GENERATE as 1,
      modelId: MODEL_ID_SHOP_VIDEO,
      videoTypes,
    }
  }

  function buildReplicateReq() {
    const form = tabFormState.replicate
    return {
      productImages: form.uploadedUrls.slice(0, 5),
      referenceVideoUrl: form.referenceVideoUrl,
      country: selections.market,
      language: selections.language,
      aspectRatio: ratioValue.value,
      sellingPoints: form.sellingPoints.trim() || undefined,
      modelId: MODEL_ID_SHOP_VIDEO,
    }
  }

  async function loadHistory(page = historyPageNo.value) {
    if (!isLoggedIn.value) {
      history.value = []
      historyTotal.value = 0
      return
    }
    historyLoading.value = true
    try {
      const pageResult = await pageShopVideo({
        pageNo: page,
        pageSize: HISTORY_PAGE_SIZE,
        type: activeTab.value === 'generate' ? SHOP_VIDEO_TYPE.GENERATE : SHOP_VIDEO_TYPE.REPLICATE,
      })
      history.value = pageResult.list ?? []
      historyTotal.value = pageResult.total ?? 0
      historyPageNo.value = page
    } catch {
      // 历史加载失败不阻断主流程
    } finally {
      historyLoading.value = false
    }
  }

  function handleHistoryPageChange(page: number) {
    void loadHistory(page)
    document.querySelector('.t8__main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleGalleryItemClick(item: ShopVideoRecord) {
    if (item.videoUrl) {
      void openVideoDetail(item)
      return
    }
    if (item.videoStatus === SHOP_VIDEO_STATUS.FAIL) {
      return
    }
    const type = activeTab.value === 'generate' ? SHOP_VIDEO_TYPE.GENERATE : SHOP_VIDEO_TYPE.REPLICATE
    const poller = getTabPolling(type)
    if (!poller.isPolling.value) {
      poller.generating.value = true
      poller.startPoll([item.id])
    }
  }

  function handleDownload(item: ShopVideoRecord) {
    if (!item.videoUrl) return
    const fileName = `video-${item.id}.mp4`
    void downloadVideoByXhr(item.videoUrl, fileName).catch(() => {
      triggerRemoteDownload(buildOssDownloadUrl(item.videoUrl!, fileName))
    })
  }

  async function handleRegenerate(item: ShopVideoRecord) {
    if (!isLoggedIn.value) {
      openLogin()
      return
    }
    const type = activeTab.value === 'generate' ? SHOP_VIDEO_TYPE.GENERATE : SHOP_VIDEO_TYPE.REPLICATE
    const poller = getTabPolling(type)
    if (poller.generating.value || poller.isPolling.value) {
      addToast('请等待当前任务完成', 'error')
      return
    }
    regenerating.value = true
    try {
      const id = await regenerateShopVideo(item.id)
      addToast('重新生成任务已提交', 'success')
      closeVideoDetail()
      poller.generating.value = true
      historyPageNo.value = 1
      await loadHistory(1)
      poller.startPoll([id])
      scrollToGallery()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '重新生成失败', 'error')
    } finally {
      regenerating.value = false
    }
  }

  async function handleAiWrite() {
    if (!isLoggedIn.value) {
      openLogin()
      return
    }
    if (currentForm.value.uploadedUrls.length === 0) {
      addToast('请先上传产品图', 'error')
      return
    }
    aiWriting.value = true
    try {
      const text = await aiWriteSellingPoints(currentForm.value.uploadedUrls)
      currentForm.value.sellingPoints = text
      addToast('卖点已生成', 'success')
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'AI 帮写失败', 'error')
    } finally {
      aiWriting.value = false
    }
  }

  async function handleGenerate() {
    if (!isLoggedIn.value) {
      openLogin()
      return
    }
    if (!tabFormState.generate.sellingPoints.trim()) {
      addToast('请填写商品卖点', 'error')
      return
    }
    generatePolling.generating.value = true
    try {
      const ids = await generateShopVideo(buildGenerateReq())
      addToast('爆款视频任务已提交', 'success')
      historyPageNo.value = 1
      await loadHistory(1)
      generatePolling.startPoll(ids)
      scrollToGallery()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '提交失败', 'error')
      generatePolling.generating.value = false
    }
  }

  async function handleReplicate() {
    if (!isLoggedIn.value) {
      openLogin()
      return
    }
    replicatePolling.generating.value = true
    try {
      const id = await replicateShopVideo(buildReplicateReq())
      addToast('复刻任务已提交', 'success')
      historyPageNo.value = 1
      await loadHistory(1)
      replicatePolling.startPoll([id])
      scrollToGallery()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '提交失败', 'error')
      replicatePolling.generating.value = false
    }
  }

  watch(activeTab, () => {
    historyPageNo.value = 1
    closeVideoDetail()
    void loadHistory(1)
  })

  watch(isLoggedIn, (loggedIn) => {
    if (loggedIn) {
      historyPageNo.value = 1
      void loadHistory(1)
      return
    }
    history.value = []
    historyTotal.value = 0
  })

  onMounted(() => {
    loadHistory()
  })

  return {
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
  }
}
