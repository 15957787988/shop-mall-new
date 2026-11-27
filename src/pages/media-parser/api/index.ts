import http from '@/service/http'
export interface ParsedFile { name: string; kind: 'image' | 'video' }
export interface ParseTask { id: string; state: string; title: string; platform: string; cover: string; files: ParsedFile[]; expiresAt: number }
const base = '/admin-api/ai/media-parser'
export const getConfig = () => http.get<{ ready: boolean }>(`${base}/config`)
export const parseLink = (text: string) => http.post<ParseTask>(base, { text })
export const releaseTask = (id: string) => http.delete<boolean>(`${base}/${id}`)
export const saveAsset = (id: string, index: number) => http.post<string>(`${base}/${id}/save?index=${index}`)
export async function getMedia(id: string, index?: number): Promise<Blob> {
  const blob = await http.getBlob(`${base}/${id}/download`, index === undefined ? {} : { index })
  if (blob.type.includes('json')) {
    const error = JSON.parse(await blob.text()) as { msg?: string }
    throw new Error(error.msg || '下载失败')
  }
  return blob
}
