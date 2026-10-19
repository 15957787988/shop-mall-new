<script setup>
defineProps({
  label: { type: String, default: '替换' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['upload'])

function onClick(e) {
  e.stopPropagation()
  emit('upload')
}
</script>

<template>
  <div class="replace-menu-wrap">
    <button
      type="button"
      class="replace-trigger"
      :class="{ disabled }"
      :disabled="disabled"
      :title="label"
      @click.stop="onClick"
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
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: $radius-sm;
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;

  &:hover:not(.disabled) {
    background: rgba(0, 0, 0, 0.85);
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.replace-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>
