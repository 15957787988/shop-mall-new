/** 套图单张图片 */
export interface SaleorImageItem {
  id: string;
  picUrl: string;
  label: string;
  texts: string[];
  selected?: boolean;
  status?: number;
  progress?: string;
  errorMessage?: string;
}

/** 商品上架文案 */
export interface SaleorCopyContent {
  title: string;
  sellingPoints: string;
  detailCopy: string;
  keywords: string;
}

/** 一次生成结果（套图 + 文案） */
export interface SaleorResultGroup {
  id: string;
  title: string;
  createTime: string;
  images: SaleorImageItem[];
  copyContent: SaleorCopyContent;
  status?: number;
}

/** 套图结构配置项 */
export interface StructureConfigItem {
  key: string;
  label: string;
  desc: string;
  count: number;
  min?: number;
  max?: number;
}

/** 左侧表单数据 */
export interface SaleorFormData {
  productImages: string[];
  platform: string;
  region: string;
  language: string;
  aspectRatio: string;
  sellingPoints: string;
  structureMode: "smart" | "custom";
  structureConfig: StructureConfigItem[];
}
