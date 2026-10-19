async function saveUrl(src, fileName) {
  const res = await fetch(src)
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function useDownloader() {
  return {
    async download({ picUrl, prompt }) {
      const name = String(prompt || 'image').slice(0, 40) || 'image'
      await saveUrl(picUrl, `${name}.png`)
    },
  }
}

export function downloadVideo(src, fileName) {
  return saveUrl(src, fileName || 'video.mp4')
}
