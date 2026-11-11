import request from '../api/request'

/** 画布统一文件上传 — 走 /admin-api/infra/file/upload */
export async function uploadCanvasFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const projectId = new URLSearchParams(window.location.search).get('projectId')
  if (projectId) formData.append('projectId', projectId)
  const res = await request.upload({ url: '/infra/file/upload', data: formData })
  const url = res?.data ?? res
  if (!url || typeof url !== 'string') throw new Error('上传失败')
  return url
}
