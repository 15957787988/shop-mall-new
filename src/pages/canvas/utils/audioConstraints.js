/** 画布音频上传约束 — 对齐火山 Omni UploadOmniRef */

export const AUDIO_MAX_SINGLE_DURATION = 15
export const AUDIO_TOTAL_MAX_DURATION = 15
/** @deprecated 用 AUDIO_MAX_SINGLE_DURATION */
export const AUDIO_MAX_DURATION = AUDIO_MAX_SINGLE_DURATION
export const AUDIO_MAX_SIZE = 15 * 1024 * 1024
export const AUDIO_EXTS = ['mp3', 'wav']
export const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav']
export const ACCEPT_AUDIO = 'audio/mpeg,audio/wav,.mp3,.wav'

export function isAudioFile(file) {
  if (!file) return false
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return AUDIO_EXTS.includes(ext) || AUDIO_TYPES.includes(file.type)
}

/** @returns {Promise<number>} */
export function readAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    const url = URL.createObjectURL(file)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('metadata failed'))
    }
    audio.src = url
  })
}

export function isValidAudioDuration(duration) {
  return Number.isFinite(duration) && duration > 0
}

/** 单文件时长上限 @returns {string|null} */
export function validateAudioSingleDuration(duration, maxSingle = AUDIO_MAX_SINGLE_DURATION) {
  const d = Number(duration)
  if (!isValidAudioDuration(d)) return '无法读取音频时长，请更换文件后重试'
  const cap = Number(maxSingle)
  const max = Number.isFinite(cap) && cap > 0 ? cap : AUDIO_MAX_SINGLE_DURATION
  if (d > max) {
    return `音频时长不能超过 ${max} 秒`
  }
  return null
}

/**
 * 上传校验：格式 + 大小 + 可读时长（不限最小时长，单文件 ≤ maxSingle）
 * @returns {string|null} error message，通过返回 null
 */
export function validateAudioUpload(file, duration, maxSingle = AUDIO_MAX_SINGLE_DURATION) {
  if (!isAudioFile(file)) return '音频仅支持 mp3、wav'
  if (file.size > AUDIO_MAX_SIZE) return `音频不能超过 ${AUDIO_MAX_SIZE / 1024 / 1024}MB`
  return validateAudioSingleDuration(duration, maxSingle)
}

/** 参考音频总时长 @returns {string|null} */
export function validateAudioTotalDuration(
  existingTotalSec,
  newDurationSec,
  maxTotal = AUDIO_TOTAL_MAX_DURATION
) {
  const max = Number(maxTotal)
  const cap = Number.isFinite(max) && max > 0 ? max : AUDIO_TOTAL_MAX_DURATION
  const total = (Number(existingTotalSec) || 0) + (Number(newDurationSec) || 0)
  if (total > cap) {
    return `音频总时长不能超过 ${cap} 秒（当前已有 ${Math.ceil(Number(existingTotalSec) || 0)} 秒）`
  }
  return null
}

export function formatAudioClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
