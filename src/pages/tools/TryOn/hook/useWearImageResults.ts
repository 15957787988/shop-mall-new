import { ref, onMounted, onUnmounted, watch } from 'vue'
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
  const { isLoggedIn } = useAuth()
  const { addToast } = useToast()
  const results = ref<TryOnResultGroup[]>([])
  const loading = ref(false)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const fetchResults = async (silent = false) => {
    if (!isLoggedIn.value) {
      results.value = []
      stopPolling()
      return
    }
    if (!silent) loading.value = true
    try {
      const data = await pageWearImage(1, PAGE_SIZE)
      results.value = (data.list ?? []).map(batchVoToResult)
      if (hasInProgress(results.value)) {
        startPolling()
      } else {
        stopPolling()
      }
    } catch {
      if (!silent) addToast('获取生成结果失败', 'error')
    } finally {
      if (!silent) loading.value = false
    }
  }

  const startPolling = () => {
    stopPolling()
    pollTimer = setInterval(() => {
      void fetchResults(true)
    }, POLL_INTERVAL)
  }

  onMounted(() => {
    if (isLoggedIn.value) {
      void fetchResults(false)
    }
  })

  watch(isLoggedIn, (loggedIn) => {
    if (loggedIn) {
      void fetchResults(false)
      return
    }
    results.value = []
    stopPolling()
  })

  onUnmounted(stopPolling)

  return {
    results,
    loading,
    fetchResults,
    startPolling,
    stopPolling,
  }
}
