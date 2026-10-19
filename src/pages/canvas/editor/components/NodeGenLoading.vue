<script setup>
defineProps({
  hint: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="node-gen-loading" :class="{ compact }" role="status" aria-live="polite">
    <div class="node-gen-spinner" aria-hidden="true" />
    <div class="node-gen-title">生成中...</div>
    <div v-if="hint" class="node-gen-hint">{{ hint }}</div>
  </div>
</template>

<style lang="scss" scoped>

.node-gen-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 120px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(241, 208, 138, 0.08) 0%, #111110 100%);
  border: 2px dashed rgba($accent-primary, 0.55);
  border-radius: 0 0 10px 10px;
  animation: node-gen-border-pulse 1.6s ease-in-out infinite;
}

.node-gen-loading.compact {
  min-height: 80px;
  padding: 12px;
  border-radius: $radius-sm;
  border-width: 1px;
}

.node-gen-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba($accent-primary, 0.22);
  border-top-color: $accent-primary;
  border-radius: 50%;
  animation: node-gen-spin 0.75s linear infinite;
  box-shadow: 0 0 18px rgba($accent-primary, 0.35);
}

.node-gen-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: $accent-text;
  text-shadow: 0 0 12px rgba($accent-primary, 0.45);
}

.node-gen-hint {
  font-size: 12px;
  line-height: 1.4;
  color: $text-secondary;
  text-align: center;
  max-width: 200px;
}

@keyframes node-gen-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes node-gen-border-pulse {
  0%,
  100% {
    border-color: rgba($accent-primary, 0.45);
    box-shadow: inset 0 0 0 0 rgba($accent-primary, 0);
  }
  50% {
    border-color: rgba($accent-primary, 0.85);
    box-shadow: inset 0 0 24px rgba($accent-primary, 0.08);
  }
}
</style>
