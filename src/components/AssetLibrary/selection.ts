import type { LibraryAsset } from './api'

const UPLOAD_FORMATS = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  video: ['.mp4', '.mov', '.webm'],
  audio: ['.mp3', '.wav', '.m4a', '.ogg'],
}

export function libraryUploadAccept(kinds: LibraryAsset['kind'][]) {
  return kinds.flatMap((kind) => UPLOAD_FORMATS[kind]).join(',')
}

export function matchesLibraryUpload(name: string, kinds: LibraryAsset['kind'][]) {
  const dot = name.lastIndexOf('.')
  return dot >= 0 && libraryUploadAccept(kinds).split(',').includes(name.slice(dot).toLowerCase())
}

/** 已知文件元数据先校验；模型专属尺寸、时长仍由各生成入口校验。 */
export function validateLibrarySelection(
  assets: LibraryAsset[],
  existing: string[],
  limit: number,
  types: string[],
  maxMB?: number
) {
  const fresh = assets.filter(
    (asset, index) =>
      !existing.includes(asset.url) && assets.findIndex((item) => item.url === asset.url) === index
  )
  if (existing.length + fresh.length > limit) throw new Error(`最多添加 ${limit} 个素材`)
  for (const asset of fresh) {
    const ext = new URL(asset.url, window.location.origin).pathname.split('.').pop()?.toLowerCase()
    const formats = types.map((type) => type.toLowerCase().replace(/^\./, ''))
    const supported = formats.some(
      (type) =>
        type === ext ||
        type === `${asset.kind}/${ext}` ||
        type === asset.mimeType?.toLowerCase() ||
        type === `${asset.kind}/*` ||
        (asset.kind === 'image' && type === 'image/jpeg' && ['jpg', 'jpeg'].includes(ext || ''))
    )
    if (!supported) throw new Error(`素材「${asset.name}」格式不符合当前上传要求`)
    if (maxMB && asset.fileSize != null && Number(asset.fileSize) >= maxMB * 1024 * 1024)
      throw new Error(`素材「${asset.name}」不能超过 ${maxMB}MB`)
  }
  return fresh
}
