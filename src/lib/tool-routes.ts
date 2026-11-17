/** 已接通的创作工具入口，兼容旧工具卡片。 */
const creationPaths: Record<string, string> = {
  t1: '/product-set', t2: '/detail-page', t3: '/image-remix',
  t5: '/image', t6: '/product-retouch', t7: '/product-video',
  t8: '/video-remix', t9: '/video-remix', t13: '/virtual-try-on', t15: '/fashion-set',
}
export function getToolHref(toolId: string): string { return creationPaths[toolId] || `/tools/${toolId}` }
export function getToolWorkspaceHref(toolId: string): string { return creationPaths[toolId] || `/workspace?tool=${toolId}` }

/**
 * 从 linkUrl 解析 toolId
 * 支持格式: /tools/t5, /workspace?tool=t5, /tools/ai-product-image
 */
export function parseToolIdFromLinkUrl(linkUrl: string | undefined): string | null {
  if (!linkUrl) return null;

  const creation = Object.entries(creationPaths).find(([, path]) => path === linkUrl.split('?')[0])
  if (creation) return creation[0]

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
