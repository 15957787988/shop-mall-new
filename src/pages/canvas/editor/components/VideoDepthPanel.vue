<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useVueFlow } from '@vue-flow/core'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { videoDepthApi } from '../../api/videoDepthApi'
import { isDepthPendingNode, isDepthActive, depthTaskLabel, depthTaskPatch } from '../../utils/videoDepth'
import { useFlowStore } from '../../stores/flowStore'

const props = defineProps({ readonly: Boolean, projectId: [String, Number], targetId: String, saveCanvas: Function })
const store = useFlowStore()
const { nodes } = storeToRefs(store)
const { getNodes } = useVueFlow()
const settingsOpen = ref(false)
defineExpose({ openSettings: () => { settingsOpen.value = true; void refreshConfig() } })
const config = ref(null)
const configError = ref('')
const checking = ref(false)
const submitting = ref(new Set())
// 每个面板只操作所属视频节点，不随全局选中项切换任务。
const target = computed(() => nodes.value.find((n) => n.id === props.targetId && isDepthPendingNode(n)))
const source = computed(() => nodes.value.find((n) => n.id === target.value?.data.depthSourceNodeId))
const task = computed(() => target.value ? {
  state: target.value.data.depthState, stage: target.value.data.depthStage,
} : null)
const resolution = computed(() => target.value?.data.depthResolution || "standard")
function selectResolution(value) {
  if (!target.value || active.value || props.readonly) return
  patch(target.value.id, { depthResolution: value })
}
const busy = computed(() => submitting.value.has(target.value?.id))
const active = computed(() => isDepthActive(task.value) || task.value?.state === 'SUBMITTING')
let timer, disposed = false, epoch = 0
onBeforeUnmount(() => { disposed = true; epoch++; clearTimeout(timer) })
function patch(id, data) {
  const current = nodes.value.find((n) => n.id === id)
  if (!isDepthPendingNode(current)) return
  if (Object.entries(data).some(([key, value]) => current.data[key] !== value))
    store.updateNodeResult(id, data, getNodes.value)
}
async function refreshConfig() {
  if (checking.value) return
  checking.value = true
  const version = epoch
  try {
    const result = await videoDepthApi.config()
    if (disposed || version !== epoch) return
    config.value = result
    configError.value = ''
  } catch (e) {
    if (!disposed && version === epoch) configError.value = e.message || '无法读取推理服务状态'
  } finally { if (!disposed && version === epoch) checking.value = false }
}
async function poll(version) {
  if (disposed || version !== epoch) return
  const entries = target.value?.data.depthTaskId && target.value.data.depthState !== 'FAILED' ? [target.value] : []
  await Promise.allSettled(entries.map(async (node) => {
    const taskId = node.data.depthTaskId
    try {
      const result = await videoDepthApi.get(taskId)
      if (disposed || version !== epoch) return
      const current = nodes.value.find((n) => n.id === node.id)
      const update = depthTaskPatch(current, result)
      if (update) {
        patch(node.id, update)
        if (result.state === 'SUCCEEDED' || result.state === 'FAILED') await props.saveCanvas?.()
      }
    } catch (e) {
      if (!disposed && version === epoch) patch(node.id, { depthError: '状态查询中断，后台仍会继续，正在重新连接…' })
    }
  }))
  if (!disposed && version === epoch) timer = setTimeout(() => poll(version), 3000)
}
watch(() => props.projectId, () => {
  epoch++; clearTimeout(timer); config.value = null; checking.value = false
  if (props.projectId) { void refreshConfig(); void poll(epoch) }
}, { immediate: true })
async function start() {
  const node = target.value
  if (!node || busy.value || props.readonly || active.value && node.data.depthTaskId || !props.saveCanvas) return
  const id = node.id, sourceId = node.data.depthSourceNodeId, url = node.data.depthRequestUrl
  const version = epoch
  if (source.value?.data?.src !== url) {
    patch(id, { depthError: '原视频已更换或删除，请删除此节点，从原视频重新创建提取任务' })
    return
  }
  settingsOpen.value = false
  submitting.value.add(id)
  const key = node.data.depthState === 'FAILED' ? crypto.randomUUID() : node.data.depthRequestKey
  patch(id, { depthRequestKey: key, depthTaskId: null, depthState: 'SUBMITTING', depthStage: 'queued', depthError: '' })
  try {
    if (!(await props.saveCanvas())) throw new Error('画布保存失败，请保存后重试')
    if (disposed || version !== epoch || !nodes.value.some((n) => n.id === id)) return
    if (nodes.value.find((n) => n.id === sourceId)?.data?.src !== url) throw new Error('原视频已更换或删除，请重新创建提取节点')
    const result = await videoDepthApi.create({ projectId: Number(props.projectId), nodeId: sourceId, clientRequestId: key, resolution: resolution.value })
    if (disposed || version !== epoch) return
    // 删除节点后不创建替代节点，也不将迟到响应写入其他节点。
    patch(id, { depthTaskId: result.id })
    const current = nodes.value.find((n) => n.id === id)
    const update = depthTaskPatch(current, result)
    if (update) patch(id, update)
    await props.saveCanvas()
  } catch (e) {
    if (!disposed && version === epoch) patch(id, {
      depthError: `${e.message || '提交响应未确认'}。可核对并继续，复用同一请求，不会重复提交。`,
    })
  } finally { submitting.value.delete(id) }
}
</script>

