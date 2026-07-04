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
  'ai-shoot': { icon: AppstoreOutlined, bgColor: '#EDE9FE', iconColor: '#6D28D9' },
  video: { icon: VideoCameraOutlined, bgColor: '#FEE2E2', iconColor: '#DC2626' },
  wear: { icon: SkinOutlined, bgColor: '#FCE7F3', iconColor: '#DB2777' },
  image: { icon: PictureOutlined, bgColor: '#D1FAE5', iconColor: '#059669' },
  design: { icon: HighlightOutlined, bgColor: '#E0E7FF', iconColor: '#4F46E5' },
  'template-scene': { icon: AppstoreOutlined, bgColor: '#EDE9FE', iconColor: '#6D28D9' },
  'template-industry': { icon: AppstoreOutlined, bgColor: '#EDE9FE', iconColor: '#6D28D9' },
}

export function getToolIconStyle(category: ToolCategory): ToolIconStyle {
  return TOOL_ICON_MAP[category] ?? TOOL_ICON_MAP.design
}
