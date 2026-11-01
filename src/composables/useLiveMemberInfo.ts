import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { setOnPointsChanged } from '@/service/http'

/** 全局一处刷新：消费立即同步，并覆盖后台延迟结算、其他页面或窗口产生的扣费。 */
export function useLiveMemberInfo() {
  const auth = useAuthStore()
  let interval: ReturnType<typeof setInterval> | undefined
  let scheduled: ReturnType<typeof setTimeout> | undefined

  function refresh(followUp = false) {
    if (auth.isLoggedIn && document.visibilityState === 'visible') void auth.fetchUserInfo(followUp)
  }
  function scheduleRefresh() {
    if (!auth.isLoggedIn || scheduled) return
    scheduled = setTimeout(() => {
      scheduled = undefined
      refresh(true)
    }, 150)
  }
  function onVisible() { refresh() }
  function stop() {
    clearInterval(interval)
    clearTimeout(scheduled)
    interval = undefined
    scheduled = undefined
  }

  const stopWatching = watch(
    [() => auth.isLoggedIn, () => auth.sessionVersion],
    ([loggedIn]) => {
      stop()
      if (!loggedIn) return
      refresh()
      interval = setInterval(() => refresh(), 5000)
    },
    { immediate: true },
  )
  onMounted(() => {
    setOnPointsChanged(scheduleRefresh)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
  })
  onBeforeUnmount(() => {
    stop()
    stopWatching()
    setOnPointsChanged(null)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onVisible)
  })
}
