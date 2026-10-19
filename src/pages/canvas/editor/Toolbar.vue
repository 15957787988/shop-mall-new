<script setup>
import { nextTick, ref } from 'vue'
import {
  Plus,
  Pointer,
  Rank,
  Memo,
  MapLocation,
  FolderOpened,
  Clock,
  Document,
  Picture,
  VideoCamera,
  Headset
} from '../shims/icons'

const activeTool = defineModel('activeTool', { default: 'select' })
const showMinimap = defineModel('showMinimap', { default: false })
const showAssetLibrary = defineModel('showAssetLibrary', { default: false })

const props = defineProps({ historyEnabled: { type: Boolean, default: false } })
const mediaPanel = defineModel('mediaPanel', { default: '' })
const emit = defineEmits(['add-node'])

const addMenuOpen = ref(false)
const addBtnRef = ref(null)
const addMenuRef = ref(null)
const addMenuPos = ref({ top: 60, left: 64 })

const NODE_TYPES = [
  { type: 'textNode', icon: Document, label: '文本' },
  { type: 'imageGenNode', icon: Picture, label: '图片节点' },
  { type: 'videoGenNode', icon: VideoCamera, label: '视频节点' },
  { type: 'audioUploadNode', icon: Headset, label: '音频节点' }
]

const mainTools = [
  { id: 'add', icon: Plus, label: '添加' },
  { id: 'select', icon: Pointer, label: '选择' },
  { id: 'move', icon: Rank, label: '移动' },
  { id: 'note', icon: Memo, label: '便签' }
]

const extraTools = [
  { id: 'assets', icon: FolderOpened, label: '资产库' },
  { id: 'history', icon: Clock, label: '生成记录' },
  { id: 'minimap', icon: MapLocation, label: '小图' }
]

function updateAddMenuPos() {
  if (!addBtnRef.value) return
  const rect = addBtnRef.value.getBoundingClientRect()
  addMenuPos.value = { top: rect.top, left: rect.right + 8 }
}

function onDragStart(e, type) {
  e.dataTransfer.setData('application/vueflow', type)
  e.dataTransfer.effectAllowed = 'move'
  closeAddMenu()
}

function closeAddMenu() {
  const wasOpen = addMenuOpen.value
  addMenuOpen.value = false
  if (wasOpen) addBtnRef.value?.focus()
}

async function onMainToolKey(event, tool) {
  if (event.repeat) return
  onMainToolClick(tool)
  if (tool.id === 'add' && addMenuOpen.value) {
    await nextTick()
    addMenuRef.value?.querySelector('[role="button"]')?.focus()
  }
}

function addNode(type) {
  emit('add-node', type)
  closeAddMenu()
}

function onMainToolClick(tool) {
  if (tool.id === 'add') {
    if (!addMenuOpen.value) updateAddMenuPos()
    addMenuOpen.value = !addMenuOpen.value
    return
  }
  if (tool.id === 'select' || tool.id === 'move') {
    activeTool.value = tool.id
    closeAddMenu()
    return
  }
  if (tool.id === 'note') {
    addNode('noteNode')
    return
  }
  closeAddMenu()
}

function onExtraToolClick(tool) {
  closeAddMenu()
  if (tool.id === 'assets') {
    showAssetLibrary.value = !showAssetLibrary.value
    return
  }
  if (tool.id === 'history') {
    mediaPanel.value = mediaPanel.value === tool.id ? '' : tool.id
  }
  if (tool.id === 'minimap') {
    showMinimap.value = !showMinimap.value
  }
}

function isToolActive(tool) {
  if (tool.id === 'assets') return showAssetLibrary.value
  if (tool.id === 'history') return mediaPanel.value === tool.id
  if (tool.id === 'minimap') return showMinimap.value
  return activeTool.value === tool.id
}
</script>

