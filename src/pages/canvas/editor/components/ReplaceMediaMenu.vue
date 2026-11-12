<script setup>
import { ref } from 'vue'
import { Dropdown, Menu, MenuItem } from 'ant-design-vue'

const props = defineProps({
  label: { type: String, default: '替换' },
  disabled: { type: Boolean, default: false },
  sourceMenu: { type: Boolean, default: false },
})

const emit = defineEmits(['upload', 'library'])
const open = ref(false)

function onClick() {
  if (!props.disabled && !props.sourceMenu) emit('upload')
}

function chooseSource({ key, domEvent }) {
  domEvent.stopPropagation()
  open.value = false
  if (!props.disabled) emit(key === 'local' ? 'upload' : 'library')
}
</script>

<template>
  <div class="replace-menu-wrap nodrag nopan" @pointerdown.stop @click.stop>
    <Dropdown
      v-model:open="open"
      :trigger="['click']"
      placement="bottomRight"
      :disabled="disabled || !sourceMenu"
    >
      <button
        type="button"
        class="replace-trigger"
        :class="{ disabled }"
        :disabled="disabled"
        :title="label"
        :aria-haspopup="sourceMenu ? 'menu' : undefined"
        :aria-expanded="sourceMenu ? open : undefined"
        @click="onClick"
      >
        <svg class="replace-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 2.5v7M5.5 5 8 2.5 10.5 5M3 11.5h10"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ label }}</span>
      </button>
      <template #overlay>
        <Menu class="replace-source-menu" @click="chooseSource" @pointerdown.stop>
          <MenuItem key="local">本地上传</MenuItem>
          <MenuItem key="library">资产库上传</MenuItem>
        </Menu>
      </template>
    </Dropdown>
  </div>
</template>

<style lang="scss" scoped>
.replace-menu-wrap {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
}

.replace-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba($bg-deep, 0.85);
  border: 1px solid $border-default;
  border-radius: $radius-sm;
  color: $text-primary;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;

  &:hover:not(.disabled) {
    background: $bg-deep;
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.replace-source-menu {
  min-width: 220px;
  padding: 6px;
  border: 1px solid $border-default;
  border-radius: $radius-xl;
  background: $bg-surface;

  :deep(.ant-dropdown-menu-item) {
    padding: 10px 14px;
    border-radius: $radius-lg;
    color: $text-primary;
    font-size: 14px;

    &:hover,
    &.ant-dropdown-menu-item-active {
      background: $border-default;
      color: $text-primary;
    }
  }
}

.replace-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>
