import { TOOL_CATEGORIES, type ToolCategory } from '@/mock/tools'

export const CATEGORY_KEYS = (Object.keys(TOOL_CATEGORIES) as ToolCategory[]).filter(
  (k) => TOOL_CATEGORIES[k].count > 0
)