<template>
  <aside class="toolbar" @click.stop>
    <div class="toolbar-pill">
      <div class="tool-group">
        <div
          v-for="tool in mainTools"
          :key="tool.id"
          :ref="
            tool.id === 'add'
              ? (el) => {
                  addBtnRef = el
                }
              : undefined
          "
          :class="[
            'tool-item',
            {
              active: isToolActive(tool),
              'menu-open': tool.id === 'add' && addMenuOpen
            }
          ]"
          role="button"
          tabindex="0"
          :aria-pressed="['select', 'move'].includes(tool.id) ? isToolActive(tool) : undefined"
          :aria-expanded="tool.id === 'add' ? addMenuOpen : undefined"
          @keydown.enter.prevent="onMainToolKey($event, tool)"
          @keydown.space.prevent="onMainToolKey($event, tool)"
          @keydown.esc.prevent="closeAddMenu"
          @click="onMainToolClick(tool)"
          :title="tool.label"
        >
          <span class="tool-icon-wrap">
            <component :is="tool.icon" class="tool-icon" />
          </span>
          <span class="tool-label">{{ tool.label }}</span>
        </div>
      </div>

      <div class="tool-divider" />

      <div class="tool-group">
        <div
          v-for="tool in extraTools.filter((tool) => tool.id !== 'history' || props.historyEnabled)"
          :key="tool.id"
          :class="['tool-item', { active: isToolActive(tool) }]"
          role="button"
          tabindex="0"
          :aria-pressed="isToolActive(tool)"
          @keydown.enter.prevent="onExtraToolClick(tool)"
          @keydown.space.prevent="onExtraToolClick(tool)"
          @click="onExtraToolClick(tool)"
          :title="tool.label"
        >
          <span class="tool-icon-wrap">
            <component :is="tool.icon" class="tool-icon" />
          </span>
          <span class="tool-label">{{ tool.label }}</span>
        </div>
      </div>
    </div>

    <!-- Add node popup -->
    <Teleport to="body">
      <div v-if="addMenuOpen" class="toolbar-overlay">
        <div class="add-backdrop" @click="closeAddMenu" />
        <div
          ref="addMenuRef"
          class="add-menu"
          :style="{ top: addMenuPos.top + 'px', left: addMenuPos.left + 'px' }"
        >
          <div class="add-menu-section">添加节点</div>
          <div
            v-for="item in NODE_TYPES"
            :key="item.type"
            class="add-menu-item"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="!$event.repeat && addNode(item.type)"
            @keydown.space.prevent="!$event.repeat && addNode(item.type)"
            @keydown.esc.prevent="closeAddMenu"
            draggable="true"
            @dragstart="onDragStart($event, item.type)"
            @click="addNode(item.type)"
          >
            <component :is="item.icon" class="add-icon" aria-hidden="true" />
            <span class="add-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style lang="scss" scoped>

.toolbar {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 210;
  user-select: none;
}

.toolbar-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  background: #292927;
  border: 1px solid #45453f;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
}

.tool-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.tool-divider {
  width: calc(100% - 8px);
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 2px 0;
}

.tool-item:focus-visible {
  outline: 2px solid $text-muted;
  outline-offset: 2px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 6px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
  color: #deddd7;

  &:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #ffffff;
  }

  &.active,
  &.menu-open {
    background: rgba($accent-primary, 0.14);
    color: $accent-text;
  }
}

.tool-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.tool-icon {
  width: 16px;
  height: 16px;
}

.tool-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>

<style lang="scss">

.toolbar-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  pointer-events: none;
}

.add-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
}

.add-menu {
  position: absolute;
  z-index: 9001;
  background: #292927;
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  padding: 6px;
  min-width: 160px;
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba($accent-primary, 0.1);
  backdrop-filter: blur(12px);
  animation: add-menu-in 0.12s ease;
  pointer-events: auto;
}

@keyframes add-menu-in {
  from {
    opacity: 0;
    transform: translateX(-6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.add-menu-section {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #aaa9a4;
  padding: 4px 8px 6px;
}

.add-menu-item:focus-visible {
  outline: 2px solid $text-muted;
  outline-offset: -2px;
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: $radius-md;
  cursor: grab;
  transition: background 0.12s;
  color: #c8c7c1;
  font-size: 12px;

  &:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #f1f0ed;
  }

  &:active {
    cursor: grabbing;
  }
}

.add-icon {
  width: 18px;
  height: 18px;
  color: currentColor;
  flex-shrink: 0;
}

.add-label {
  font-size: 12px;
}
</style>
