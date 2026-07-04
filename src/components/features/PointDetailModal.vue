<template>
  <Modal
    :open="open"
    title="消费明细"
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
        <template v-if="column.key === 'point'">
          <Tag :color="record.point >= 0 ? 'success' : 'error'">
            {{ record.point >= 0 ? `+${record.point}` : record.point }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
      </template>
    </Table>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Modal, Table, Tag } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { getPointRecordPage, type PointRecord } from '@/pages/pricing/api/pointRecord'
import { formatDateTime } from '@/lib/formatTime'

const props = defineProps<{
  open: boolean
  userId?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const records = ref<PointRecord[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)

const columns = [
  { title: '场景', dataIndex: 'title', key: 'title', width: 140 },
  { title: '积分', key: 'point', width: 100, align: 'center' as const },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '使用时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
]

const pagination = computed(() => ({
  current: pageNo.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}))

async function fetchRecords() {
  if (!props.userId) return
  loading.value = true
  try {
    const res = await getPointRecordPage({
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      userId: props.userId,
    })
    records.value = res.list ?? []
    total.value = res.total ?? 0
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
  () => [props.open, props.userId] as const,
  ([open]) => {
    if (open) {
      pageNo.value = 1
      void fetchRecords()
    }
  },
)
</script>
