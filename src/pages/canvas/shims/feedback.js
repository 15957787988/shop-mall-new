import { createVNode, ref } from 'vue'
import { Input, Modal, message } from 'ant-design-vue'

function show(type, input) {
  const content = typeof input === 'string' ? input : input?.message || ''
  const raw = typeof input === 'object' ? input?.duration : undefined
  const duration = raw > 20 ? raw / 1000 : raw
  return duration ? message[type]({ content, duration }) : message[type](content)
}

export const ElMessage = {
  success: (input) => show('success', input),
  error: (input) => show('error', input),
  warning: (input) => show('warning', input),
  info: (input) => show('info', input),
}

export const ElMessageBox = {
  confirm(content, title, options = {}) {
    return new Promise((resolve, reject) => {
      Modal.confirm({
        title: title || '确认',
        content,
        okText: options.confirmButtonText || '确定',
        cancelText: options.cancelButtonText || '取消',
        okType: String(options.confirmButtonClass || '').includes('delete') ? 'danger' : 'primary',
        onOk: () => resolve(),
        onCancel: () => reject('cancel'),
      })
    })
  },
  prompt(label, title, options = {}) {
    const current = ref(options.inputValue || '')
    return new Promise((resolve, reject) => {
      Modal.confirm({
        title: title || '请输入',
        content: createVNode('div', {}, [
          createVNode('div', { style: 'margin-bottom:8px' }, label),
          createVNode(Input, {
            defaultValue: current.value,
            'onUpdate:value': (value) => {
              current.value = value
            },
          }),
        ]),
        okText: options.confirmButtonText || '确定',
        cancelText: options.cancelButtonText || '取消',
        onOk: () => resolve({ value: current.value }),
        onCancel: () => reject('cancel'),
      })
    })
  },
}
