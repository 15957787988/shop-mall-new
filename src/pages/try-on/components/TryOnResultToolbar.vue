<template>
  <div class="result-toolbar">
    <h2 class="result-toolbar__title">生成结果：</h2>
    <div class="result-toolbar__actions">
      <Checkbox :checked="allSelected" :indeterminate="indeterminate" @change="toggleAll">
        全选
      </Checkbox>
      <Button size="small" :disabled="!hasSelection" @click="emit('batch-download')">
        <DownloadOutlined />
        批量下载
      </Button>
      <Button
        size="small"
        danger
        :disabled="!hasSelection"
        :loading="deleting"
        @click="emit('delete-selected')"
      >
        <DeleteOutlined />
        删除
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button, Checkbox } from 'ant-design-vue'
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { isWearImageSelectable, hasSelectedWearTasks } from '../utils/constants'
import type { TryOnResultGroup } from '../utils/types'

const props = defineProps<{
  results: TryOnResultGroup[]
  deleting?: boolean
}>()

const emit = defineEmits<{
  'update:results': [results: TryOnResultGroup[]]
  'delete-selected': []
  'batch-download': []
}>()

const allSelected = computed(
  () => props.results.length > 0 && props.results.every((g) => g.selected)
)

const indeterminate = computed(() => props.results.some((g) => g.selected) && !allSelected.value)

const hasSelection = computed(() => hasSelectedWearTasks(props.results))

function syncGroupSelected(group: TryOnResultGroup): boolean {
  const selectable = group.images.filter(isWearImageSelectable)
  if (selectable.length === 0) {
    return false
  }
  return selectable.every((img) => img.selected)
}

function toggleAll(e: { target: { checked: boolean } }) {
  const checked = e.target.checked
  emit(
    'update:results',
    props.results.map((g) => {
      const images = g.images.map((img) =>
        isWearImageSelectable(img) ? { ...img, selected: checked } : { ...img, selected: false }
      )
      return {
        ...g,
        selected: syncGroupSelected({ ...g, images }),
        images,
      }
    })
  )
}
</script>

<style scoped lang="scss">
.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
}
</style>
