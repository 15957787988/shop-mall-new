<template>
  <div v-if="hasMore || loading" ref="sentinel" class="auto-load-more" role="status">
    <span v-if="loading">加载中…</span>
    <button v-else-if="attempted" type="button" @click="request(true)">继续加载</button>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps<{ hasMore: boolean; loading?: boolean; count: number }>()
const emit = defineEmits<{ load: [] }>()
const sentinel = ref<HTMLElement>()
const attempted = ref(false)
let observer: IntersectionObserver | undefined
let visible = false
let requestedCount = -1
function request(manual = false) {
  if (!props.hasMore || props.loading || (!manual && (!visible || requestedCount === props.count))) return
  requestedCount = props.count
  attempted.value = true
  emit('load')
}
watch([() => props.count, () => props.loading, () => props.hasMore], async (_, previous) => {
  if (!props.hasMore || props.count < (previous?.[0] ?? 0)) { requestedCount = -1; attempted.value = false }
  await nextTick()
  request()
})
watch(sentinel, (element, previous) => {
  if (previous) observer?.unobserve(previous)
  visible = false
  if (element) observer?.observe(element)
})
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    request()
  })
  if (sentinel.value) observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>
<style scoped lang="scss">
.auto-load-more { min-height: 40px; display: flex; align-items: center; justify-content: center; padding: 12px; color: var(--color-ink-muted); font-size: 13px; }
.auto-load-more button { border: 0; background: transparent; color: inherit; cursor: pointer; }
</style>
