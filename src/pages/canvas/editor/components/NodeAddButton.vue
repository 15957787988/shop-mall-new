<script setup>
import { ref, computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '../../stores/flowStore'
import {
  isCreateOptionDisabled,
  countRefInputs,
  getRefTargetMode,
  countImageInputs,
  mediaLimitsFromNode
} from '../../utils/refInputConstraints'

const props = defineProps({
  id: { type: String, required: true },
  sourceType: { type: String, required: true },
  /** 'right' = 下游节点；'left' = 上游节点 */
  side: { type: String, default: 'right', validator: (v) => v === 'left' || v === 'right' }
})

const isLeft = computed(() => props.side === 'left')

const store = useFlowStore()
const { findNode, getNodes, getViewport, setCenter } = useVueFlow()

const GAP = 24 // 节点间最小间距

/** 检测矩形 a 与矩形 b 是否重叠（含间距 GAP） */
function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw + GAP && ax + aw + GAP > bx && ay < by + bh + GAP && ay + ah + GAP > by
}

/**
 * 从候选位置 (startX, startY) 开始，沿 Y 轴向下寻找不与任何已有节点重叠的空位。
 * newW / newH 是待放置节点的预估尺寸。
 */
function findFreePosition(startX, startY, newW, newH) {
  const all = getNodes.value
  let y = startY
  // 最多尝试 5 次，每次下移一个节点高度，避免被已有节点推到画布底部
  for (let i = 0; i < 5; i++) {
    const blocked = all.some((n) => {
      const nw = n.dimensions?.width ?? 220
      const nh = n.dimensions?.height ?? 120
      return overlaps(startX, y, newW, newH, n.position.x, n.position.y, nw, nh)
    })
    if (!blocked) return { x: startX, y }
    y += newH + GAP
  }
  return { x: startX, y: startY }
}

// 上传节点无输入连接点，不作为"下一节点"选项
const TYPE_OPTIONS = [
  { type: 'textNode', icon: 'T', label: '文本节点', color: '#E9CD86' },
  { type: 'imageGenNode', icon: '🎨', label: '图片节点', color: '#42b883' },
  { type: 'videoGenNode', icon: '🎬', label: '视频节点', color: '#B58F3F' },
  { type: 'audioUploadNode', icon: '🎧', label: '音频节点', color: '#C4A484' }
  // { type: 'noteNode',     icon: '📝', label: '备注',     color: '#F1D08A' },
]

const menuOptions = computed(() => {
  const targetMode = getRefTargetMode(props.sourceType)
  const needsImageQuota = isLeft.value && (targetMode === 'video' || targetMode === 'image')
  const refCounts = needsImageQuota ? countRefInputs(props.id, store.nodes, store.edges) : null
  const sourceNode = store.nodes.find((n) => n.id === props.id)
  const limits = isLeft.value ? mediaLimitsFromNode(sourceNode) : undefined
  // 右侧：本节点 → 新节点；左侧：新节点 → 本节点
  return TYPE_OPTIONS.map((opt) => {
    const edgeSourceType = isLeft.value ? opt.type : props.sourceType
    const edgeTargetType = isLeft.value ? props.sourceType : opt.type
    const edgeTargetMode = getRefTargetMode(edgeTargetType)
    const counts =
      refCounts && (edgeTargetMode === 'video' || edgeTargetMode === 'image')
        ? {
            ...refCounts,
            image: countImageInputs(props.id, store.nodes, store.edges)
          }
        : refCounts
    return {
      ...opt,
      disabled: isCreateOptionDisabled(edgeSourceType, edgeTargetType, counts, limits)
    }
  })
})

const open = ref(false)
const pickerStyle = ref({ top: '0px', left: '0px' })

function toggle(e) {
  e.stopPropagation()
  if (open.value) {
    open.value = false
    return
  }
  const rect = e.currentTarget.getBoundingClientRect()
  const PICKER_W = 160
  pickerStyle.value = {
    top: `${rect.top - 4}px`,
    left: isLeft.value ? `${Math.max(8, rect.left - PICKER_W - 8)}px` : `${rect.right + 8}px`
  }
  open.value = true
  setTimeout(() => document.addEventListener('click', close, { once: true }), 0)
}

function close() {
  open.value = false
}

