<template>
  <Modal
    :open="visible"
    title="画布资产库"
    width="1080px"
    :footer="null"
    destroy-on-close
    @cancel="emit('close')"
  >
    <AssetLibrary
      ref="library"
      selectable
      :kinds="['image', 'video']"
      :max-count="1"
      :project-id="String(route.query.projectId || '')"
      @select="insert"
      @cancel="emit('close')"
    />
  </Modal>
</template>
<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Modal } from 'ant-design-vue'
import AssetLibrary from '@/components/AssetLibrary/AssetLibrary.vue'
defineProps({
  canEdit: { type: Boolean, default: false },
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['insert-asset', 'asset-dragging', 'close'])
const route = useRoute()
const library = ref(null)
function insert(assets) {
  for (const asset of assets) emit('insert-asset', { ...asset, poster: asset.coverUrl })
  emit('close')
}
defineExpose({ reload: () => library.value?.reload() })
</script>
