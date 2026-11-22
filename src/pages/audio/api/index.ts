import http from '@/service/http'
export interface AudioConfig { ready: boolean; points: number; referenceUrl: string; message: string }
export interface AudioTrack { title: string; audio_url: string; duration?: number; image_url?: string; image_large_url?: string }
export interface AudioTask { id: number; lyrics: string; style: string; state: string; error?: string; createdAt: string; music: AudioTrack[] }
export const getAudioConfig = () => http.get<AudioConfig>('/admin-api/ai/audio/config')
export const getAudioTasks = () => http.get<AudioTask[]>('/admin-api/ai/audio/my-tasks')
export const generateAudio = (body: { lyrics: string; style: string; submitKey: string }) => http.post<number>('/admin-api/ai/audio/generate', body)

export const deleteAudioTask = (id: number) => http.delete<boolean>(`/admin-api/ai/audio/${id}`)
export async function downloadAudioTrack(id: number, index: number): Promise<void> {
  const blob = await http.getBlob(`/admin-api/ai/audio/${id}/download`, { index })
  if (blob.type.includes('json')) {
    const result = JSON.parse(await blob.text()) as { msg?: string; message?: string }
    throw new Error(result.msg || result.message || '下载失败')
  }
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  try { anchor.href = url; anchor.download = `audio-${id}-${index + 1}.mp3`; document.body.appendChild(anchor); anchor.click() }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