function create(e, type, disabled) {
  e.stopPropagation()
  if (disabled) return
  close()

  // 从 VueFlow 内部读取当前位置和实际宽度（拖拽后也准确）
  const src = findNode(props.id)
  const x = src?.position?.x ?? 0
  const y = src?.position?.y ?? 0
  const w = src?.dimensions?.width ?? 220

  // 预估新节点尺寸（dimensions 在渲染前未知，用各类型默认值）
  const NEW_W =
    { textNode: 220, imageGenNode: 240, videoGenNode: 280, audioUploadNode: 280, noteNode: 180 }[
      type
    ] ?? 220
  const NEW_H = 120

  // 右侧 → 下游；左侧 → 上游
  const startX = isLeft.value ? x - NEW_W - 80 : x + w + 80
  const pos = findFreePosition(startX, y, NEW_W, NEW_H)
  const newNode = store.addNodeOfType(type, pos, getNodes.value)
  if (!newNode) return

  // 平滑移动视角到新节点中心，保持当前缩放
  const { zoom } = getViewport()
  setCenter(pos.x + NEW_W / 2, pos.y + NEW_H / 2, { zoom, duration: 350 })

  store.addEdge(
    isLeft.value
      ? {
          id: `edge-${newNode.id}-${props.id}-${Date.now()}`,
          source: newNode.id,
          sourceHandle: 'sr',
          target: props.id,
          targetHandle: 'tl'
        }
      : {
          id: `edge-${props.id}-${newNode.id}-${Date.now()}`,
          source: props.id,
          sourceHandle: 'sr',
          target: newNode.id,
          targetHandle: 'tl'
        }
  )

  // 左侧新建节点 = 全新工作区，面板切到新节点并清空继承
  if (isLeft.value) {
    store.setActivePanelNode(newNode.id)
    store.nodes = store.nodes.map((n) => ({ ...n, selected: n.id === newNode.id }))
  }
}
</script>

<template>
  <button
    class="node-add-btn"
    :class="{ 'node-add-btn--left': isLeft }"
    @click="toggle"
    @mousedown.stop
    :title="isLeft ? '基于本节点创建上一个' : '基于本节点创建下一个'"
    >+</button
  >

  <!-- Picker teleported to body (avoids stacking-context issues) -->
  <Teleport to="body">
    <template v-if="open">
      <div class="nab-backdrop" @click="close" @mousedown.stop />
      <div class="nab-picker" :style="pickerStyle" @click.stop @mousedown.stop>
        <div class="nab-title">{{ isLeft ? '创建上一节点' : '创建下一节点' }}</div>
        <button
          v-for="opt in menuOptions"
          :key="opt.type"
          class="nab-item"
          :class="{ current: opt.type === sourceType, disabled: opt.disabled }"
          :disabled="opt.disabled"
          @click="create($event, opt.type, opt.disabled)"
          @mousedown.stop
        >
          <span class="nab-icon" :style="{ color: opt.disabled ? undefined : opt.color }">{{
            opt.icon
          }}</span>
          <span class="nab-label">{{ opt.label }}</span>
          <span v-if="opt.type === sourceType" class="nab-same">同类型</span>
        </button>
      </div>
    </template>
  </Teleport>
</template>

<style lang="scss" scoped>

.node-add-btn {
  position: absolute;
  right: -38px;
  top: 50%;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #292927;
  border: 2px solid rgba($accent-primary, 0.53);
  color: #b5b3ac;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, border-color 0.15s, transform 0.15s;
  z-index: 10;

  &--left {
    right: auto;
    left: -38px;
  }

  &:hover {
    background: $accent-primary;
    border-color: #b5b3ac;
    color: #fff;
    transform: translateY(-50%) scale(1.15);
  }
}
</style>

<!-- Global: show button when parent canvas-node is hovered / selected -->
<style lang="scss">

.canvas-node:hover .node-add-btn,
.canvas-node.selected .node-add-btn {
  opacity: 1;
}

.nab-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
}

.nab-picker {
  position: fixed;
  z-index: 9001;
  background: #20201f;
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  padding: 4px;
  min-width: 152px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba($accent-primary, 0.12);
  animation: nab-in 0.12s ease;
}

@keyframes nab-in {
  from {
    opacity: 0;
    transform: translateX(-6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.nab-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: $text-dim;
  padding: 4px 8px 6px;
}

.nab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #c8c7c1;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  margin-bottom: 2px;
  font-family: inherit;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.047);
    color: $text-primary;
  }

  &.current {
    background: rgba($accent-primary, 0.07);
    border-color: rgba($accent-primary, 0.2);
  }

  &.disabled,
  &:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    color: $text-dim;

    &:hover {
      background: none;
      color: $text-dim;
    }
  }
}

.nab-icon {
  width: 16px;
  text-align: center;
  font-size: 13px;
  flex-shrink: 0;
}
.nab-label {
  flex: 1;
  font-size: 12px;
}

.nab-same {
  font-size: 12px;
  color: $accent-text;
  border: 1px solid rgba($accent-primary, 0.27);
  border-radius: $radius-sm;
  padding: 1px 4px;
}
</style>
