/** 工具列表/卡片入口 */
export function getToolHref(toolId: string): string {
  if (toolId === "t1") {
    return "/tools/ai-product-image";
  }
  if (toolId === "t8") return "/tools/t8";
  if (toolId === "t13") return "/tools/try-on";
  if (toolId === "t7") return "/workspace?tool=t7";
  return `/tools/${toolId}`;
}

/** 开放工具的创作入口路由 */
export function getToolWorkspaceHref(toolId: string): string {
  if (toolId === "t1") {
    return "/tools/ai-product-image";
  }
  if (toolId === "t8") return "/tools/t8";
  if (toolId === "t13") return "/tools/try-on";
  if (toolId === "t7") return "/workspace?tool=t7";
  return `/workspace?tool=${toolId}`;
}

/**
 * 从 linkUrl 解析 toolId
 * 支持格式: /tools/t5, /workspace?tool=t5, /tools/ai-product-image
 */
export function parseToolIdFromLinkUrl(linkUrl: string | undefined): string | null {
  if (!linkUrl) return null;

  // /tools/t5 -> t5
  // /tools/ai-product-image -> t1 (特殊映射)
  // /workspace?tool=t5 -> t5
  const toolsMatch = linkUrl.match(/\/tools\/([a-z0-9-]+)/i);
  if (toolsMatch?.[1]) {
    const pathId = toolsMatch[1];
    // 特殊工具映射
    if (pathId === "ai-product-image") return "t1";
    return pathId;
  }

  const workspaceMatch = linkUrl.match(/[?&]tool=([a-z0-9-]+)/i);
  if (workspaceMatch?.[1]) {
    return workspaceMatch[1];
  }

  return null;
}
