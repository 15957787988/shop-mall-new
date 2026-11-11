export function readAssetDuration(url: string, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve, reject) => {
    const media = document.createElement(kind)
    const finish = (error?: Error) => {
      clearTimeout(timer)
      media.onloadedmetadata = media.onerror = null
      const duration = media.duration
      media.removeAttribute('src')
      media.load()
      if (error) reject(error)
      else if (!Number.isFinite(duration) || duration <= 0)
        reject(new Error('无法读取素材时长，请更换素材'))
      else resolve(duration)
    }
    const timer = setTimeout(() => finish(new Error('素材读取超时，请重试')), 15000)
    media.preload = 'metadata'
    media.onloadedmetadata = () => finish()
    media.onerror = () => finish(new Error('素材无法访问或格式不受支持'))
    media.src = url
  })
}
