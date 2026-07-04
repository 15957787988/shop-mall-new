<template>
  <div
    v-if="open"
    class="sidebar__backdrop"
    aria-hidden
    @click="onClose"
  />

  <aside :class="['sidebar', { 'sidebar--open': open }]">
    <div class="sidebar__brand">
      <router-link to="/" class="sidebar__brand-link" :title="BRAND_NAME" @click="onClose">
        <span class="sidebar__logo">{{ BRAND_LOGO_CHAR }}</span>
      </router-link>
      <button
        type="button"
        class="sidebar__close-btn"
        aria-label="关闭菜单"
        @click="onClose"
      >
        <CloseOutlined />
      </button>
    </div>

    <nav class="sidebar__nav scroll-area">
      <ul class="sidebar__main-list">
        <li v-for="item in MAIN_NAV" :key="item.href">
          <router-link
            :to="item.href"
            :title="item.label"
            :class="['sidebar__nav-item', { 'sidebar__nav-item--active': isNavActive(route.path, item.href) }]"
            @click="onClose"
          >
            <component :is="item.icon" class="sidebar__nav-icon" />
            <span class="sidebar__nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>

      <div ref="moreRef" class="sidebar__more">
        <button
          type="button"
          title="更多"
          :class="['sidebar__nav-item', 'sidebar__more-btn', { 'sidebar__nav-item--active': moreActive || moreOpen }]"
          @click="moreOpen = !moreOpen"
        >
          <EllipsisOutlined class="sidebar__nav-icon" />
          <span class="sidebar__nav-label">更多</span>
        </button>

        <div v-if="moreOpen" class="sidebar__more-menu">
          <router-link
            v-for="item in MORE_LINKS"
            :key="item.href"
            :to="item.href"
            :class="['sidebar__more-link', { 'sidebar__more-link--active': isNavActive(route.path, item.href) }]"
            @click="handleMoreLinkClick"
          >
            <component :is="item.icon" class="sidebar__more-link-icon" />
            {{ item.label }}
          </router-link>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Component } from 'vue'
import {
  HomeOutlined,
  ToolOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  ContainerOutlined,
  StarOutlined,
  EllipsisOutlined,
  CreditCardOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue'
import { BRAND_LOGO_CHAR, BRAND_NAME } from '@/lib/brand'

const props = defineProps<{
  open: boolean
  onClose: () => void
}>()

const route = useRoute()
const moreOpen = ref(false)
const moreRef = ref<HTMLElement | null>(null)

const MAIN_NAV: Array<{ href: string; label: string; icon: Component }> = [
  { href: '/', label: '首页', icon: HomeOutlined },
  { href: '/tools', label: '工具', icon: ToolOutlined },
  { href: '/templates', label: '模板', icon: AppstoreOutlined },
  { href: '/recent', label: '最近打开', icon: ClockCircleOutlined },
  { href: '/space', label: '项目', icon: FolderOpenOutlined },
  { href: '/agent-lib', label: '资产库', icon: ContainerOutlined },
  { href: '/team', label: '帮我设计', icon: StarOutlined },
]

const MORE_LINKS: Array<{ href: string; label: string; icon: Component }> = [
  { href: '/pricing', label: '套餐', icon: CreditCardOutlined },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

const moreActive = computed(() =>
  MORE_LINKS.some((item) => isNavActive(route.path, item.href)),
)

function handleDocClick(e: MouseEvent) {
  if (moreRef.value && !moreRef.value.contains(e.target as Node)) {
    moreOpen.value = false
  }
}

watch(moreOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', handleDocClick)
  } else {
    document.removeEventListener('mousedown', handleDocClick)
  }
})

watch(
  () => route.path,
  () => {
    moreOpen.value = false
  },
)

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocClick)
})

function handleMoreLinkClick() {
  moreOpen.value = false
  props.onClose()
}
</script>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: var(--z-sidebar);
  display: flex;
  width: var(--sidebar-width);
  flex-shrink: 0;
  flex-direction: column;
  background: var(--color-surface-2);
  transition: transform 0.2s var(--motion-ease);
  transform: translateX(-100%);

  @media (min-width: 768px) {
    position: static;
    transform: translateX(0);
  }

  &--open {
    transform: translateX(0);
  }

  &__backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: var(--color-overlay-veil);

    @media (min-width: 768px) {
      display: none;
    }
  }

  &__brand {
    position: relative;
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    padding: 12px 4px;
  }

  &__brand-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
  }

  &__logo {
    display: flex;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--color-creative-violet);
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }

  &__close-btn {
    position: absolute;
    right: 0;
    top: 8px;
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;

    @media (min-width: 768px) {
      display: none;
    }
  }

  &__nav {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 4px;
  }

  &__main-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__nav-item {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 56px;
    border-radius: 8px;
    padding: 8px 4px;
    text-decoration: none;
    color: var(--color-ink-secondary);
    transition: color 0.2s var(--motion-ease), background-color 0.2s var(--motion-ease);
    border: none;
    background: transparent;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.7);
      color: var(--color-ink-primary);
    }

    &--active {
      background: rgba(109, 40, 217, 0.08);
      color: var(--color-creative-violet);

      .sidebar__nav-icon {
        color: var(--color-creative-violet);
      }
    }
  }

  &__nav-icon {
    flex-shrink: 0;
    font-size: 20px;
  }

  &__nav-label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font-size: 10px;
    line-height: 1.25;
  }

  &__more {
    position: relative;
    margin-top: auto;
    padding-top: 8px;
  }

  &__more-btn {
    width: 100%;
  }

  &__more-menu {
    position: absolute;
    bottom: 0;
    left: 100%;
    z-index: var(--z-dropdown);
    margin-left: 4px;
    width: 128px;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid var(--color-border-whisper);
    background: var(--color-surface-0);
    padding: 4px 0;
    box-shadow: var(--shadow-lift);
  }

  &__more-link {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 8px 12px;
    font-size: 12px;
    text-decoration: none;
    color: var(--color-ink-secondary);
    transition: color 0.2s var(--motion-ease), background-color 0.2s var(--motion-ease);

    &:hover {
      background: var(--color-surface-2);
      color: var(--color-ink-primary);
    }

    &--active {
      background: rgba(109, 40, 217, 0.05);
      font-weight: 500;
      color: var(--color-creative-violet);
    }
  }

  &__more-link-icon {
    font-size: 14px;
  }
}
</style>
