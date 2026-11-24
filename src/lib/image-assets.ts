/** 项目展示图片统一从腾讯云 COS 加载，本地原图保留用于维护。 */
const IMAGE_BASE_URL =
  'https://shortvideo-1308198648.cos.ap-guangzhou.myqcloud.com/frontend/images/d832a4eca23d'

export function imageAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${IMAGE_BASE_URL}/${path.replace(/^\/?images\//, '').replace(/^\//, '')}`
}
