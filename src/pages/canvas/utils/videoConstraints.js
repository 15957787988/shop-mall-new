/** 画布参考视频约束 — 对齐 volcanArk UploadOmniRef OMNI_* */

export const VIDEO_TOTAL_MAX_DURATION = 15

/** 秒:百分秒，如 15s → 15:00，15.32s → 15:32 */
export function formatVideoDuration(seconds) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s < 0) return '--:--'
  const wholeSeconds = Math.floor(s)
  const centiseconds = Math.min(99, Math.round((s - wholeSeconds) * 100))
  return `${wholeSeconds}:${String(centiseconds).padStart(2, '0')}`
}

export function isValidVideoDuration(duration) {
  return Number.isFinite(duration) && duration > 0
}

/** @returns {Promise<number>} */
export function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('metadata failed'))
    }
    video.src = url
  })
}

/** 单文件时长 @returns {string|null} */
export function validateVideoSingleDuration(duration) {
  const d = Number(duration)
  if (!isValidVideoDuration(d)) return '无法读取视频时长，请更换文件后重试'
  return null
}

/** 参考视频总时长 @returns {string|null} */
export function validateVideoTotalDuration(
  existingTotalSec,
  newDurationSec,
  maxTotal = VIDEO_TOTAL_MAX_DURATION
) {
  const max = Number(maxTotal)
  const cap = Number.isFinite(max) && max > 0 ? max : VIDEO_TOTAL_MAX_DURATION
  const total = (Number(existingTotalSec) || 0) + (Number(newDurationSec) || 0)
  if (total > cap) {
    const maxLabel = formatVideoDuration(cap)
    return `所有视频总时长 ${formatVideoDuration(total)}s，不能超过 ${maxLabel}s`
  }
  return null
}

/** @returns {string|null} */
export function validateVideoUpload(duration, existingTotalSec = 0, maxTotal = VIDEO_TOTAL_MAX_DURATION) {
  const singleErr = validateVideoSingleDuration(duration)
  if (singleErr) return singleErr
  return validateVideoTotalDuration(existingTotalSec, duration, maxTotal)
}
