<template>
  <div class="asset-picker">
    <p v-if="subtitle">{{ subtitle }}</p>
    <button v-if="showRefresh" type="button" :disabled="loading" @click="emit('refresh')">刷新素材</button>
    <p v-if="!items.length">{{ emptyText }}</p>
    <label v-for="item in items" :key="item.id" class="asset-picker__row">
      <input type="checkbox" :checked="selectedKeys.includes(item.id)" @change="toggle(item.id)" />
      <span>{{ item.name || item.url }}</span>
    </label>
    <div class="asset-picker__actions">
      <button type="button" @click="emit('cancel')">取消</button>
      <button type="button" @click="emit('confirm', picked)">确定</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  subtitle: { type: String, default: '' },
  emptyText: { type: String, default: '暂无可选素材' },
  showRefresh: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:selectedKeys', 'refresh', 'cancel', 'confirm'])

const picked = computed(() => props.items.filter((item) => props.selectedKeys.includes(item.id)))

function toggle(id) {
  const next = props.selectedKeys.includes(id)
    ? props.selectedKeys.filter((key) => key !== id)
    : [...props.selectedKeys, id]
  emit('update:selectedKeys', next)
}
</script>

<style scoped>
.asset-picker__row {
  display: flex;
  gap: 8px;
  margin: 6px 0;
}
.asset-picker__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
