<script setup>
import { computed } from 'vue'
import { BaseEdge, getBezierPath, useVueFlow } from '@vue-flow/core'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  selected: Boolean,
  markerEnd: String,
  markerStart: String
})

const { getNodes } = useVueFlow()

const geometry = computed(() => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition
  })
  return { path, labelX, labelY }
})

const lit = computed(() => {
  if (props.selected) return true
  const nodes = getNodes.value
  const source = nodes.find((n) => n.id === props.source)
  const target = nodes.find((n) => n.id === props.target)
  return !!(source?.selected || target?.selected)
})
</script>

<template>
  <path class="flow-quiet" :d="geometry.path" />
  <path v-if="lit" class="flow-run" :d="geometry.path" />
  <BaseEdge
    :id="id"
    :path="geometry.path"
    :label-x="geometry.labelX"
    :label-y="geometry.labelY"
    :marker-end="markerEnd"
    :marker-start="markerStart"
  />
</template>
