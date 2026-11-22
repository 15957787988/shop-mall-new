<template>
  <span class="generation-loading" role="progressbar" :aria-label="label">
    <span class="generation-loading__spinner" aria-hidden="true" />
    <span aria-hidden="true">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
interface Props {
  label?: string
}
withDefaults(defineProps<Props>(), { label: '正在生成…' })
</script>

<style scoped lang="scss">
.generation-loading {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  max-width: 100%;
  color: var(--color-ink-secondary);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--color-border-whisper);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: generation-loading-spin 1s linear infinite;
  }
}

@keyframes generation-loading-spin {
  to { transform: rotate(1turn); }
}

@media (prefers-reduced-motion: reduce) {
  .generation-loading__spinner { animation-duration: 6s; }
}

@media (forced-colors: active) {
  .generation-loading__spinner {
    border-color: GrayText;
    border-top-color: CanvasText;
  }
}
</style>
