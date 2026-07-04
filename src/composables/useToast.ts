import { message } from 'ant-design-vue'

type ToastType = 'success' | 'error' | 'info'

export function useToast() {
  const addToast = (msg: string, type: ToastType = 'info') => {
    if (type === 'success') message.success(msg)
    else if (type === 'error') message.error(msg)
    else message.info(msg)
  }

  return { addToast }
}
