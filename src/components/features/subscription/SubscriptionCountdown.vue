<template>
  <div class="subscription-countdown">
    <span class="subscription-countdown__badge">{{ badge }}</span>
    <div class="subscription-countdown__units">
      <template v-for="(unit, i) in units" :key="unit.label">
        <span class="subscription-countdown__unit-wrap">
          <span class="subscription-countdown__unit">
            <span class="subscription-countdown__value">{{ unit.value }}</span>
            <span class="subscription-countdown__label">{{ unit.label }}</span>
          </span>
          <span v-if="i < units.length - 1" class="subscription-countdown__sep">:</span>
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalSeconds: number
  badge: string
}>()

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const units = computed(() => {
  const h = Math.floor(props.totalSeconds / 3600)
  const m = Math.floor((props.totalSeconds % 3600) / 60)
  const s = props.totalSeconds % 60
  return [
    { value: pad(h), label: '时' },
    { value: pad(m), label: '分' },
    { value: pad(s), label: '秒' },
  ]
})
</script>

<style scoped lang="scss">
.subscription-countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  &__badge {
    font-size: 11px;
    font-weight: 500;
    color: var(--sub-badge);
  }

  &__units {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__unit-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__unit {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__value {
    display: flex;
    height: 36px;
    min-width: 36px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--sub-bg-card);
    padding: 0 8px;
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-primary);
    box-shadow: var(--shadow-soft);
  }

  &__label {
    margin-top: 2px;
    font-size: 10px;
    color: var(--color-ink-muted);
  }

  &__sep {
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 700;
    color: var(--sub-badge);
  }
}
</style>
