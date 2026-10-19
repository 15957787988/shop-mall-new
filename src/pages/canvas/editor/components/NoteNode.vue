<script setup>
import { ref, computed } from 'vue'
import { useFlowStore } from '../../stores/flowStore'
import { NodeResizer } from '@vue-flow/node-resizer'
import '@vue-flow/node-resizer/dist/style.css'
import ScopeToggle from './ScopeToggle.vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const store = useFlowStore()
const editing = ref(false)
const localContent = ref(props.data.content || '')

const NOTE_COLORS = ['#f5c542', '#ff7f7f', '#7fd1f5', '#7ff5a0', '#d07ff5']
const noteColor = computed(() => props.data?.color || NOTE_COLORS[0])

function startEdit() {
  editing.value = true
  localContent.value = props.data.content
}

function stopEdit() {
  editing.value = false
  store.updateNodeData(props.id, { content: localContent.value })
}

function onKeydown(e) {
  if (e.key === 'Escape') stopEdit()
  e.stopPropagation()
}

function setColor(c) {
  store.updateNodeData(props.id, { color: c })
}
</script>

<template>
  <NodeResizer v-if="selected" :min-width="160" :min-height="100" />

  <div
    :class="['note-node', { selected }]"
    :style="{ '--note-accent': noteColor }"
    @dblclick.stop="startEdit"
  >
    <div v-if="selected" class="note-toolbar">
      <div class="color-dots">
        <span
          v-for="c in NOTE_COLORS"
          :key="c"
          class="color-dot"
          :style="{ background: c }"
          @click.stop="setColor(c)"
        />
      </div>
      <ScopeToggle :node-id="id" />
      <button class="node-del" @click.stop="store.confirmRemoveNodeById(id)" title="删除">×</button>
    </div>

    <textarea
      v-if="editing"
      v-model="localContent"
      class="note-editor nodrag nopan"
      @input="store.updateNodeData(id, { content: localContent })"
      @blur="stopEdit"
      @keydown="onKeydown"
      @mousedown.stop
      @pointerdown.stop
      @click.stop
      autofocus
    />
    <div v-else class="note-content nodrag nopan">
      {{ data.content || '双击添加备注...' }}
    </div>

  </div>
</template>

<style lang="scss" scoped>

.note-node {
  min-width: 160px;
  min-height: 100px;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: color-mix(in srgb, var(--note-accent) 7%, #25272d);
  border: 1px solid color-mix(in srgb, var(--note-accent) 22%, #44464e);
  border-top: 3px solid color-mix(in srgb, var(--note-accent) 65%, #44464e);
  padding: 14px 16px;
  color: #eeeef1;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  position: relative;
  cursor: default;
  box-sizing: border-box;

  &.selected {
    box-shadow: 0 0 0 2px #9b9eab, 0 6px 18px rgba(0, 0, 0, 0.25);
  }
}

.note-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.color-dots {
  display: flex;
  gap: 4px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;

  &:hover {
    opacity: 1;
    transform: scale(1.3);
  }
}

.note-content {
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  cursor: text;
}

.note-editor {
  width: 100%;
  min-height: 60px;
  color: #eeeef1;
  caret-color: var(--note-accent);
  padding: 0;
  box-sizing: border-box;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  line-height: 1.75;
  font-family: inherit;
  resize: none;
  white-space: pre-wrap;
  user-select: text;
  cursor: text;
}

</style>
