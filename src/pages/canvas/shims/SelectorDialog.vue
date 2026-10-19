<template>
  <a-modal
    :open="modelValue"
    :title="title"
    :width="width"
    :footer="null"
    @cancel="emit('update:modelValue', false)"
  >
    <div class="asset-tabs">
      <button type="button" :class="{ active: activeTab === 'asset' }" @click="emit('update:activeTab', 'asset')">
        从资产库选择
      </button>
      <button type="button" :class="{ active: activeTab === 'local' }" @click="emit('update:activeTab', 'local')">
        从本地上传
      </button>
    </div>
    <slot v-if="activeTab === 'asset'" name="asset" />
    <slot v-else name="local" />
  </a-modal>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  activeTab: { type: String, default: 'asset' },
  title: { type: String, default: '选择素材' },
  width: { type: String, default: '820px' },
})
const emit = defineEmits(['update:modelValue', 'update:activeTab'])
</script>

<style scoped>
.asset-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.asset-tabs button {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 6px 0;
}
.asset-tabs button.active {
  color: #3d63e8;
  border-bottom: 2px solid #3d63e8;
}
</style>
