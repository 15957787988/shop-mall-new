import { tools as localTools } from "@/mock/tools";

/** 工具开放状态 */
export type ToolStatus = "open" | "closed";

/**
 * 工具开放状态注册表
 * open = 已有后端能力，closed = 展示「功能未开放」
 * 数据来源：开发计划.md §四 工具开放状态总表
 */
export const TOOL_CAPABILITY: Record<string, ToolStatus> = {
  t1: "open",
  t2: "closed",
  t3: "closed",
  t4: "closed",
  t5: "open",
  t6: "closed",
  t7: "open",
  t8: "open",
  t9: "closed",
  t10: "closed",
  t11: "closed",
  t12: "closed",
  t13: "closed",
  t14: "closed",
  t15: "closed",
  t16: "closed",
  t17: "closed",
  t18: "closed",
  t19: "closed",
  t20: "closed",
  t21: "closed",
  t22: "closed",
  t23: "closed",
  t24: "closed",
  t25: "closed",
  t26: "closed",
  t27: "closed",
  t28: "closed",
  t29: "open",
  t30: "closed",
  t31: "open",
  t32: "open",
  t33: "closed",
  t34: "open",
  t35: "closed",
  t36: "open",
} as const;

/** 判断工具是否开放 */
export function isToolOpen(toolId: string): boolean {
  return TOOL_CAPABILITY[toolId] === "open";
}

/** 获取所有开放工具 ID */
export function getOpenToolIds(): string[] {
  return Object.entries(TOOL_CAPABILITY)
    .filter(([_, status]) => status === "open")
    .map(([id]) => id);
}

/** 获取本地 tools.ts 中所有 closed 工具 ID */
export function getClosedToolIds(): string[] {
  return localTools
    .filter((t) => TOOL_CAPABILITY[t.id] === "closed")
    .map((t) => t.id);
}

/** 开放的 8 个工具 ID */
export const OPEN_TOOL_IDS = getOpenToolIds();
