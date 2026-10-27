<script setup>
import { computed, inject, onBeforeUnmount, watch } from 'vue'
import dayjs from 'dayjs'
import { GENERATION_HISTORY } from '../../composables/useGenerationHistory'
import { useMediaPager } from '../../composables/useMediaPager'
import { generationApi } from '../../api/generationApi'
import { historyNodeBusy } from '../../utils/generationHistorySelection'

const props = defineProps({ id: String, kind: String, data: Object, busy: Boolean })
const history = inject(GENERATION_HISTORY, null)
const count = computed(() => history?.count(props.kind, props.id) || 0)
const visible = computed(() => history?.openNodeId.value === props.id)
const blocked = computed(
  () => props.busy || history?.selecting.value || historyNodeBusy({ data: props.data })
)
const pager = useMediaPager((scope, params) =>
  generationApi.list(scope.projectId, { ...params, nodeId: scope.nodeId, kind: scope.kind })
)
const { items, error, loading, hasMore } = pager
watch(visible, (open) => {
  if (open) void pager.reset({ projectId: history.scope.value, nodeId: props.id, kind: props.kind })
})
watch(
  () => history?.scope.value,
  () => {
    if (history) history.openNodeId.value = ''
  }
)
onBeforeUnmount(pager.dispose)
function toggle(open) {
  if (history) history.openNodeId.value = open ? props.id : ''
}
function time(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format('MM-DD HH:mm') : '时间未知'
}
</script>

<template>
  <a-popover
    v-if="count > 0"
    :open="visible"
    placement="bottom"
    trigger="click"
    :overlay-style="{ width: '320px' }"
    @update:open="toggle"
  >
    <template #content>
    <section
      class="history-picker"
      aria-label="节点生成历史"
      @pointerdown.stop
      @wheel.stop
      @keydown.stop
      @keydown.esc="toggle(false)"
    >
      <p class="picker-hint">{{
        data?.genRequestId && !data?.genTaskId
          ? '本次视频请求待确认，状态确认后可切换历史'
          : blocked
            ? '正在生成、上传或保存，完成后可切换'
            : `点击切换${kind === 'image' ? '图片' : '视频'}`
      }}</p>
      <p v-if="loading && !items.length" role="status">正在加载…</p>
      <p v-else-if="!items.length && !error">暂无可用成果</p>
      <div class="history-thumbs">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="history-thumb"
          :class="{ current: data?.src === item.url }"
          :aria-pressed="data?.src === item.url"
          :aria-label="`切换到${time(item.completedAt)}生成的${kind === 'image' ? '图片' : '视频'}`"
          :disabled="blocked || data?.src === item.url"
          @click="history.select(item)"
        >
          <img
            v-if="kind === 'image' || item.poster"
            :src="kind === 'image' ? item.url : item.poster"
            alt=""
            referrerpolicy="no-referrer"
            loading="lazy"
          />
          <span v-else class="video-placeholder">▶ 视频</span>
          <small>{{ data?.src === item.url ? '✓ 当前' : time(item.completedAt) }}</small>
        </button>
      </div>
      <div v-if="error" class="picker-error" role="alert"
        >历史加载失败
        <button type="button" @click="items.length ? pager.loadMore() : pager.refresh()"
          >重试</button
        ></div
      >
      <button
        v-else-if="hasMore"
        class="load-more"
        type="button"
        :disabled="loading"
        @click="pager.loadMore()"
        >{{ loading ? '加载中…' : '更多历史' }}</button
      >
    </section>
    </template>
    <button
      type="button"
      class="history-trigger nodrag nopan"
      :aria-expanded="visible"
      :aria-label="`查看${kind === 'image' ? '图片' : '视频'}历史，共${count}条`"
      @pointerdown.stop
      @mousedown.stop
      @dblclick.stop
      @click.stop
      >历史 {{ count }}</button
    >
  </a-popover>
</template>

<style lang="scss" scoped>
.history-trigger {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: #9aaeff;
  font-size: 12px;
  padding: 3px 4px;
  cursor: pointer;
}
.history-trigger:focus-visible {
  outline: 2px solid #9aaeff;
  outline-offset: 2px;
}
.history-picker {
  color: #f0f0ff;
  font-size: 12px;
}
.picker-hint {
  margin: 0 0 10px;
  color: #c2c6d6;
}
.history-thumbs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}
.history-thumb {
  padding: 3px;
  min-width: 0;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  color: #c2c6d6;
  cursor: pointer;
}
.history-thumb.current {
  border-color: #9aaeff;
  color: #9aaeff;
}
.history-thumb:disabled {
  cursor: default;
}
.history-thumb:disabled:not(.current) {
  opacity: 0.65;
}
.history-thumb img,
.video-placeholder {
  width: 100%;
  height: 70px;
  object-fit: cover;
  background: #292e40;
  border-radius: 4px;
}
.video-placeholder {
  display: grid;
  place-items: center;
}
.history-thumb small {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}
.picker-error {
  margin-top: 10px;
  color: #f4b8b8;
}
.picker-error button,
.load-more {
  background: transparent;
  border: 0;
  color: #9aaeff;
  cursor: pointer;
  padding: 6px;
}
.load-more {
  display: block;
  margin: 8px auto 0;
}
</style>
<style>
.el-popover.canvas-generation-history-popover {
  background: #292927;
  border-color: #45453f;
  border-radius: 8px;
  max-width: calc(100vw - 24px);
}
.el-popover.canvas-generation-history-popover .el-popper__arrow::before {
  background: #292927;
  border-color: #45453f;
}
</style>
