const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogg)$/i

export function isVideoUrl(source) {
  if (typeof source !== 'string') return false
  return VIDEO_RE.test(source.split(/[?#]/)[0])
}

// Only this public CDN has been verified to support OSS image processing.
// Existing query strings may be signed; never discard or rewrite them.
export function galleryPoster(source, poster = '') {
  const candidate = poster && !isVideoUrl(poster) ? poster : source
  if (!candidate) return ''
  try {
    const url = new URL(candidate)
    if (url.protocol === 'https:' && url.hostname === 'cdn.quantv.com' && !url.search) {
      url.hash = ''
      const process = isVideoUrl(candidate)
        ? 'video/snapshot,t_0,f_jpg,w_480,m_fast'
        : 'image/resize,w_480,m_lfit/quality,q_75/format,webp'
      return `${url.href}?x-oss-process=${process}`
    }
  } catch {
    // Relative image URLs stay usable; unknown videos use the visible player as a fallback.
  }
  return isVideoUrl(candidate) ? '' : candidate
}

export function canAutoplayPreview(nav = navigator, match = window.matchMedia.bind(window)) {
  return !nav.connection?.saveData && !match('(prefers-reduced-motion: reduce)').matches
}
