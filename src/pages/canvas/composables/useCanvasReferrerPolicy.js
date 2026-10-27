import { onActivated, onDeactivated, onBeforeUnmount } from 'vue'

let consumers = 0
let meta = null
let previousPolicy = 'strict-origin-when-cross-origin'

// <video> 不支持 referrerpolicy，必须在子组件发起媒体请求前设置文档策略。
// 第三方视频允许空 Referer，但会拒绝本站 Referer。
export function useCanvasReferrerPolicy() {
  let active = false

  function activate() {
    if (active || typeof document === 'undefined') return
    active = true
    if (consumers++ > 0) return

    meta = document.head.querySelector('meta[name="referrer" i]')
    previousPolicy = meta?.getAttribute('content') || 'strict-origin-when-cross-origin'
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'referrer'
      meta.content = 'no-referrer'
      document.head.appendChild(meta)
    } else {
      meta.content = 'no-referrer'
    }
  }

  function deactivate() {
    if (!active) return
    active = false
    if (--consumers > 0) return
    // 删除 meta 不会恢复文档策略，需要显式写回。
    meta.content = previousPolicy
    meta = null
  }

  activate()
  onActivated(activate)
  onDeactivated(deactivate)
  onBeforeUnmount(deactivate)
}
