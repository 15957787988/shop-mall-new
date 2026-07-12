import type { ShopImageGenerateReq, ShopImageGroup } from "@/pages/tools/AiProductImage/api";
import { DEFAULT_SALEOR_MODEL_ID } from "@/constants/ai-model";
import type { SaleorFormData, SaleorResultGroup, StructureConfigItem } from "./types";
import { DETAIL_STATUS_FAILED, DETAIL_STATUS_GENERATING, DETAIL_STATUS_SUCCESS, IMAGE_TYPE_LABELS } from "./constants";

const getCountByKey = (config: StructureConfigItem[], key: string) =>
  config.find((item) => item.key === key)?.count ?? 0;

const extractTitle = (sellingPoints: string) => {
  const firstLine = sellingPoints.trim().split("\n")[0]?.trim();
  if (!firstLine) return "商品套图";
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;
};

function formatCreateTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 后端 0/1/2 → 前端展示状态 */
function mapDetailStatus(status: number): number {
  if (status === 1) return DETAIL_STATUS_SUCCESS;
  if (status === 2) return DETAIL_STATUS_FAILED;
  return DETAIL_STATUS_GENERATING;
}

/** 表单 → 生成接口请求体 */
export function formToGenerateReq(form: SaleorFormData): ShopImageGenerateReq {
  const { structureConfig } = form;
  return {
    platform: form.platform,
    modelId: DEFAULT_SALEOR_MODEL_ID,
    title: extractTitle(form.sellingPoints),
    originalUrls: form.productImages.slice(0, 3),
    language: form.language,
    size: form.aspectRatio,
    country: form.country,
    productSellingPoints: form.sellingPoints.trim(),
    whiteBgCount: getCountByKey(structureConfig, "white"),
    sceneCount: getCountByKey(structureConfig, "scene"),
    sellingCount: getCountByKey(structureConfig, "selling"),
    otherCount: getCountByKey(structureConfig, "detail"),
  };
}

/** 接口响应 → 前端展示结构 */
export function groupVoToResult(group: ShopImageGroup): SaleorResultGroup {
  return {
    id: String(group.id),
    title: group.title,
    createTime: formatCreateTime(group.createTime),
    status: group.status,
    images: (group.details ?? []).map((detail) => ({
      id: String(detail.id),
      picUrl: detail.picUrl ?? "",
      label: detail.title?.trim() || IMAGE_TYPE_LABELS[detail.type] || "图片",
      texts: [],
      status: mapDetailStatus(detail.status),
      progress: detail.progress,
      errorMessage: detail.errorMessage ?? undefined,
    })),
    copyContent: {
      title: "",
      sellingPoints: "",
      detailCopy: "",
      keywords: "",
    },
  };
}
