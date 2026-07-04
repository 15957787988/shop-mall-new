<template>
  <div :class="cn('section-header', className)">
    <div>
      <p v-if="label" class="section-header__label">{{ label }}</p>
      <h2 class="section-header__title">{{ title }}</h2>
      <p v-if="description" class="section-header__description">{{ description }}</p>
    </div>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  label?: string
  title: string
  description?: string
  className?: string
}>()
</script>

<style scoped lang="scss">
.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  &__label {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink-primary);

    @media (min-width: 768px) {
      font-size: 20px;
    }
  }

  &__description {
    margin-top: 2px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }
}
</style>
