import http from '@/service/http'

/**
 * 上传文件
 * @param file 文件对象
 * @param directory 可选的目录前缀
 */
export async function uploadFile(file: File, directory?: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  if (directory) {
    formData.append('directory', directory)
  }
  return http.upload<string>('/admin-api/infra/file/upload', formData)
}


