<template>
  <Modal
    :open="open"
    title="积分明细"
    :footer="null"
    :width="720"
    destroy-on-close
    @cancel="emit('close')"
  >
    <Table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="middle"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'kind'">
          {{ kindLabel(record.kind) }}
        </template>
        <template v-else-if="column.key === 'points'">
          {{ pointText(record.points) }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
      </template>
    </Table>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Modal, Table } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import http from '@/service/http'
import { formatDateTime } from '@/lib/formatTime'

interface ChargeRecord {
  id: number
  model?: string
  kind?: string
  points?: number
  createTime?: number
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const records = ref<ChargeRecord[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)

const columns = [
  { title: '模型', dataIndex: 'model', key: 'model', ellipsis: true },
  { title: '类型', key: 'kind', width: 88 },
  { title: '积分消耗', key: 'points', width: 120 },
  { title: '时间', key: 'createTime', width: 180 },
]

const pagination = computed(() => ({
  current: pageNo.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

function pointText(value?: number) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= 0) return ''
  return String(Number(Number(value).toFixed(3)))
}

function kindLabel(kind?: string) {
  if (kind === 'image') return '图片'
  if (kind === 'video') return '视频'
  return kind || ''
}

async function fetchRecords() {
  loading.value = true
  try {
    const page = await http.get<{ list: ChargeRecord[]; total: number }>(
      '/admin-api/ai/charge/my-page',
      {
        pageNo: pageNo.value,
        pageSize: pageSize.value,
      }
    )
    records.value = page.list ?? []
    total.value = page.total ?? 0
  } catch {
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onTableChange(pag: TablePaginationConfig) {
  pageNo.value = pag.current ?? 1
  pageSize.value = pag.pageSize ?? 10
  void fetchRecords()
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    pageNo.value = 1
    void fetchRecords()
  }
)
</script>
