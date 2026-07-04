import { tools as localTools, TOOL_CATEGORIES, type ToolCategory } from "@/mock/tools";
import { TOOL_CAPABILITY, type ToolStatus } from "./tool-capability";
import { getAiToolSimpleList, type AiToolSimpleResp } from '@/pages/tools/api'
import { apiEnv } from '@/service/env'

/** 合并后的工具信息 */
export interface MergedTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  categoryLabel: string;
  hot?: boolean;
  status: ToolStatus;
  /** 是否来自后端（而非纯本地 mock） */
  fromApi: boolean;
}

/** 按 name 匹配本地工具 */
function findLocalTool(
  name: string,
): (typeof localTools)[number] | undefined {
  return localTools.find(
    (t) => t.name === name || t.name.includes(name) || name.includes(t.name),
  );
}

/**
 * 从后台获取工具列表并与本地数据合并
 * - 调 /admin-api/ai/tool/simple-list 获取后端工具
 * - 按 name 匹配本地 tools.ts，保留 category/description/hot
 * - 从 TOOL_CAPABILITY 读取开放状态
 *
 * 兜底：mock 模式或 API 不可用时返回本地全量工具
 */
export async function getMergedTools(): Promise<MergedTool[]> {
  // Mock 模式直接返回本地数据
  if (apiEnv.useMock) {
    return localTools.map((t) => ({
      ...t,
      categoryLabel: TOOL_CATEGORIES[t.category]?.label ?? "",
      status: TOOL_CAPABILITY[t.id] ?? "closed",
      fromApi: false,
    }));
  }

  try {
    const apiTools = await getAiToolSimpleList();

    // 按 name 匹配本地数据
    const merged = apiTools.map((apiTool: AiToolSimpleResp) => {
      const local = findLocalTool(apiTool.name);
      return {
        id: local?.id ?? `api-${apiTool.id}`,
        name: apiTool.name,
        description: local?.description ?? "",
        category: (local?.category ?? "design") as ToolCategory,
        categoryLabel: TOOL_CATEGORIES[local?.category ?? "design"]?.label ?? "",
        hot: local?.hot,
        status: local ? (TOOL_CAPABILITY[local.id] ?? "closed") : "closed",
        fromApi: true,
      };
    });

    // 追加只有本地有但后端未返回的工具
    const apiNames = new Set(apiTools.map((t) => t.name));
    const localOnly = localTools.filter((t) => !apiNames.has(t.name));

    return [
      ...merged,
      ...localOnly.map((t) => ({
        ...t,
        categoryLabel: TOOL_CATEGORIES[t.category]?.label ?? "",
        status: TOOL_CAPABILITY[t.id] ?? "closed",
        fromApi: false,
      })),
    ];
  } catch {
    // API 不可用，回退到本地数据
    return localTools.map((t) => ({
      ...t,
      categoryLabel: TOOL_CATEGORIES[t.category]?.label ?? "",
      status: TOOL_CAPABILITY[t.id] ?? "closed",
      fromApi: false,
    }));
  }
}

/** 获取开放的合并工具列表 */
export async function getOpenMergedTools(): Promise<MergedTool[]> {
  const all = await getMergedTools();
  return all.filter((t) => t.status === "open");
}

/** 从本地获取工具列表（同步，用于服务端组件等无需 API 的场景） */
export function getLocalMergedTools(): MergedTool[] {
  return localTools.map((t) => ({
    ...t,
    categoryLabel: TOOL_CATEGORIES[t.category]?.label ?? "",
    status: TOOL_CAPABILITY[t.id] ?? "closed",
    fromApi: false,
  }));
}
