import type { Component } from 'vue'
import {
  AppstoreOutlined,
  VideoCameraOutlined,
  SkinOutlined,
  PictureOutlined,
  HighlightOutlined,
} from '@ant-design/icons-vue'
import type { ToolCategory } from '@/mock/tools'

export interface ToolIconStyle {
  icon: Component
  bgColor: string
  iconColor: string
}

export const TOOL_ICON_MAP: Record<ToolCategory, ToolIconStyle> = {
  'ai-shoot': { icon: AppstoreOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
  video: { icon: VideoCameraOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
  wear: { icon: SkinOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
  image: { icon: PictureOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
  design: { icon: HighlightOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
  'template-scene': { icon: AppstoreOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
  'template-industry': { icon: AppstoreOutlined, bgColor: 'var(--color-surface-2)', iconColor: 'var(--color-ink-primary)' },
}

export function getToolIconStyle(category: ToolCategory): ToolIconStyle {
  return TOOL_ICON_MAP[category] ?? TOOL_ICON_MAP.design
}
