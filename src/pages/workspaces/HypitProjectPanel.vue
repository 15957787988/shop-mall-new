<template>
  <section v-if="enabled" class="hypit-project agent-workspace__panel" aria-label="可编辑视频工程">
    <header><h2>Hypit 制作工程 <small>内部验证</small></h2><Button size="small" :loading="loading" @click="load">刷新</Button></header>
    <p class="hypit-project__hint">字幕、二维运镜和音轨独立编辑。保存为新版本后本地渲染，复用已有素材，不新增图片或视频模型扣费。</p>
    <p v-if="error" class="agent-workspace__error" role="alert">{{ error }}</p>
    <template v-if="latest">
      <p role="status">版本 #{{ latest.id }} · {{ labels[latest.state] }} <span v-if="latest.build_id">· {{ latest.build_id }}</span></p>
      <p v-if="latest.error_message" class="agent-workspace__error">{{ latest.error_message }}</p>
      <Button v-if="latest.state === 'REVIEW'" size="small" :loading="saving" @click="reconcile">查询原 Build</Button>
      <video v-if="latest.output_url" :src="latest.output_url" controls playsinline preload="metadata" />
      <p v-if="dirty" class="hypit-project__hint">有未保存的修改，刷新会保留当前编辑内容。</p>
    </template>
    <p v-else-if="!loading && !error" class="hypit-project__hint">Agent 可自动创建工程；已有成片也可选作画面素材，添加字幕后创建首版。</p>
    <template v-if="sourceMode">
      <p v-if="latest?.review" class="hypit-project__hint">画面复核：{{ latest.review.verdict === 'PASS' ? '通过' : '需修改' }} · {{ latest.review.observations }} · 音轨未独立核听</p>
      <label class="hypit-project__source">实际源码文件（JSON 格式；修改具体 SVML/SVS/SVRun 文件，素材编号保持不变）
        <Input.TextArea v-model:value="sourceText" :rows="12" :maxlength="120000" aria-label="Hypit 源码文件" />
      </label>
      <div class="hypit-project__actions"><Button type="primary" :loading="saving" :disabled="building || !sourceText" @click="save">保存源码新版本并渲染</Button><Button @click="reset">恢复最新源码</Button></div>
    </template>
    <template v-else-if="draft">
      <details open>
        <summary>画面轨道 {{ draft.clips.length }} · {{ draft.duration }} 秒</summary>
        <div v-for="clip in draft.clips" :key="clip.id" class="hypit-project__layer">
          <label>素材<Select v-model:value="clip.assetId" :options="visualOptions" /></label>
          <div class="hypit-project__row"><label>开始秒<InputNumber v-model:value="clip.start" :min="0" :max="draft.duration" :step="0.1" /></label><label>结束秒<InputNumber v-model:value="clip.end" :min="0" :max="draft.duration" :step="0.1" /></label><label>素材起点<InputNumber v-model:value="clip.sourceStart" :min="0" :step="0.1" /></label></div>
          <div class="hypit-project__row"><label>适配<Select v-model:value="clip.fit" :options="fitOptions" /></label><label>二维运镜<Select v-model:value="clip.motion" :options="motionOptions" /></label><label>原声倍数<InputNumber v-model:value="clip.gain" :min="0" :max="2" :step="0.1" /></label></div>
          <Button size="small" danger @click="draft.clips = draft.clips.filter(item => item.id !== clip.id)">移除片段</Button>
        </div>
        <Button size="small" :disabled="!visualOptions.length || draft.clips.length >= 24" @click="addClip">添加画面片段</Button>
      </details>
      <details open>
        <summary>字幕轨道 {{ draft.captions.length }}</summary>
        <div v-for="caption in draft.captions" :key="caption.id" class="hypit-project__layer">
          <label>字幕文字<Input.TextArea v-model:value="caption.text" :maxlength="1000" :auto-size="{ minRows: 1, maxRows: 4 }" /></label>
          <div class="hypit-project__row"><label>开始秒<InputNumber v-model:value="caption.start" :min="0" :max="draft.duration" :step="0.1" /></label><label>结束秒<InputNumber v-model:value="caption.end" :min="0" :max="draft.duration" :step="0.1" /></label><label>字号<InputNumber v-model:value="caption.fontSize" :min="8" :max="200" /></label></div>
          <div class="hypit-project__row"><label>左侧比例<InputNumber v-model:value="caption.x" :min="0" :max="1" :step="0.01" /></label><label>顶部比例<InputNumber v-model:value="caption.y" :min="0" :max="1" :step="0.01" /></label><label>宽度比例<InputNumber v-model:value="caption.width" :min="0.01" :max="1" :step="0.01" /></label><label>高度比例<InputNumber v-model:value="caption.height" :min="0.01" :max="1" :step="0.01" /></label></div>
          <div class="hypit-project__row"><label>颜色<Input v-model:value="caption.color" :maxlength="7" placeholder="十六进制颜色" /></label><label>入场动画<Select v-model:value="caption.motion" :options="captionMotionOptions" /></label><Button size="small" danger @click="draft.captions = draft.captions.filter(item => item.id !== caption.id)">移除字幕</Button></div>
        </div>
        <Button size="small" :disabled="draft.captions.length >= 100" @click="addCaption">添加字幕</Button>
      </details>
      <details>
        <summary>音轨 {{ draft.audio.length }}</summary>
        <div v-for="audio in draft.audio" :key="audio.id" class="hypit-project__layer">
          <label>音频来源<Select v-model:value="audio.assetId" :options="audioOptions" /></label>
          <div class="hypit-project__row"><label>开始秒<InputNumber v-model:value="audio.start" :min="0" :max="draft.duration" :step="0.1" /></label><label>结束秒<InputNumber v-model:value="audio.end" :min="0" :max="draft.duration" :step="0.1" /></label><label>素材起点<InputNumber v-model:value="audio.sourceStart" :min="0" :step="0.1" /></label><label>音量倍数<InputNumber v-model:value="audio.gain" :min="0" :max="2" :step="0.1" /></label></div>
          <Button size="small" danger @click="draft.audio = draft.audio.filter(item => item.id !== audio.id)">移除音轨</Button>
        </div>
        <Button size="small" :disabled="!audioOptions.length || draft.audio.length >= 16" @click="addAudio">添加音轨</Button>
      </details>
      <div class="hypit-project__actions"><Button type="primary" :loading="saving" :disabled="building || !draft.clips.length" @click="save">{{ building ? '原 Build 处理中' : '保存新版本并渲染' }}</Button><Button v-if="latest" @click="reset">恢复最新版本</Button></div>
    </template>
    <details v-if="revisions.length"><summary>版本记录与源码</summary><ol><li v-for="revision in revisions" :key="revision.id">#{{ revision.id }} · {{ labels[revision.state] }} · {{ revision.created_at }} <a v-if="revision.output_url" :href="revision.output_url" target="_blank" rel="noopener noreferrer">查看成片</a> <Button v-if="revision.build_id" size="small" type="link" @click="downloadSources(revision.id)">导出源码</Button></li></ol></details>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Button, Input, InputNumber, Select } from 'ant-design-vue'
