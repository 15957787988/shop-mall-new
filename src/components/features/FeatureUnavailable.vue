<template>
  <div :class="['feature-unavailable', { 'feature-unavailable--full': fullPage }, className]">
    <div :class="['feature-unavailable__icon-wrap', { 'feature-unavailable__icon-wrap--full': fullPage }]">
      <svg
        :width="fullPage ? 28 : 22"
        :height="fullPage ? 28 : 22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="feature-unavailable__icon"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
    <div>
      <h3 class="feature-unavailable__title">{{ title }}</h3>
      <p class="feature-unavailable__subtitle">{{ subtitle }}</p>
    </div>
    <p v-if="hint" class="feature-unavailable__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    hint?: string
    fullPage?: boolean
    className?: string
  }>(),
  {
    title: '功能未开放',
    subtitle: '该功能正在建设中，敬请期待',
    fullPage: false,
  }
)
</script>

<style scoped lang="scss">
.feature-unavailable {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  border: 1px dashed var(--color-border-whisper);
  background: var(--color-surface-1);
  border-radius: 12px;
  padding: 48px 24px;

  &--full {
    min-height: 60vh;
    border: none;
    background: transparent;
    padding: 0 24px;
  }

  &__icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    background: var(--color-surface-2);

    &--full {
      width: 64px;
      height: 64px;
    }
  }

  &__icon {
    color: var(--color-ink-tertiary);
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--color-ink-tertiary);
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: var(--color-ink-quaternary);
  }
}
</style>
