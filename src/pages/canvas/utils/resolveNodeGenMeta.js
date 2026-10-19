/** 分辨率档位 → 长边像素（与 AIPanel 图片参数一致） */
export const IMAGE_RES_BASE = { '1K': 1024, '2K': 2048, '4K': 4096 }

/** 根据面板 settings 推算图片像素尺寸文案，如 "1024 x 1024" */
export function resolveImageDimensionsFromSettings(settings) {
  if (!settings || settings.mode !== 'image') return ''
  const ratio = settings.imageRatio || '1:1'
  const base = IMAGE_RES_BASE[settings.imageRes] || 1024
  const [w, h] = ratio.split(':').map(Number)
  if (!w || !h) return `${base} x ${base}`
  if (w >= h) return `${base} x ${Math.round((base * h) / w)}`
  return `${Math.round((base * w) / h)} x ${base}`
}

/** 视频节点 header 尺寸：比例 + 分辨率 */
export function resolveVideoDimensionsFromSettings(settings) {
  if (!settings || settings.mode !== 'video') return ''
  const ratio = settings.videoRatio || '16:9'
  const res = settings.videoRes || '720p'
  return `${ratio} ${res}`
}

/** 读取 settings 中的批量生成次数 */
export function getGenCount(settings, kind) {
  if (!settings) return 1
  if (kind === 'image' && settings.mode === 'image') {
    return Math.max(1, Number(settings.imageCount) || 1)
  }
  if (kind === 'video' && settings.mode === 'video') {
    return Math.max(1, Number(settings.videoCount) || 1)
  }
  return 1
}
