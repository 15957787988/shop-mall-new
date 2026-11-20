import { ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { generateShopImageGroup, pageShopImageGroup } from '@/pages/product-set/api'
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
  const page = ref(1)
  const total = ref(0)
  let epoch = 0
  let disposed = false
  let submitting = false

  function stopPolling() {
    if (pollTimer !== null) clearTimeout(pollTimer)
    pollTimer = null
  }

  function fetchResults(silent = false, no = page.value): Promise<void> {
    if (disposed || !isLoggedIn.value) return Promise.resolve()
    if (silent && inFlight) return inFlight
    stopPolling()
    const current = ++epoch
    if (!silent) loading.value = true
    inFlight = (async () => {
      try {
        const data = await pageShopImageGroup(no, PAGE_SIZE)
        if (disposed || current !== epoch) return
        const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
        if (no > lastPage) { inFlight = null; await fetchResults(false, lastPage); return }
        results.value = (data.list ?? []).map(groupVoToResult)
        total.value = data.total
        page.value = no
      } catch {
        if (!disposed && current === epoch && !silent) addToast('获取套图列表失败', 'error')
      } finally {
        if (!disposed && current === epoch) {
          loading.value = false
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
      await fetchResults(false, 1)
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
    page.value = 1
    total.value = 0
    loading.value = false
    if (isLoggedIn.value) void fetchResults(false)
  })

  onMounted(() => {
    if (isLoggedIn.value) void fetchResults(false)
  })

  onBeforeUnmount(() => {
    disposed = true
    epoch++
    stopPolling()
  })

  return { results, page, total, pageSize: PAGE_SIZE, changePage: (no: number) => fetchResults(false, no), loading, generating, fetchResults, handleGenerate }
}
