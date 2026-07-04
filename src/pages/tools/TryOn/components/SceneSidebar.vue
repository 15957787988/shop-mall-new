<template>
  <div class="scene-sidebar">
    <div class="scene-sidebar__scroll scroll-area">
      <h3 class="scene-sidebar__title">选择场景</h3>

      <div v-for="group in groups" :key="group.scene" class="scene-sidebar__group">
        <div class="scene-sidebar__group-head">
          <h4 class="scene-sidebar__group-label">{{ group.scene }}</h4>
          <Checkbox
            :checked="isGroupAllSelected(group)"
            :indeterminate="isGroupIndeterminate(group)"
            @change="(e) => toggleGroup(group, e.target.checked)"
          />
        </div>
        <label
          v-for="pose in group.poses"
          :key="pose.id"
          class="scene-sidebar__option"
          :class="{ 'scene-sidebar__option--checked': selectedPoseIds.includes(pose.id) }"
        >
          <Checkbox
            :checked="selectedPoseIds.includes(pose.id)"
            @change="(e) => togglePose(pose.id, e.target.checked)"
          />
          <span class="scene-sidebar__option-text">{{ pose.description }}</span>
        </label>
      </div>
    </div>

    <div class="scene-sidebar__footer">
      <Button block @click="emit('prev')">上一步</Button>
      <Button
        type="primary"
        block
        :disabled="selectedPoseIds.length === 0"
        :loading="generating"
        @click="emit('regenerate', selectedPoseIds)"
      >
        {{ selectedPoseIds.length === 0 ? '请选择场景' : '生成场景图片' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, Checkbox } from 'ant-design-vue'
import type { ScenePromptGroup } from '../utils/types'

defineProps<{
  groups: ScenePromptGroup[]
  generating?: boolean
}>()

const emit = defineEmits<{
  prev: []
  regenerate: [poseIds: string[]]
}>()

const selectedPoseIds = ref<string[]>([])

function isGroupAllSelected(group: ScenePromptGroup): boolean {
  return (
    group.poses.length > 0 && group.poses.every((pose) => selectedPoseIds.value.includes(pose.id))
  )
}

function isGroupIndeterminate(group: ScenePromptGroup): boolean {
  const selectedCount = group.poses.filter((pose) => selectedPoseIds.value.includes(pose.id)).length
  return selectedCount > 0 && selectedCount < group.poses.length
}

function toggleGroup(group: ScenePromptGroup, checked: boolean) {
  const poseIds = group.poses.map((pose) => pose.id)
  if (checked) {
    const merged = new Set([...selectedPoseIds.value, ...poseIds])
    selectedPoseIds.value = [...merged]
    return
  }
  selectedPoseIds.value = selectedPoseIds.value.filter((id) => !poseIds.includes(id))
}

function togglePose(id: string, checked: boolean) {
  if (checked) {
    if (!selectedPoseIds.value.includes(id)) {
      selectedPoseIds.value = [...selectedPoseIds.value, id]
    }
  } else {
    selectedPoseIds.value = selectedPoseIds.value.filter((x) => x !== id)
  }
}
</script>

<style scoped lang="scss">
.scene-sidebar {
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--shadow-soft);

  &__scroll {
    flex: 1;
    min-height: 0;
    padding: 14px 16px;
  }

  &__title {
    margin: 0 0 14px;
    font-size: 14px;
    font-weight: 600;
  }

  &__group {
    margin-bottom: 16px;
  }

  &__group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__group-label {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;

    &--checked {
      background: var(--color-surface-2);
    }
  }

  &__option-text {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-ink-secondary);
  }

  &__footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--color-border-whisper);
  }
}
</style>
