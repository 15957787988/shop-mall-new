/** 每张套图消耗积分 */
export const POINTS_PER_IMAGE = 3;

/** 子图类型 → 展示标签 */
export const IMAGE_TYPE_LABELS: Record<number, string> = {
  1: "白底图",
  2: "场景图",
  3: "卖点图",
  4: "其他",
};

/** 子图状态：生成中 */
export const DETAIL_STATUS_GENERATING = 10;
/** 子图状态：成功 */
export const DETAIL_STATUS_SUCCESS = 20;
/** 子图状态：失败 */
export const DETAIL_STATUS_FAILED = 30;

export const MIN_TOTAL_IMAGES = 2;
export const MAX_TOTAL_IMAGES = 20;
export const PAGE_SIZE = 20;
export const POLL_INTERVAL = 4000;


export const platformOptions = [
  { label: "亚马逊", value: "amazon" },
  { label: "阿里巴巴", value: "阿里巴巴" },
  { label: "拼多多", value: "拼多多" },
  { label: "抖音电商", value: "抖音电商" },
];

export const countryOptions = [
  { label: "美国", value: "美国" },
  { label: "英国", value: "英国" },
  { label: "日本", value: "日本" },
  { label: "中国", value: "中国" },
  { label: "无", value: "无" },
];

export const languageOptions = [
  { label: "英文", value: "英文" },
  { label: "中文", value: "中文" },
  { label: "俄语", value: "俄语" },
  { label: "西语", value: "西语" },
  { label: "德语", value: "德语" },
  { label: "日语", value: "日语" },
  { label: "韩语", value: "韩语" },
  { label: "葡萄牙语", value: "葡萄牙语" },
  { label: "印尼语", value: "印尼语" },
  { label: "泰语", value: "泰语" },
  { label: "无文字", value: "无文字" },
];

export const ratioOptions = [
  { label: "1:1", value: "1024x1024" },
  { label: "4:3", value: "1152x1536" },
  { label: "9:16", value: "1024x1792" },
  { label: "16:9", value: "1792x1024" },
];

export function defaultStructureConfig() {
  return [
    {
      key: "white",
      label: "白底图",
      desc: "白底主图，多角度展示商品细节",
      count: 1,
      min: 0,
    },
    {
      key: "scene",
      label: "场景图",
      desc: "展示真实使用场景或人物搭配",
      count: 2,
      min: 0,
    },
    {
      key: "selling",
      label: "卖点图",
      desc: "突出核心卖点与功能特性",
      count: 2,
      min: 0,
    },
    {
      key: "detail",
      label: "其他",
      desc: "展示商品局部细节与材质",
      count: 2,
      min: 0,
    },
  ];
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
