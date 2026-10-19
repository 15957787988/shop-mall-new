import { ref, computed } from 'vue'

/** 分页请求切换范围后立即失效，旧响应不能覆盖当前画布。 */
export function useMediaPager(fetchPage) {
  const items = ref([])
  const total = ref(0)
  const imageCount = ref(0)
  const videoCount = ref(0)
  const kind = ref('')
  const loading = ref(false)
  const error = ref('')
  const exhausted = ref(false)
  const hasMore = computed(() => !exhausted.value && items.value.length < total.value)
  let scope = null
  let current = 0
  let revision = 0
  let ended = false

  async function load(reset) {
    if (!scope || ended || (!reset && (loading.value || !hasMore.value))) return
    const requestRevision = ++revision
    const next = reset ? 1 : current + 1
    if (reset) {
      exhausted.value = false
      items.value = []
      total.value = imageCount.value = videoCount.value = 0
      current = 0
    }
    loading.value = true
    error.value = ''
    try {
      const data = await fetchPage(scope, {
        current: next,
        size: 20,
        ...(kind.value ? { kind: kind.value } : {})
      })
      if (ended || requestRevision !== revision) return
      const list = Array.isArray(data?.list) ? data.list : []
      exhausted.value = list.length === 0
      items.value = Array.from(
        new Map([...items.value, ...list].map((item) => [item.id, item])).values()
      )
      total.value = Number(data?.total) || 0
      imageCount.value = Number(data?.imageCount) || 0
      videoCount.value = Number(data?.videoCount) || 0
      current = next
    } catch (e) {
      if (requestRevision === revision && !ended) error.value = e?.message || '加载失败，请重试'
    } finally {
      if (requestRevision === revision && !ended) loading.value = false
    }
  }
  function reset(nextScope) {
    revision++
    scope = nextScope
    items.value = []
    total.value = imageCount.value = videoCount.value = 0
    loading.value = false
    error.value = ''
    current = 0
    kind.value = ''
    return load(true)
  }
  function selectKind(value) {
    kind.value = value
    return load(true)
  }
  function dispose() {
    ended = true
    revision++
  }
  return {
    items,
    total,
    imageCount,
    videoCount,
    kind,
    loading,
    error,
    hasMore,
    reset,
    selectKind,
    refresh: () => load(true),
    loadMore: () => load(false),
    dispose
  }
}
