<script setup>
import { ref, nextTick, computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '../../stores/flowStore'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, default: '节点' },
  costPoints: { type: Number, default: 0 },
  dimensions: { type: String, default: '' },
  generating: { type: Boolean, default: false },
  genError: { type: String, default: '' },
  hasResult: { type: Boolean, default: false },
  deletable: { type: Boolean, default: true }
})

const displayLabel = computed(() => {
  const raw = props.label || '节点'
  const showFail =
    !props.generating && !props.hasResult && (!!props.genError || /（失败）/.test(raw))
  if (showFail) return raw
  return raw.replace(/（失败）/g, '')
})

const editingLabel = ref(false)
const labelInput = ref(null)
const localLabel = ref(props.label)

async function startLabelEdit(e) {
  e.stopPropagation()
  localLabel.value = props.label
  editingLabel.value = true
  await nextTick()
  labelInput.value?.focus()
  labelInput.value?.select()
}

function stopLabelEdit() {
  if (!editingLabel.value) return
  editingLabel.value = false
  const val = localLabel.value.trim() || props.label
  if (val !== props.label) {
    store.updateNodeData(props.id, { label: val }, getNodes.value)
  }
}

function onLabelKeydown(e) {
  if (e.key === 'Enter' || e.key === 'Escape') stopLabelEdit()
  e.stopPropagation()
}

const store = useFlowStore()
const { getNodes } = useVueFlow()

function onDelete(e) {
  e.stopPropagation()
  store.confirmRemoveNodeById(props.id)
}
</script>

<template>
  <div class="node-header">
    <input
      v-if="editingLabel"
      ref="labelInput"
      v-model="localLabel"
      class="node-label-input"
      @blur="stopLabelEdit"
      @keydown="onLabelKeydown"
      @click.stop
      @mousedown.stop
    />
    <span v-else class="node-label" @dblclick.stop="startLabelEdit" title="双击编辑名称">{{
      displayLabel
    }}</span>
    <span v-if="dimensions" class="node-dimensions" :title="dimensions">{{ dimensions }}</span>
    <span v-if="costPoints > 0" class="node-cost" title="预计消耗">约 {{ costPoints }} 积分</span>

    <slot />
    <button v-if="deletable" class="node-del" @click.stop="onDelete" title="删除节点">×</button>
  </div>
</template>

<style lang="scss" scoped>

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid $border-default;
  border-radius: 9px 9px 0 0;
  position: relative;
}

.node-label {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  cursor: text;
}

.node-label-input {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: $text-primary;
  background: $bg-surface;
  border: 1px solid rgba($accent-primary, 0.53);
  border-radius: $radius-sm;
  padding: 1px 5px;
  outline: none;
  font-family: inherit;
}

.node-dimensions {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: $text-dim;
  white-space: nowrap;
}

.node-cost {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: $text-dim;
  white-space: nowrap;
}

.node-del {
  background: none;
  border: 1px solid #3a3a5c;
  color: #aaa9a4;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
  flex-shrink: 0;

  &:hover {
    color: #ff4d4d;
    background: rgba(#ff4d4d, 0.13);
    border-color: rgba(#ff4d4d, 0.4);
  }
}
</style>
