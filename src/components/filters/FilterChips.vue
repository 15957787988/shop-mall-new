<template>
  <div class="filter-chips" :class="className">
    <button
      v-for="option in allOptions"
      :key="option"
      type="button"
      class="filter-chips__chip"
      :class="{ 'filter-chips__chip--active': selected === option }"
      :aria-pressed="selected === option"
      @click="emit('select', option)"
    >
      {{ option }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  options: readonly string[]
  selected: string
  allLabel?: string
  className?: string
}
const props = withDefaults(defineProps<Props>(), { allLabel: '全部' })

const emit = defineEmits<{
  select: [value: string]
}>()

const allOptions = computed(() => [props.allLabel, ...props.options])
</script>

<style scoped lang="scss">
.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &__chip {
    flex-shrink: 0;
    min-height: 36px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &--active {
      background: var(--color-accent-soft);
      border-color: var(--color-accent-border);
      color: var(--color-creative-violet);
    }

    &:hover:not(&--active) {
      border-color: var(--color-accent-border);
    }
  }
}
</style>
