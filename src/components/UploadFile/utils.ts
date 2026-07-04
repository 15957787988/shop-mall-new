const MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

const EXTENSION_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/** MIME + 扩展名，兼容 macOS 文件选择器对 webp 的过滤 */
export function buildImageAccept(fileTypes: string[]): string {
  const parts = new Set<string>(fileTypes)
  for (const mime of fileTypes) {
    MIME_EXTENSIONS[mime]?.forEach((ext) => parts.add(ext))
  }
  return [...parts].join(',')
}

export function matchImageFileType(file: File, fileTypes: string[]): boolean {
  if (file.type && fileTypes.includes(file.type)) return true
  const dotIndex = file.name.lastIndexOf('.')
  if (dotIndex < 0) return false
  const ext = file.name.slice(dotIndex).toLowerCase()
  const mime = EXTENSION_MIME[ext]
  return Boolean(mime && fileTypes.includes(mime))
}
