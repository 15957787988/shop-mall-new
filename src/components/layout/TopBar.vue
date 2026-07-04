<template>
  <header class="top-bar">
    <div class="top-bar__left">
      <button type="button" class="top-bar__menu-btn" aria-label="打开菜单" @click="onMenuClick">
        <MenuOutlined />
      </button>
    </div>

    <div class="top-bar__actions">
      <div v-if="isLoggedIn" class="top-bar__credit-pill">
        <button
          type="button"
          class="top-bar__credit-btn"
          aria-label="消费明细"
          @click="onPointDetailClick"
        >
          <StarOutlined class="top-bar__credit-icon" />
          <span class="top-bar__credit-value tabular-nums">{{ displayPoint }}</span>
        </button>
        <span class="top-bar__credit-divider" aria-hidden="true" />
        <button type="button" class="top-bar__vip-btn" @click="onVipClick">开通会员</button>
      </div>

      <button
        type="button"
        class="top-bar__message-btn"
        aria-label="消息通知"
        @click="onMessageClick"
      >
        <BellOutlined />
        <span v-if="unreadCount > 0" class="top-bar__badge">{{ unreadCount }}</span>
      </button>

      <UserMenu
        :is-logged-in="isLoggedIn"
        :user-name="displayUserName"
        :user-avatar="displayUserAvatar"
        @login="onLoginClick"
        @logout="onLogoutClick"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MenuOutlined, StarOutlined, BellOutlined } from '@ant-design/icons-vue'
import UserMenu from '@/components/features/UserMenu.vue'
import type { MemberInfo } from '@/components/layout/api'

const props = defineProps<{
  onMenuClick: () => void
  unreadCount: number
  isLoggedIn: boolean
  userInfo?: MemberInfo | null
  onPointDetailClick: () => void
  onVipClick: () => void
  onMessageClick: () => void
  onLoginClick: () => void
  onLogoutClick: () => void
}>()

const displayPoint = computed(() => props.userInfo?.point ?? 0)
const displayUserName = computed(() => props.userInfo?.nickname)
const displayUserAvatar = computed(() => props.userInfo?.avatar)
</script>

<style scoped lang="scss">
.top-bar {
  z-index: 30;
  display: flex;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);

  @media (min-width: 768px) {
    padding: 0 24px;
  }

  &__left {
    display: flex;
    min-width: 0;
    align-items: center;
  }

  &__menu-btn {
    display: flex;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
    font-size: 20px;

    &:hover {
      background: var(--color-surface-2);
    }

    @media (min-width: 768px) {
      display: none;
    }
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;

    @media (min-width: 640px) {
      gap: 8px;
    }
  }

  &__credit-pill {
    display: flex;
    height: 32px;
    align-items: center;
    border: 1px solid var(--color-border-whisper);
    border-radius: 9999px;
    overflow: hidden;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);
  }

  &__credit-btn,
  &__vip-btn {
    display: inline-flex;
    height: 100%;
    align-items: center;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s;

    // &:hover {
    //   background: var(--color-surface-2);
    // }
  }

  &__credit-btn {
    gap: 4px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-creative-violet);
  }

  &__credit-icon {
    font-size: 14px;
    color: var(--color-warning-amber);
  }

  &__credit-divider {
    width: 1px;
    height: 11px;
    background: var(--color-border-whisper);
  }

  &__vip-btn {
    padding: 0 12px 0 8px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    background-image: linear-gradient(91deg, #7c5cff 0%, #5ddbf1 100%);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }

  &__message-btn {
    position: relative;
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9999px;
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
    font-size: 16px;

    // &:hover {
    //   background: var(--color-surface-2);
    // }
  }

  &__badge {
    position: absolute;
    right: -2px;
    top: -2px;
    display: flex;
    height: 16px;
    min-width: 16px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: var(--color-blossom-pink);
    padding: 0 4px;
    font-size: 10px;
    font-weight: 500;
    color: #fff;
  }
}
</style>
