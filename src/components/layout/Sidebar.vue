<template>
  <div v-if="open" class="sidebar__backdrop" aria-hidden @click="onClose" />

  <aside :class="['sidebar', { 'sidebar--open': open, 'sidebar--collapsed': collapsed }]">
    <div class="sidebar__brand">
      <router-link to="/" class="sidebar__brand-link" :title="BRAND_NAME" @click="onClose">
        <span class="sidebar__logo"><PartitionOutlined /></span>
        <span class="sidebar__brand-name">{{ BRAND_NAME }}</span>
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
  ContainerOutlined,
  PartitionOutlined,
  CloseOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  PlayCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue'
import { BRAND_NAME } from '@/lib/brand'

interface Props {
  open: boolean
  onClose: () => void
}
defineProps<Props>()

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
  [{ href: '/', label: '创作工作台', icon: HomeOutlined }, { href: '/tools', label: '全部工具', icon: ToolOutlined }],
  [
    { href: '/canvas/index', label: '无限画布', icon: PartitionOutlined },
    { href: '/image', label: '图片创作', icon: PictureOutlined },
    { href: '/product-video', label: '视频创作', icon: PlayCircleOutlined },
    { href: '/product-set', label: '商品套图', icon: AppstoreOutlined },
    { href: '/video-remix', label: '视频复刻', icon: VideoCameraOutlined },
  ],
  [{ href: '/agent-lib', label: '资产库', icon: ContainerOutlined }],
]

function isNavActive(pathname: string, href: string) {
  const path = pathname
  if (href === '/') return path === '/'
  if (href === '/canvas/index') return path === '/canvas' || path.startsWith('/canvas/')
  if (href === '/tools') return path === '/tools' || (!!route.meta.creationWorkspace && !NAV_GROUPS.flat().some(item => item.href === path))
  return path === href || path.startsWith(`${href}/`)
}
</script>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  visibility: hidden;
  inset: 0 auto 0 0;
  z-index: var(--z-sidebar);
  display: flex;
  width: var(--sidebar-width);
  flex-shrink: 0;
  flex-direction: column;
  background: var(--color-surface-0);
  border-right: 1px solid var(--color-border-whisper);
  transition: transform 0.2s var(--motion-ease), width 0.2s var(--motion-ease);
  transform: translateX(-100%);

  @media (min-width: 768px) {
    position: static;
    visibility: visible;
    transform: translateX(0);
  }

  &--open {
    visibility: visible;
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
    padding: 22px 14px 20px;
  }

  &__brand-link {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    text-decoration: none;
  }

  &__brand-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-ink-primary);
    white-space: nowrap;
  }

  &__logo {
    display: flex;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: var(--color-creative-violet);
    font-size: 20px;
    font-weight: 700;
    color: var(--color-on-media);
  }

  &__collapse {
    display: none;
    width: 26px;
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
    width: 26px;
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
    padding: 0 12px 24px;
  }

  &__divider {
    height: 1px;
    margin: 14px 10px;
    background: var(--color-border-whisper);
  }

  &__main-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__nav-item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    border-radius: 9px;
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
      background: var(--color-accent-soft);
      color: var(--color-creative-violet);
      font-weight: 600;
      box-shadow: inset 3px 0 var(--color-creative-violet);

      .sidebar__nav-icon {
        color: var(--color-creative-violet);
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

      .sidebar__brand-name,
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
