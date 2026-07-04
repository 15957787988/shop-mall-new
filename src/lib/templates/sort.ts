import type { Template } from "./types";

export function sortTemplates(list: Template[], sort: string): Template[] {
  if (sort === "最多下载") {
    return [...list].sort((a, b) => b.downloads - a.downloads);
  }
  if (sort === "最新上传") {
    return [...list].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  }
  if (sort === "综合排序" || sort === "hot") {
    if (list.length === 0) return list;
    const maxDownloads = Math.max(...list.map((t) => t.downloads));
    const times = list.map((t) => new Date(t.uploadedAt).getTime());
    const minTime = Math.min(...times);
    const span = Math.max(...times) - minTime || 1;
    return [...list].sort((a, b) => {
      const scoreA =
        (a.downloads / maxDownloads) * 0.6 +
        ((new Date(a.uploadedAt).getTime() - minTime) / span) * 0.4;
      const scoreB =
        (b.downloads / maxDownloads) * 0.6 +
        ((new Date(b.uploadedAt).getTime() - minTime) / span) * 0.4;
      return scoreB - scoreA;
    });
  }
  return list;
}
