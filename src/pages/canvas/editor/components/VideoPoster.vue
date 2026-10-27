<script setup>
import { computed, ref, watch } from 'vue'
import { videoPoster } from '../../utils/videoPoster'

const props = defineProps({
  source: { type: String, default: '' },
  poster: { type: String, default: '' }
})
const url = computed(() => videoPoster(props.source, props.poster))
const failed = ref(false)
watch(url, () => { failed.value = false })
</script>

<template>
  <img v-if="url && !failed" :src="url" alt="视频封面" referrerpolicy="no-referrer" loading="lazy" decoding="async" @error="failed = true" />
  <span v-else class="video-poster-placeholder" aria-label="视频暂无可用封面">视频</span>
</template>

<style scoped>
.video-poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #20201f;
  color: #aaa;
  font-size: 12px;
}
</style>
