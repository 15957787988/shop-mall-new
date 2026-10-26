<script setup>
import { computed, onMounted, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useRoute } from 'vue-router'
import { useFlowStore } from '../../stores/flowStore'
import { useShotBreakdown } from '../../composables/useShotBreakdown'
import { STAGE_LABEL } from '../../utils/breakdownTaxonomy'
import { useMessage } from '../../shims/message'
import { breakdownApi } from '../../api/breakdownApi'
import NodeHeader from './NodeHeader.vue'
import NodeGenLoading from './NodeGenLoading.vue'
import RhythmBar from './shot/RhythmBar.vue'
import ShotTable from './shot/ShotTable.vue'
import GatePanel from './shot/GatePanel.vue'

const props = defineProps({
  id: String,
  data: Object,
  selected: Boolean
})

const route = useRoute()
const store = useFlowStore()
const message = useMessage()
const projectId = computed(() => String(route.query.projectId || ''))
const query = ref('')
const category = ref('')
const sort = ref('timeline')
const activeId = ref('')
const sourceNode = computed(() => store.nodes.find((node) => node.id === props.data?.sourceNodeId))

const breakdown = useShotBreakdown({
  projectId,
  nodeId: props.id,
  getData: () => props.data,
  updateNodeData: (patch) => store.updateNodeData(props.id, patch)
})

const shots = computed(() => {
  const list = [...(breakdown.doc.value?.shots || [])]
  const q = query.value.trim().toLowerCase()
  let next = list.filter((shot) => {
    if (category.value && shot.category !== category.value) return false
    if (!q) return true
    return [shot.id, shot.frame, shot.audio].join(' ').toLowerCase().includes(q)
  })
  if (sort.value === 'long') next.sort((a, b) => Number(b.seconds) - Number(a.seconds))
  if (sort.value === 'short') next.sort((a, b) => Number(a.seconds) - Number(b.seconds))
  return next
})

const total = computed(() => Number(breakdown.doc.value?.meta?.durationSeconds) || breakdown.stats.value?.totalSeconds || 0)
const categories = computed(() => [...new Set((breakdown.doc.value?.shots || []).map((shot) => shot.category).filter(Boolean))])

onMounted(() => {
  breakdown.resume()
  if (props.data?.breakdownStage === 'queued' && !props.data?.breakdownId) {
    void start()
  }
})

async function start() {
  const src = sourceNode.value?.data?.src
  if (!src) {
    message.warning('先上传或生成视频')
    return
  }
  try {
    await breakdown.submit({
      videoUrl: src,
      title: sourceNode.value?.data?.label || props.data?.label || '拉片'
    })
  } catch (err) {
    breakdown.error.value = err?.message || '拉片提交失败'
    breakdown.stage.value = 'failed'
    message.error(breakdown.error.value)
  }
}

function seek(seconds) {
  message.info(`定位到 ${Number(seconds).toFixed(2)}s`)
}

function locate(shotId) {
  if (!shotId) return
  activeId.value = shotId
  document.getElementById(`shot-${shotId}`)?.scrollIntoView({ block: 'nearest' })
}

async function exportMd() {
  if (!props.data?.breakdownId) return
  const blob = await breakdownApi.exportMd(projectId.value, props.data.breakdownId)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `shots-${props.data.breakdownId}.md`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <div :class="['canvas-node', 'shot-list-node', { selected }]">
    <Handle id="tl" type="target" :position="Position.Left" />
    <NodeHeader :id="id" :label="data?.label || '拉片'" />
    <div class="shot-body">
      <div v-if="breakdown.stage.value === 'idle' || (!data?.breakdownId && breakdown.stage.value === 'failed')" class="shot-empty">
        <p>从左侧视频拆出逐镜头表：时长由画面检测，景别和运镜由模型填写。</p>
        <button type="button" class="shot-primary" @click="start">开始拉片</button>
        <p v-if="breakdown.error.value" class="shot-error">{{ breakdown.error.value }}</p>
      </div>
      <NodeGenLoading
        v-else-if="breakdown.stage.value !== 'done' && breakdown.stage.value !== 'failed'"
        :hint="`${STAGE_LABEL[breakdown.stage.value] || breakdown.stage.value}${breakdown.stageDetail.value ? ' · ' + breakdown.stageDetail.value : ''}`"
      />
      <div v-else-if="breakdown.stage.value === 'failed'" class="shot-empty">
        <p class="shot-error">{{ breakdown.error.value || data?.genError || '拉片失败' }}</p>
        <button type="button" class="shot-primary" @click="start">重试</button>
      </div>
      <template v-else>
        <div class="shot-summary">
          <span>{{ breakdown.stats.value?.count || 0 }} 镜</span>
          <span>平均 {{ breakdown.stats.value?.avgSeconds || 0 }}s</span>
          <span>{{ breakdown.stats.value?.cutsPerMinute || 0 }} 切/分</span>
          <button type="button" @click="exportMd">导出 md</button>
        </div>
        <RhythmBar :shots="breakdown.doc.value?.shots || []" :total="total" @seek="seek" />
        <div class="shot-tools">
          <input v-model="query" placeholder="搜索镜号、画面、台词" @mousedown.stop @keydown.stop />
          <select v-model="category" @mousedown.stop>
            <option value="">全部类别</option>
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="sort" @mousedown.stop>
            <option value="timeline">时间顺序</option>
            <option value="long">时长从长到短</option>
            <option value="short">时长从短到长</option>
          </select>
        </div>
        <ShotTable :shots="shots" :frames="breakdown.frames.value" :active-id="activeId" @seek="seek" />
        <GatePanel :gates="breakdown.gates.value" @locate="locate" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.shot-list-node {
  width: 760px;
}
.shot-body {
  padding: 10px 12px 12px;
}
.shot-empty {
  min-height: 120px;
  color: #deddd7;
  font-size: 13px;
}
.shot-primary,
.shot-summary button,
.shot-tools select,
.shot-tools input {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #deddd7;
  border-radius: 6px;
  font: inherit;
}
.shot-primary {
  padding: 6px 12px;
  cursor: pointer;
}
.shot-error {
  color: #ff8d8d;
}
.shot-summary,
.shot-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  color: #deddd7;
  font-size: 12px;
}
.shot-summary button,
.shot-tools select,
.shot-tools input {
  padding: 4px 8px;
}
.shot-tools input {
  flex: 1;
}
</style>
