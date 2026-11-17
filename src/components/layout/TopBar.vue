<template>
  <header :class="['top-bar', { 'top-bar--floating': floating }]">
    <router-link to="/" class="top-bar__brand" aria-label="返回创作工作台">
      <span class="top-bar__brand-icon"><PartitionOutlined /></span>{{ BRAND_NAME }}
    </router-link>
    <nav class="top-bar__nav" aria-label="主导航">
      <router-link
        v-for="item in navigation"
        :key="item.path"
        :to="item.path"
        :class="{ active: isActive(item.path) }"
        :aria-current="isActive(item.path) ? 'page' : undefined"
      >
        {{ item.label }}
      </router-link>
    </nav>

    <div class="top-bar__actions">
      <div v-if="isLoggedIn" class="top-bar__credit-pill">
        <button type="button" class="top-bar__detail-btn" @click="chargeOpen = true">
          积分明细
        </button>
        <span class="top-bar__credit-divider" aria-hidden="true" />
        <button
          type="button"
          class="top-bar__credit-btn"
          aria-label="消费明细"
          @click="chargeOpen = true"
        >
          <StarOutlined class="top-bar__credit-icon" />
          <span class="top-bar__credit-value tabular-nums">{{ displayPoint }}</span>
        </button>
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
    <CreditDetailModal :open="chargeOpen" @close="chargeOpen = false" />
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PartitionOutlined, StarOutlined, BellOutlined } from '@ant-design/icons-vue'
import UserMenu from '@/components/features/UserMenu.vue'
import CreditDetailModal from '@/components/features/CreditDetailModal.vue'
import { BRAND_NAME } from '@/lib/brand'
import type { MemberInfo } from '@/components/layout/api'

interface Props {
  unreadCount: number
  isLoggedIn: boolean
  userInfo?: MemberInfo | null
  onPointDetailClick: () => void
  onVipClick: () => void
  onMessageClick: () => void
  onLoginClick: () => void
  onLogoutClick: () => void
  floating?: boolean
}
const props = defineProps<Props>()

const route = useRoute()
const navigation = [
  { label: '工作台', path: '/' },
  { label: '全部工具', path: '/tools' },
  { label: '无限画布', path: '/canvas/index' },
  { label: '我的作品', path: '/space' },
  { label: '资产库', path: '/agent-lib' },
]
function isActive(path: string) {
  return path === '/'
    ? route.path === '/'
    : path === '/tools'
    ? !!route.meta.creationWorkspace || route.path === '/tools'
    : route.path === path
}
const chargeOpen = ref(false)
const displayPoint = computed(() => props.userInfo?.point ?? 0)
const displayUserName = computed(() => props.userInfo?.nickname)
const displayUserAvatar = computed(() => props.userInfo?.avatar)
</script>

<style scoped lang="scss">
.top-bar {
  z-index: 30;
  display: flex;
  min-height: var(--app-header-height);
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-whisper);
  background: var(--color-surface-0);

  @media (min-width: 768px) {
    padding: 12px clamp(24px, 3.8vw, 64px);
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    color: var(--color-ink-primary);
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
  }
  &__brand-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--color-creative-violet);
    color: var(--color-on-media);
    font-size: 19px;
  }
  &__nav {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: auto;
    margin-left: 24px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    a {
      flex-shrink: 0;
      padding: 8px 12px;
      border-radius: 8px;
      color: var(--color-ink-secondary);
      font-size: 13px;
      text-decoration: none;
      white-space: nowrap;
      &:hover,
      &.active {
        background: var(--color-accent-soft);
        color: var(--color-creative-violet);
      }
      &.active {
        font-weight: 600;
      }
    }
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--color-creative-violet);
    outline-offset: 2px;
  }

  &--floating {
    position: absolute;
    top: 16px;
    right: 28px;
    z-index: 20;
    width: auto;
    height: auto;
    padding: 0;
    background: transparent;
    box-shadow: none;
    border-bottom: 0;

    @media (max-width: 767px) {
      right: 12px;
      left: 12px;
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
    height: 36px;
    align-items: center;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    overflow: hidden;
    background: var(--color-surface-0);
    box-shadow: none;
  }

  &__detail-btn,
  &__credit-btn {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    height: 100%;
    padding: 0 12px;
    gap: 6px;
    border: 0;
    background: transparent;
    color: var(--color-ink-primary);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    &:hover {
      background: var(--color-accent-soft);
    }
  }
  &__credit-btn {
    color: var(--color-creative-violet);
    font-weight: 600;
  }
  &__credit-icon {
    color: var(--color-warning-amber);
    font-size: 15px;
  }
  &__credit-divider {
    width: 1px;
    height: 14px;
    background: var(--color-border-whisper);
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
    color: var(--color-on-media);
  }
}
@media (max-width: 1000px) {
  .top-bar {
    flex-wrap: wrap;
    gap: 10px;
  }
  .top-bar__actions {
    margin-left: auto;
  }
  .top-bar__nav {
    order: 3;
    flex-basis: 100%;
    margin: 0;
  }
}
@media (max-width: 520px) {
  .top-bar {
    padding: 10px 14px;
  }
  .top-bar__brand {
    font-size: 13px;
    gap: 7px;
  }
  .top-bar__brand-icon {
    width: 28px;
    height: 28px;
  }
  .top-bar__detail-btn,
  .top-bar__credit-divider,
  .top-bar__message-btn {
    display: none;
  }
  .top-bar__nav a {
    padding: 7px 10px;
    font-size: 12px;
  }
  .top-bar__detail-btn {
    padding-inline: 8px;
    font-size: 12px;
  }
  .top-bar__credit-btn {
    padding-inline: 8px;
    font-size: 12px;
  }
}
</style>
