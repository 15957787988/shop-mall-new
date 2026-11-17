import type { ToolCategory } from "@/mock/tools";

export function getToolPreviewGradient(_category: ToolCategory): string {
  return "linear-gradient(to bottom right, var(--color-surface-1), var(--color-surface-2))";
}
