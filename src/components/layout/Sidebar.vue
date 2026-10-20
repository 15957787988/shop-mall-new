<template>
  <div v-if="open" class="sidebar__backdrop" aria-hidden @click="onClose" />

  <aside :class="['sidebar', { 'sidebar--open': open, 'sidebar--collapsed': collapsed }]">
    <div class="sidebar__brand">
      <router-link to="/" class="sidebar__brand-link" :title="BRAND_NAME" @click="onClose">
        <!-- <span class="sidebar__logo">{{ BRAND_LOGO_CHAR }}</span>1 -->
      </router-link>
      <button
        type="button"
        class="sidebar__collapse"
        :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="collapsed = !collapsed"
      >
        <MenuUnfoldOutlined v-if="collapsed" />
        <MenuFoldOutlined v-else />
      </button>
      <button type="button" class="sidebar__close-btn" aria-label="关闭菜单" @click="onClose">
        <CloseOutlined />
      </button>
    </div>

    <nav class="sidebar__nav scroll-area">
      <template v-for="(group, index) in NAV_GROUPS" :key="index">
        <div v-if="index > 0" class="sidebar__divider" />
        <ul class="sidebar__main-list">
          <li v-for="item in group" :key="item.href">
            <router-link
              :to="item.href"
              :title="item.label"
              :class="[
                'sidebar__nav-item',
                { 'sidebar__nav-item--active': isNavActive(route.path, item.href) },
              ]"
              @click="onClose"
            >
              <component :is="item.icon" class="sidebar__nav-icon" />
              <span class="sidebar__nav-label">{{ item.label }}</span>
              <RightOutlined class="sidebar__chevron" />
            </router-link>
          </li>
        </ul>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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
  CreditCardOutlined,
  PartitionOutlined,
  CloseOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  HighlightOutlined,
  PlayCircleOutlined,
  RightOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue'
import { BRAND_LOGO_CHAR, BRAND_NAME } from '@/lib/brand'

defineProps<{
  open: boolean
  onClose: () => void
}>()

const route = useRoute()
const collapsed = ref(localStorage.getItem('sidebar-collapsed') === '1')

watch(collapsed, (value) => {
  localStorage.setItem('sidebar-collapsed', value ? '1' : '0')
})

interface NavItem {
  href: string
  label: string
  icon: Component
}

const NAV_GROUPS: NavItem[][] = [
  [{ href: '/', label: '首页', icon: HomeOutlined }],
  [
    { href: '/tools/ai-product-image', label: '商品套图', icon: PictureOutlined },
    { href: '/tools/viral-videos', label: '视频制作', icon: VideoCameraOutlined },
    { href: '/ai/image', label: 'AI制图', icon: HighlightOutlined },
    { href: '/ai/video', label: 'AI视频', icon: PlayCircleOutlined },
    { href: '/canvas/index', label: '无限画布', icon: PartitionOutlined },
    { href: '/tools', label: '工具', icon: ToolOutlined },
  ],
  [{ href: '/templates', label: '模板', icon: AppstoreOutlined }],
  [
    { href: '/agent-lib', label: '我的资产', icon: ContainerOutlined },
    { href: '/space', label: '我的作品', icon: FolderOpenOutlined },
    { href: '/recent', label: '最近打开', icon: ClockCircleOutlined },
  ],
  [
    { href: '/team', label: '帮我设计', icon: StarOutlined },
    { href: '/pricing', label: '套餐', icon: CreditCardOutlined },
  ],
]

const TOOL_LEAVES = ['/tools/ai-product-image', '/tools/viral-videos']

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/canvas/index') return pathname === '/canvas' || pathname.startsWith('/canvas/')
  if (href === '/tools') {
    if (pathname === '/tools') return true
    if (!pathname.startsWith('/tools/')) return false
    return !TOOL_LEAVES.some((leaf) => pathname === leaf || pathname.startsWith(`${leaf}/`))
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
</script>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: var(--z-sidebar);
  display: flex;
  width: 240px;
  flex-shrink: 0;
  flex-direction: column;
  background: var(--color-surface-0);
  border-right: 1px solid var(--color-border-whisper);
  transition: transform 0.2s var(--motion-ease), width 0.2s var(--motion-ease);
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
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 16px 14px 8px;
  }

  &__brand-link {
    display: flex;
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
    border-radius: 50%;
    background: var(--color-creative-violet);
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }

  &__collapse {
    display: none;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-ink-tertiary);
    cursor: pointer;

    &:hover {
      background: var(--color-surface-2);
      color: var(--color-ink-primary);
    }

    @media (min-width: 768px) {
      display: flex;
    }
  }

  &__close-btn {
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;

    @media (min-width: 768px) {
      display: none;
    }
  }

  &__nav {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 8px 10px 16px;
  }

  &__divider {
    height: 1px;
    margin: 8px 6px;
    background: var(--color-border-whisper);
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
    align-items: center;
    gap: 10px;
    min-height: 42px;
    border-radius: 12px;
    padding: 0 12px;
    text-decoration: none;
    color: var(--color-ink-secondary);
    transition: color 0.2s var(--motion-ease), background-color 0.2s var(--motion-ease);
    border: none;
    background: transparent;
    cursor: pointer;

    &:hover {
      background: var(--color-surface-2);
      color: var(--color-ink-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-creative-violet);
      outline-offset: 2px;
    }

    &--active {
      background: var(--color-surface-2);
      color: var(--color-ink-primary);
      font-weight: 600;

      .sidebar__nav-icon,
      .sidebar__chevron {
        color: var(--color-ink-primary);
      }
    }
  }

  &__nav-icon {
    flex-shrink: 0;
    font-size: 18px;
  }

  &__nav-label {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    line-height: 1.2;
  }

  &__chevron {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--color-ink-quaternary);
  }

  @media (min-width: 768px) {
    &--collapsed {
      width: 76px;

      .sidebar__brand {
        flex-direction: column;
        padding: 16px 8px 8px;
      }

      .sidebar__nav {
        padding-inline: 8px;
      }

      .sidebar__nav-label,
      .sidebar__chevron {
        display: none;
      }

      .sidebar__nav-item {
        justify-content: center;
        width: 44px;
        margin-inline: auto;
        padding: 0;
      }

      .sidebar__divider {
        margin-inline: 10px;
      }
    }
  }
}
</style>
