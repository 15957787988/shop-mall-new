import { ElMessage, ElMessageBox } from './feedback'

export function useMessage() {
  return {
    info: (content, options) => ElMessage.info(options ? { message: content, ...options } : content),
    error: (content, options) => ElMessage.error(options ? { message: content, ...options } : content),
    success: (content, options) => ElMessage.success(options ? { message: content, ...options } : content),
    warning: (content, options) => ElMessage.warning(options ? { message: content, ...options } : content),
    confirm: (content, tip) => ElMessageBox.confirm(content, tip),
  }
}
