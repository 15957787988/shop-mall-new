import { ref, computed, onUnmounted } from 'vue'

export function useSmsCooldown() {
  const seconds = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const start = (duration = 60) => {
    seconds.value = duration
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      if (seconds.value <= 1) {
        if (timer) clearInterval(timer)
        seconds.value = 0
      } else {
        seconds.value -= 1
      }
    }, 1000)
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return {
    seconds,
    start,
    sending: computed(() => seconds.value > 0),
  }
}
