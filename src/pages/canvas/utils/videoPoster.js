import { galleryPoster, isVideoUrl } from './galleryMedia.js'

export function videoPoster(source, poster = '') {
  if (poster && poster !== source && !isVideoUrl(poster)) return galleryPoster('', poster)
  // 无扩展名的媒体地址也可能是视频，不能直接当作图片下载。
  return isVideoUrl(source) ? galleryPoster(source) : ''
}
