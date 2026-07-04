export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  hot?: boolean;
}

export type ToolCategory =
  | "ai-shoot"
  | "video"
  | "wear"
  | "image"
  | "design"
  | "template-scene"
  | "template-industry";

export const TOOL_CATEGORIES: Record<
  ToolCategory,
  { label: string; count: number }
> = {
  "ai-shoot": { label: "AI商拍", count: 7 },
  video: { label: "视频制作", count: 5 },
  wear: { label: "穿戴模板", count: 7 },
  image: { label: "图片处理", count: 9 },
  design: { label: "智能设计", count: 8 },
  "template-scene": { label: "模板场景", count: 0 },
  "template-industry": { label: "行业模板", count: 0 },
};

export const tools: Tool[] = [
  {
    id: "t1",
    name: "AI商品套图",
    description: "一键生成电商商品套图",
    category: "ai-shoot",
    hot: true,
  },
  {
    id: "t2",
    name: "A+详情页",
    description: "亚马逊 A+ 详情页设计",
    category: "ai-shoot",
  },
  {
    id: "t3",
    name: "爆款图复刻",
    description: "复刻热门商品主图风格",
    category: "ai-shoot",
    hot: true,
  },
  {
    id: "t4",
    name: "批量套图",
    description: "批量生成商品展示图",
    category: "ai-shoot",
  },
  {
    id: "t5",
    name: "AI商品图",
    description: "智能生成商品展示图",
    category: "ai-shoot",
    hot: true,
  },
  {
    id: "t6",
    name: "AI商品精修",
    description: "自动精修商品细节",
    category: "ai-shoot",
  },
  {
    id: "t7",
    name: "AI带货视频",
    description: "生成带货短视频",
    category: "ai-shoot",
  },
  {
    id: "t8",
    name: "爆款视频",
    description: "复刻热门带货视频",
    category: "video",
    hot: true,
  },
  {
    id: "t9",
    name: "视频复刻",
    description: "一键复刻视频风格",
    category: "video",
  },
  {
    id: "t10",
    name: "视频背景移除",
    description: "智能去除视频背景",
    category: "video",
  },
  {
    id: "t11",
    name: "AI视频变清晰",
    description: "提升视频清晰度",
    category: "video",
  },
  {
    id: "t12",
    name: "视频去水印",
    description: "智能去除视频水印",
    category: "video",
  },
  {
    id: "t13",
    name: "AI穿戴套图",
    description: "生成穿戴展示套图",
    category: "wear",
  },
  {
    id: "t14",
    name: "AI模特",
    description: "虚拟模特展示服装",
    category: "wear",
    hot: true,
  },
  {
    id: "t15",
    name: "AI试衣",
    description: "在线虚拟试衣",
    category: "wear",
    hot: true,
  },
  {
    id: "t16",
    name: "人像换背景",
    description: "一键替换人像背景",
    category: "wear",
  },
  {
    id: "t17",
    name: "服装去皱",
    description: "自动平整服装褶皱",
    category: "wear",
  },
  {
    id: "t18",
    name: "AI服装换色",
    description: "一键更换服装颜色",
    category: "wear",
  },
  {
    id: "t19",
    name: "AI试鞋",
    description: "虚拟试鞋体验",
    category: "wear",
  },
  {
    id: "t20",
    name: "图片编辑",
    description: "专业图片编辑工具",
    category: "image",
  },
  {
    id: "t21",
    name: "智能抠图",
    description: "AI 智能抠图去背景",
    category: "image",
    hot: true,
  },
  {
    id: "t22",
    name: "AI消除",
    description: "智能消除图片杂物",
    category: "image",
  },
  {
    id: "t23",
    name: "变清晰",
    description: "提升图片清晰度",
    category: "image",
  },
  {
    id: "t24",
    name: "图片翻译",
    description: "图片文字智能翻译",
    category: "image",
  },
  {
    id: "t25",
    name: "图片批处理",
    description: "批量处理多张图片",
    category: "image",
  },
  {
    id: "t26",
    name: "无损改尺寸",
    description: "无损调整图片尺寸",
    category: "image",
  },
  {
    id: "t27",
    name: "拼图",
    description: "多图拼接工具",
    category: "image",
  },
  {
    id: "t28",
    name: "AI扩图",
    description: "智能扩展图片画幅",
    category: "image",
  },
  {
    id: "t29",
    name: "LivePPT",
    description: "AI 智能生成 PPT",
    category: "design",
    hot: true,
  },
  {
    id: "t30",
    name: "证件照",
    description: "一键生成标准证件照",
    category: "design",
  },
  {
    id: "t31",
    name: "AI海报",
    description: "智能生成营销海报",
    category: "design",
    hot: true,
  },
  {
    id: "t32",
    name: "AI Logo",
    description: "AI 生成品牌 Logo",
    category: "design",
  },
  {
    id: "t33",
    name: "AI图文笔记",
    description: "图文笔记智能排版",
    category: "design",
  },
  {
    id: "t34",
    name: "AI文案",
    description: "营销文案智能生成",
    category: "design",
  },
  {
    id: "t35",
    name: "AI花字",
    description: "创意花字艺术字",
    category: "design",
  },
  {
    id: "t36",
    name: "AI Agent",
    description: "智能设计助手",
    category: "design",
    hot: true,
  },
];
