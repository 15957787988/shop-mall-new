<script setup>
import { ref, computed, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import { useFlowStore } from '../../stores/flowStore'
import NodeHeader from './NodeHeader.vue'
import NodeAddButton from './NodeAddButton.vue'
import NodeGenLoading from './NodeGenLoading.vue'
import '@vue-flow/node-resizer/dist/style.css'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const store = useFlowStore()
const { getNodes } = useVueFlow()
const editing = ref(false)
const textareaRef = ref(null)
const localContent = ref(props.data.content || '')
const isGenerating = computed(() => !!props.data?.generating)
const genError = computed(() => {
  if (props.data?.generating) return ''
  if (props.data?.genError) return props.data.genError
  if (!props.data?.content && /失败/.test(props.data?.label || '')) return '生成失败，请重试'
  return ''
})

async function startEdit() {
  editing.value = true
  localContent.value = props.data.content || ''
  await nextTick()
  textareaRef.value?.focus()
}

function stopEdit() {
  if (!editing.value) return
  editing.value = false
  store.updateNodeData(
    props.id,
    { content: localContent.value, outputValue: localContent.value },
    getNodes.value
  )
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    stopEdit()
    return
  }
  if (e.key === 'Enter' && e.ctrlKey) {
    stopEdit()
    return
  }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    // 内容已空时再按删除键，避免事件冒泡到画布快捷键误删节点
    if (!localContent.value) {
      e.preventDefault()
    }
    return
  }
}

function onResizeEnd() {
  store.syncLivePositions(getNodes.value)
}
</script>

<template>
  <NodeResizer v-if="selected" :min-width="200" :min-height="100" @resize-end="onResizeEnd" />

  <div :class="['canvas-node', 'text-node', { selected }]">
    <Handle id="tl" type="target" :position="Position.Left" />
    <NodeAddButton :id="id" source-type="textNode" side="left" />

    <NodeHeader
      :id="id"
      :label="data.label || '文本节点'"
      :cost-points="Number(data.costPoints) || 0"
      current-type="textNode"
      :generating="isGenerating"
      :gen-error="genError"
      :has-result="!!data.content"
    />

    <div class="node-body text-body nodrag nopan" @dblclick.stop="startEdit">
      <NodeGenLoading v-if="isGenerating" compact class="text-gen-loading" />
      <textarea
        v-else-if="editing"
        ref="textareaRef"
        v-model="localContent"
        @input="store.updateNodeData(id, { content: localContent, outputValue: localContent }, getNodes)"
        class="text-editor nodrag nopan"
        @blur="stopEdit"
        @keydown.stop="onKeydown"
        @mousedown.stop
        @pointerdown.stop
        @click.stop
        placeholder="输入内容..."
      />
      <div v-else-if="genError" class="text-preview text-error">{{ genError }}</div>
      <div v-else class="text-preview nodrag nopan">{{ data.content || '双击编辑内容...' }}</div>
    </div>

    <Handle id="sr" type="source" :position="Position.Right" />
    <NodeAddButton :id="id" source-type="textNode" />
  </div>
</template>

<style lang="scss" scoped>

.text-node {
  width: 100%;
  height: 100%;
  min-width: 200px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.text-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.text-editor,
.text-preview {
  flex: 1;
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: $border-default transparent;
  user-select: text;
  cursor: text;
}

.text-editor {
  background: $bg-surface;
  border: 1px solid rgba($accent-primary, 0.35);
  border-radius: $radius-sm;
  color: $text-primary;
  padding: 6px 8px;
  outline: none;
  resize: none;
  font-family: inherit;
}

.text-preview {
  color: #c8c7c1;
}

.text-error {
  color: #ff6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px 16px;
}

.text-gen-loading {
  flex: 1;
  min-height: 0;
  border-radius: $radius-sm;
}
</style>
