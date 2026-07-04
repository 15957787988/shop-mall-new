<template>
  <div :class="cn('user-badge', className)">
    <img :src="avatar" :alt="name" class="user-badge__avatar" />
    <div>
      <p class="user-badge__name">{{ name }}</p>
      <p v-if="membership" class="user-badge__membership">{{ membership }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  name: string
  avatar: string
  membership?: string
  className?: string
}>()
</script>

<style scoped lang="scss">
.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;

  &__avatar {
    width: 32px;
    height: 32px;
    border-radius: 9999px;
  }

  &__name {
    font-size: 14px;
    font-weight: 500;
  }

  &__membership {
    font-size: 12px;
    color: var(--color-creative-violet);
  }
}
</style>