import { createHypitRevision, getAgentConfiguration, getHypitSources, listHypitProjects, reconcileHypitBuild, type HypitRevision, type HypitSpec, type WorkspaceAsset } from './api'
interface Props { workspaceId: number; cursor?: number; assets: WorkspaceAsset[]; sourceVideoIds: number[]; duration: number }
const props = defineProps<Props>()
const enabled = ref(false), loading = ref(false), saving = ref(false), error = ref('')
const revisions = ref<HypitRevision[]>([]), draft = ref<HypitSpec>()
const latest = computed(() => revisions.value[0])
const building = computed(() => revisions.value.some(item => ['QUEUED', 'BUILDING', 'REVIEW'].includes(item.state)))
const labels: Record<string, string> = { QUEUED: '排队中', BUILDING: '渲染中', SUCCESS: '已导出', FAILED: '构建失败', REVIEW: '原 Build 待核对' }
const fitOptions = [{ value: 'contain', label: '保留完整画面' }, { value: 'cover', label: '裁切铺满' }]
const motionOptions = [{ value: 'none', label: '无附加运动' }, { value: 'push', label: '轻推近' }, { value: 'pull', label: '轻拉远' }, { value: 'pan_left', label: '左移' }, { value: 'pan_right', label: '右移' }]
const captionMotionOptions = [{ value: 'none', label: '无' }, { value: 'fade', label: '淡入' }]
const media = computed(() => [...new Map(props.assets.filter(a => a.purpose !== 'analysis' && !props.sourceVideoIds.includes(a.id)).map(a => [a.id, a])).values()])
const options = (types: string[]) => media.value.filter(a => types.includes(a.media_type)).map(a => ({ value: a.id, label: `#${a.id} ${a.media_type}${a.origin_task_id ? ` · 任务 #${a.origin_task_id}` : ''}` }))
const visualOptions = computed(() => options(['video', 'image'])), audioOptions = computed(() => options(['video', 'audio']))
const sourceMode = ref(false), sourceText = ref('')
const clean = ref(''), draftParent = ref<number | null>(null)
let epoch = 0, closed = false, retryKey = '', retryBody = ''
let timer: ReturnType<typeof setTimeout> | undefined
const draftSignature = () => sourceMode.value ? sourceText.value : JSON.stringify(draft.value)
const dirty = computed(() => Boolean(sourceMode.value || draft.value) && draftSignature() !== clean.value)
async function reset() {
  const current = epoch, revision = latest.value
  sourceMode.value = revision?.authoring_mode === 'SOURCE'
  draftParent.value = revision?.id || null
  if (sourceMode.value && revision) {
    draft.value = undefined; sourceText.value = ''; clean.value = ''
    try {
      const files = await getHypitSources(props.workspaceId, revision.id)
      if (closed || current !== epoch || latest.value?.id !== revision.id) return
      delete files['project.json']
      sourceText.value = JSON.stringify(files, null, 2); clean.value = sourceText.value
    } catch (e: unknown) { if (current === epoch) error.value = `源码读取失败：${e instanceof Error ? e.message : '请求未完成'}` }
  } else {
    sourceText.value = ''
    draft.value = revision ? JSON.parse(JSON.stringify(revision.spec)) : { version: 1, duration: props.duration, width: 854, height: 480, background: '#101820', clips: [], captions: [], audio: [] }
    clean.value = JSON.stringify(draft.value)
  }
}
async function load() {
  if (!enabled.value || loading.value) return
  const current = epoch, id = props.workspaceId
  loading.value = true
  try {
    const rows = await listHypitProjects(id)
    if (closed || current !== epoch) return
    error.value = ''
    const changed = rows[0]?.id !== latest.value?.id, edited = dirty.value
    revisions.value = rows
    if (retryKey && rows[0]?.action_key === retryKey) {
      const submitted = JSON.parse(retryBody) as { spec?: HypitSpec; files?: Record<string, string> }
      const same = sourceMode.value ? sourceText.value && JSON.stringify(JSON.parse(sourceText.value)) === JSON.stringify(submitted.files) : JSON.stringify(draft.value) === JSON.stringify(submitted.spec)
      if (same) clean.value = draftSignature()
      draftParent.value = rows[0].id; retryKey = ''
    }
    if ((!draft.value && !sourceMode.value) || (changed && !edited)) await reset()
  } catch (e: unknown) { if (current === epoch) error.value = `工程列表读取失败：${e instanceof Error ? e.message : '请求未完成'}` }
  finally { loading.value = false }
}
const layerId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
function addClip() { if (draft.value && visualOptions.value.length) draft.value.clips.push({ id: layerId('clip'), assetId: visualOptions.value[0].value, start: draft.value.clips[draft.value.clips.length - 1]?.end || 0, end: draft.value.duration, sourceStart: 0, fit: 'contain', motion: 'none', gain: 1 }) }
function addCaption() { if (draft.value) draft.value.captions.push({ id: layerId('caption'), text: '', start: 0, end: draft.value.duration, x: 0.05, y: 0.75, width: 0.9, height: 0.2, fontSize: Math.round(draft.value.height * 0.05), color: '#ffffff', motion: 'none' }) }
function addAudio() { if (draft.value && audioOptions.value.length) draft.value.audio.push({ id: layerId('audio'), assetId: audioOptions.value[0].value, start: 0, end: draft.value.duration, sourceStart: 0, gain: 1 }) }
async function save() {
  if ((!draft.value && !sourceMode.value) || saving.value || building.value) return
  const current = epoch, id = props.workspaceId
  let content: { parentId: number | null; spec?: HypitSpec; files?: Record<string, string>; assetIds?: number[] }
  try {
    content = sourceMode.value
      ? { parentId: draftParent.value, files: JSON.parse(sourceText.value) as Record<string, string>, assetIds: [...(latest.value?.spec.assetIds || [])] }
      : { parentId: draftParent.value, spec: JSON.parse(JSON.stringify(draft.value)) as HypitSpec }
    if (sourceMode.value && (!content.files || Array.isArray(content.files) || typeof content.files !== 'object' || Object.values(content.files).some(file => typeof file !== 'string'))) throw new Error('源码必须是文件名到字符串的 JSON 对象')
  } catch { error.value = '源码不是有效的文件 JSON，请修正后保存'; return }
  const submittedDraft = draftSignature()
  const signature = JSON.stringify(content)
  if (signature !== retryBody || !retryKey) { retryBody = signature; retryKey = crypto.randomUUID() }
  saving.value = true; error.value = ''
  try {
    await createHypitRevision(id, { ...content, clientRequestId: retryKey })
    if (closed || current !== epoch) return
    clean.value = submittedDraft; retryKey = ''; await load()
  } catch (e: unknown) { if (current === epoch) error.value = e instanceof Error ? e.message : '工程保存失败' }
  finally { saving.value = false }
}
async function downloadSources(revision: number) {
  const current = epoch
  try {
    const files = await getHypitSources(props.workspaceId, revision)
    if (closed || current !== epoch) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `hypit-project-${revision}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e: unknown) { if (current === epoch) error.value = e instanceof Error ? e.message : '源码导出失败' }
}
async function reconcile() {
  if (!latest.value || saving.value) return
  const current = epoch
  saving.value = true; error.value = ''
  try { await reconcileHypitBuild(props.workspaceId, latest.value.id); if (!closed && current === epoch) await load() }
  catch (e: unknown) { if (current === epoch) error.value = e instanceof Error ? e.message : '原 Build 查询失败' }
  finally { saving.value = false }
}
async function poll() { if (closed) return; const current = epoch; await load(); if (!closed && current === epoch) timer = setTimeout(poll, 5000) }
watch(() => props.cursor, () => { void load() })
watch(() => props.workspaceId, async () => {
  const current = ++epoch; clearTimeout(timer); enabled.value = false; revisions.value = []; draft.value = undefined; sourceMode.value = false; sourceText.value = ''; clean.value = ''; error.value = ''; retryKey = ''; retryBody = ''
  try { const config = await getAgentConfiguration(); if (closed || current !== epoch) return; enabled.value = config.hypitEnabled; if (enabled.value) await poll() }
  catch (e: unknown) { if (current === epoch) error.value = e instanceof Error ? e.message : '配置读取失败' }
}, { immediate: true })
onBeforeUnmount(() => { closed = true; epoch++; clearTimeout(timer) })
</script>

<style scoped lang="scss">
.hypit-project {
  > header, &__actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  > header h2 { margin-bottom: 0; small { color: var(--color-ink-secondary); font-weight: normal; font-size: 11px; } }
  &__source { display: grid; gap: 8px; font-size: 12px; :deep(textarea) { font-family: monospace; } }
  &__hint { color: var(--color-ink-secondary); font-size: 12px; line-height: 1.7; }
  > video { width: 100%; max-height: 340px; object-fit: contain; background: var(--color-surface-1); border-radius: 8px; }
  > details { padding: 12px 0; border-top: 1px solid var(--color-border-whisper); > summary { margin-bottom: 10px; cursor: pointer; } }
  &__layer { display: grid; gap: 10px; padding: 12px; margin-bottom: 10px; border-radius: 8px; background: var(--color-surface-1); label { display: grid; gap: 4px; min-width: 0; font-size: 12px; } }
  &__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; align-items: end; :deep(.ant-input-number) { width: 100%; } }
  &__actions { margin: 16px 0; }
  ol { padding-left: 20px; font-size: 12px; line-height: 1.8; }
}
</style>
