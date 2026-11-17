import { ref, onUnmounted, watch } from 'vue'
import { pageWearImage } from '../api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { PAGE_SIZE, POLL_INTERVAL, WEAR_TASK_STATUS } from '../utils/constants'
import { batchVoToResult } from '../utils/transform'
import type { TryOnResultGroup } from '../utils/types'

const hasInProgress = (groups: TryOnResultGroup[]) =>
  groups.some((group) =>
    group.images.some((img) => {
      if (img.status === WEAR_TASK_STATUS.SUCCESS && img.picUrl) return false
      if (img.status === WEAR_TASK_STATUS.FAIL) return false
      return true
    })
  )

export function useWearImageResults() {
  const { isLoggedIn, userInfo } = useAuth()
  const { addToast } = useToast()
  const results = ref<TryOnResultGroup[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  let loadedPages = 1
  let epoch = 0
  let fetching = false
  let appendQueued = false
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const fetchResults = async (silent = false, append = false) => {
    if (!isLoggedIn.value) return
    if (fetching) { if (append) appendQueued = true; return }
    const token = epoch
    fetching = true
    if (append) loadingMore.value = true
    else if (!silent) loading.value = true
    try {
      const count = append ? loadedPages + 1 : loadedPages
      const pages = await Promise.all(Array.from({ length: count }, (_, index) => pageWearImage(index + 1, PAGE_SIZE)))
      if (token !== epoch) return
      results.value = [...new Map(pages.flatMap(page => page.list ?? []).map(batchVoToResult).map(group => [group.id, group])).values()]
      loadedPages = count
      hasMore.value = !!pages[pages.length - 1].list?.length && results.value.length < pages[0].total
      if (hasInProgress(results.value)) startPolling()
      else stopPolling()
    } catch {
      if (token === epoch && (!silent || append)) addToast('获取生成结果失败', 'error')
    } finally {
      if (token === epoch) {
        fetching = false; loading.value = false; loadingMore.value = false
        if (appendQueued) { appendQueued = false; void fetchResults(true, true) }
      }
    }
  }

  const startPolling = () => {
    stopPolling()
    pollTimer = setInterval(() => {
      void fetchResults(true)
    }, POLL_INTERVAL)
  }

  watch(() => isLoggedIn.value ? userInfo.value?.id : null, () => {
    epoch++
    fetching = false
    appendQueued = false
    loadedPages = 1
    results.value = []
    hasMore.value = false
    loading.value = false
    loadingMore.value = false
    stopPolling()
    if (isLoggedIn.value) void fetchResults()
  }, { immediate: true })
  onUnmounted(() => { epoch++; stopPolling() })

  return {
    results,
    loadingMore,
    hasMore,
    loadMore: () => fetchResults(true, true),
    loading,
    fetchResults,
    startPolling,
    stopPolling,
  }
}
