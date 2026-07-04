import { ref, onUnmounted } from 'vue'

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>
  interval?: number
  shouldStop?: (data: T) => boolean
  onData?: (data: T) => void
  onError?: (err: unknown) => void
}

export function usePolling<T>(options: UsePollingOptions<T>) {
  const { fetcher, interval = 3000, shouldStop, onData, onError } = options
  const polling = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    polling.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const tick = async () => {
    try {
      const data = await fetcher()
      onData?.(data)
      if (shouldStop?.(data)) stop()
    } catch (err) {
      onError?.(err)
    }
  }

  const start = () => {
    if (polling.value) return
    polling.value = true
    tick()
    timer = setInterval(tick, interval)
  }

  onUnmounted(stop)

  return { polling, start, stop }
}