<template>
  <section v-if="target && (target.data.depthState === 'DRAFT' || settingsOpen)" class="video-depth-panel nodrag nopan nowheel" role="region" aria-label="深度提取"
    :aria-busy="busy || active" @pointerdown.stop @mousedown.stop @click.stop @keydown.stop @wheel.stop>
    <header class="depth-heading">
      <h3>深度提取 <span>免费</span></h3>
      <button class="depth-link" :disabled="checking" @click="refreshConfig">{{ checking ? '检查中…' : '刷新' }}</button>
    </header>
    <div class="depth-quality" role="group" aria-label="清晰度">
      <p>清晰度</p>
      <div class="depth-quality-options">
        <button type="button" class="depth-option" :class="{ 'is-selected': resolution === 'standard' }" :aria-pressed="resolution === 'standard'" :disabled="readonly || active || busy" @click="selectResolution('standard')"
          title="保持原片比例与时长，最长边960px，静音灰度视频">标准</button>
        <button type="button" class="depth-option" :class="{ 'is-selected': resolution === '720p' }" :aria-pressed="resolution === '720p'" :disabled="readonly || active || busy || !config?.resolutions?.includes('720p')" @click="selectResolution('720p')" title="保持比例，短边720像素；低分辨率原片会放大，处理耗时和内存增加">720 P</button>
      </div>
    </div>
    <p v-if="configError || config && !config.ready" class="depth-notice" role="status">{{ configError || config.error }}</p>
    <p v-if="target.data.depthError" class="depth-notice is-error" role="alert">{{ target.data.depthError }}</p>
    <div v-if="active || busy" class="depth-status" role="status" aria-live="polite">
      <LoadingOutlined spin /><span>{{ busy ? '正在提交…' : depthTaskLabel(task) }}</span>
    </div>
    <footer class="depth-footer">
      <button class="depth-confirm" type="button"
        :disabled="readonly || !config?.ready || resolution === '720p' && !config?.resolutions?.includes('720p') || busy || active && !!target.data.depthTaskId || source?.data?.src !== target.data.depthRequestUrl"
        title="支持50MB、30秒以内的视频；删除此节点可移除面板"
        @click="start">
        <LoadingOutlined v-if="busy || active" spin />
        {{ busy ? '正在提交…' : active && target.data.depthTaskId ? '生成中…' : task?.state === 'FAILED' ? '重新提取' : task?.state === 'SUBMITTING' ? '核对并继续' : '确认提取' }}
      </button>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.video-depth-panel {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  width: 350px;
  min-height: 176px;
  box-sizing: border-box;
  padding: 13px 16px;
  color: $text-primary;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  box-shadow: 0 8px 24px rgba($bg-deep, 0.35);
  font-family: $font-family;
  cursor: default;
}
.depth-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 18px;
  margin-bottom: 10px;
  h3 { margin: 0; font-size: 13px; line-height: 18px; font-weight: 600; color: $text-primary; }
  h3 span { margin-left: 6px; font-size: 10px; font-weight: 400; color: $text-muted; }
}
.depth-quality p { margin: 0 0 8px; font-size: 12px; line-height: 16px; }
.depth-quality-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.depth-option {
  height: 32px;
  padding: 0 8px;
  font: inherit;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: $border-default;
  color: $text-primary;
  &.is-selected { border: 1px solid $text-primary; }
  &:disabled { color: $text-faint; cursor: not-allowed; }
}
.depth-notice {
  margin: 8px 0 0;
  padding: 6px 8px;
  max-height: 96px;
  overflow-y: auto;
  overflow-wrap: anywhere;
  border-radius: $radius-sm;
  background: rgba($text-primary, 0.05);
  color: $text-secondary;
  line-height: 1.5;
  font-size: 11px;
  &.is-error { color: $accent-orange; background: rgba($accent-orange, 0.06); }
}
.depth-status { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; line-height: 16px; }
.depth-footer { margin-top: 32px; }
.depth-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $text-primary;
  border-radius: $radius-sm;
  background: $text-primary;
  color: $bg-deep;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  &:hover:not(:disabled) { opacity: 0.88; }
  &:disabled { background: $border-default; border-color: $border-default; color: $text-faint; cursor: not-allowed; }
}
.depth-link { padding: 0; border: 0; background: transparent; color: $text-muted; cursor: pointer; font: inherit; font-size: 10px; }
.depth-link:hover:not(:disabled) { color: $text-primary; text-decoration: underline; }
.depth-link:disabled { opacity: 0.5; cursor: default; }
button:focus-visible { outline: 2px solid $accent-text; outline-offset: 3px; }
</style>
