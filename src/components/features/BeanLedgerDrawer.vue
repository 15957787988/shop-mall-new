<template>
  <ul v-if="logs.length > 0" class="bean-ledger">
    <li v-for="log in logs" :key="log.id" class="bean-ledger__item">
      <div class="bean-ledger__row">
        <p class="bean-ledger__title">{{ log.title }}</p>
        <span
          class="bean-ledger__amount"
          :class="{
            'bean-ledger__amount--positive': log.amount > 0,
            'bean-ledger__amount--negative': log.amount <= 0,
          }"
        >
          {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
        </span>
      </div>
      <div class="bean-ledger__meta">
        <span>{{ log.time }}</span>
      </div>
    </li>
  </ul>
  <div v-else class="bean-ledger__empty">暂无明细</div>
</template>

<script setup lang="ts">
export interface TransactionDisplay {
  id: string
  title: string
  amount: number
  time: string
}

defineProps<{
  logs: TransactionDisplay[]
}>()
</script>

<style scoped lang="scss">
.bean-ledger {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--color-border-whisper);

  &__item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border-whisper);
  }

  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }

  &__amount {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 500;

    &--positive {
      color: var(--color-success-mint);
    }

    &--negative {
      color: var(--color-blossom-pink);
    }
  }

  &__meta {
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    font-size: 14px;
    color: var(--color-ink-tertiary);
  }
}
</style>
