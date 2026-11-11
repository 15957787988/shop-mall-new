import http from '@/service/http'

export interface LibraryAsset {
  id: string | number
  source: 'uploaded' | 'saved' | 'generated'
  kind: 'image' | 'video' | 'audio'
  name: string
  url: string
  coverUrl?: string
  projectId?: string | number
  fileSize?: string | number
  mimeType?: string
  createdAt?: string
}
export interface AssetPage {
  list: LibraryAsset[]
  total: number
}
export function listAssets(params: {
  source: string
  kind?: string
  projectId?: string
  pageNo: number
  pageSize: number
}) {
  return http.get<AssetPage>('/admin-api/ai/assets', params)
}
export function removeAsset(id: string | number) {
  return http.delete('/admin-api/ai/assets', { id })
}
