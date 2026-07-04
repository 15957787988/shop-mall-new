<template>
  <div class="subscription-plan-cards">
    <button
      v-for="plan in MEMBERSHIP_PLANS"
      :key="plan.id"
      type="button"
      class="subscription-plan-cards__card"
      :class="{ 'subscription-plan-cards__card--active': selected === plan.id }"
      @click="emit('select', plan.id)"
    >
      <CheckCircleOutlined v-if="selected === plan.id" class="subscription-plan-cards__check" />
      <span
        class="subscription-plan-cards__badge"
        :class="{
          'subscription-plan-cards__badge--monthly': plan.id === 'monthly',
          'subscription-plan-cards__badge--yearly': plan.id === 'yearly',
        }"
      >
        {{ plan.badge }}
      </span>
      <span class="subscription-plan-cards__label">{{ plan.label }}</span>
      <div class="subscription-plan-cards__price-row">
        <span class="subscription-plan-cards__currency">¥</span>
        <span class="subscription-plan-cards__price">{{ plan.price }}</span>
        <span class="subscription-plan-cards__unit">{{ plan.unit }}</span>
      </div>
      <span class="subscription-plan-cards__original">原价 ¥{{ plan.originalPrice }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleOutlined } from '@ant-design/icons-vue'

export type SubscriptionPeriod = 'monthly' | 'yearly'

defineProps<{
  selected: SubscriptionPeriod
}>()

const emit = defineEmits<{
  select: [period: SubscriptionPeriod]
}>()

const MEMBERSHIP_PLANS = [
  { id: 'monthly' as const, label: '连续包月', price: 1.1, originalPrice: 49, unit: '首月体验', badge: '推荐' },
  { id: 'yearly' as const, label: '连续包年', price: 399, originalPrice: 588, unit: '/年', badge: '省32%' },
]
</script>

<style scoped lang="scss">
.subscription-plan-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  &__card {
    position: relative;
    display: flex;
    min-height: 92px;
    flex-direction: column;
    align-items: flex-start;
    border-radius: 12px;
    border: 1px solid var(--color-border-whisper);
    background: var(--sub-bg-card);
    padding: 12px;
    text-align: left;
    opacity: 0.9;
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }

    &--active {
      transform: scale(1.02);
      border-color: var(--sub-plan-active-border);
      background: var(--sub-plan-active-bg);
      box-shadow: var(--shadow-lift);
      opacity: 1;
      outline: 2px solid rgba(255, 176, 136, 0.4);
    }
  }

  &__check {
    position: absolute;
    right: 8px;
    top: 8px;
    font-size: 18px;
    color: var(--sub-accent-to);
  }

  &__badge {
    border-radius: 9999px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;

    &--monthly {
      background: var(--sub-badge);
      color: white;
    }

    &--yearly {
      background: rgba(16, 185, 129, 0.15);
      color: var(--color-success-mint);
    }
  }

  &__label {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  &__price-row {
    margin-top: 4px;
    display: flex;
    align-items: flex-end;
    gap: 2px;
  }

  &__currency {
    padding-bottom: 2px;
    font-size: 14px;
    font-weight: 600;
  }

  &__price {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  &__unit {
    margin-bottom: 2px;
    font-size: 10px;
    color: var(--color-ink-muted);
  }

  &__original {
    margin-top: 2px;
    font-size: 10px;
    color: var(--color-ink-muted);
    text-decoration: line-through;
  }
}
</style>
