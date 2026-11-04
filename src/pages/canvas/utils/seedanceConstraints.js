import { checkAiImageDimensions } from '../shims/imageConstraints.js'

export const isSeedance = (model) => /seedance/i.test(String(model?.model || ''))

export function assertSeedanceDimensions(width, height, video = false, name = '参考素材') {
  const size = checkAiImageDimensions(width, height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || !size.valid)
    throw new Error(
      `${name}（${width || '?'}×${height || '?'}px）不合格：宽、高各需300–6000px，宽高比需0.4–2.5`
    )
  const pixels = width * height
  if (video && (pixels < 407696 || pixels > 8295044))
    throw new Error(
      `${name}（${width}×${height}，${pixels}像素）不合格：视频总像素需407696–8295044`
    )
}
