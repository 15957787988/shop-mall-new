export const AI_IMAGE_MIN_PX = 300
export const AI_IMAGE_MAX_PX = 6000
export const AI_IMAGE_MIN_RATIO = 0.4
export const AI_IMAGE_MAX_RATIO = 2.5

export const AI_IMAGE_CONSTRAINTS_TIP = `宽高需在 ${AI_IMAGE_MIN_PX}-${AI_IMAGE_MAX_PX}px，宽高比需在 ${AI_IMAGE_MIN_RATIO}-${AI_IMAGE_MAX_RATIO} 之间`

export function checkAiImageDimensions(width, height) {
  const ratio = height > 0 ? width / height : 0
  const ratioValid = ratio >= AI_IMAGE_MIN_RATIO && ratio <= AI_IMAGE_MAX_RATIO
  const sizeValid =
    width >= AI_IMAGE_MIN_PX &&
    width <= AI_IMAGE_MAX_PX &&
    height >= AI_IMAGE_MIN_PX &&
    height <= AI_IMAGE_MAX_PX
  return { valid: ratioValid && sizeValid, ratio, width, height }
}

function measureAiImage(src, revoke) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      revoke?.()
      resolve(checkAiImageDimensions(img.width, img.height))
    }
    img.onerror = () => {
      revoke?.()
      resolve({ valid: false, ratio: 0, width: 0, height: 0 })
    }
    img.src = src
  })
}

export function validateAiImageConstraints(source) {
  if (typeof source === 'string') return measureAiImage(source)
  const url = URL.createObjectURL(source)
  return measureAiImage(url, () => URL.revokeObjectURL(url))
}

export function formatAiImageValidationError(result, fileName) {
  const ratio = result.ratio > 0 ? result.ratio.toFixed(2) : '未知'
  const size = result.width > 0 ? `${result.width}×${result.height}px` : '未知'
  return `${fileName}（尺寸: ${size}，宽高比: ${ratio}）`
}
