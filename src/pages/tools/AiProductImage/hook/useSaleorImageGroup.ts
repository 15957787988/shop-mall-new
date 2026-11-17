import { ref, onBeforeUnmount, watch } from 'vue'
import { generateShopImageGroup, pageShopImageGroup } from '../api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { DETAIL_STATUS_GENERATING, PAGE_SIZE, POLL_INTERVAL } from '../utils/constants'
import { formToGenerateReq, groupVoToResult } from '../utils/transform'
import type { SaleorFormData, SaleorResultGroup } from '../utils/types'

const hasInProgress = (groups: SaleorResultGroup[]) =>
  groups.some(group => group.status === 0 ||
    group.images.some(img => img.status === DETAIL_STATUS_GENERATING))

export function useSaleorImageGroup() {
  const { isLoggedIn, userInfo } = useAuth()
  const { addToast } = useToast()
  const results = ref<SaleorResultGroup[]>([])
  const loading = ref(false)
  const generating = ref(false)
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<void> | null = null
  const loadingMore = ref(false)
  const hasMore = ref(false)
  let loadedPages = 1
  let epoch = 0
  let disposed = false
  let submitting = false

  function stopPolling() {
    if (pollTimer !== null) clearTimeout(pollTimer)
    pollTimer = null
  }

  function fetchResults(silent = false, append = false): Promise<void> {
    if (disposed || !isLoggedIn.value) return Promise.resolve()
    if (inFlight) return append ? inFlight.then(() => fetchResults(silent, true)) : inFlight
    stopPolling()
    const current = epoch
    if (append) loadingMore.value = true
    else if (!silent) loading.value = true
    inFlight = (async () => {
      try {
        const count = append ? loadedPages + 1 : loadedPages
        const pages = await Promise.all(Array.from({ length: count }, (_, index) => pageShopImageGroup(index + 1, PAGE_SIZE)))
        const data = { list: pages.flatMap(page => page.list ?? []), total: pages[0].total }
        if (disposed || current !== epoch) return
        results.value = [...new Map((data.list ?? []).map(groupVoToResult).map(group => [group.id, group])).values()]
        hasMore.value = !!pages[pages.length - 1].list?.length && results.value.length < data.total
        loadedPages = count
      } catch {
        if (!disposed && current === epoch && (!silent || append)) addToast('获取套图列表失败', 'error')
      } finally {
        if (!disposed && current === epoch) {
          loading.value = false
          loadingMore.value = false
          inFlight = null
          if (hasInProgress(results.value)) {
            pollTimer = setTimeout(() => {
              pollTimer = null
              void fetchResults(true)
            }, POLL_INTERVAL)
          }
        }
      }
    })()
    return inFlight
  }

  async function handleGenerate(form: SaleorFormData) {
    if (submitting || !isLoggedIn.value) return
    submitting = true
    generating.value = true
    try {
      const groupId = await generateShopImageGroup(formToGenerateReq(form))
      addToast('套图生成任务已提交，正在生成中...', 'success')
      // 提交前发出的列表请求可能不含新任务，等它结束后再刷新。
      if (inFlight) await inFlight
      await fetchResults(false)
      return groupId
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '生成失败', 'error')
    } finally {
      submitting = false
      generating.value = false
    }
  }

  watch(() => isLoggedIn.value ? userInfo.value?.id ?? null : null, () => {
    epoch++
    stopPolling()
    inFlight = null
    results.value = []
    loadedPages = 1
    hasMore.value = false
    loadingMore.value = false
    loading.value = false
    if (isLoggedIn.value) void fetchResults(false)
  }, { immediate: true })

  onBeforeUnmount(() => {
    disposed = true
    epoch++
    stopPolling()
  })

  return { results, loadingMore, hasMore, loadMore: () => fetchResults(true, true), loading, generating, fetchResults, handleGenerate }
}
