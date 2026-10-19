import { ElMessageBox } from '../shims/feedback'

/** @returns {Promise<boolean>} user confirmed */
export async function confirmRemoveNodes(count) {
  if (count <= 0) return false
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${count} 个节点？此操作不可恢复，相关连线会同时断开。`,
      '删除节点',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        customClass: 'canvas-node-delete-msgbox',
        confirmButtonClass: 'canvas-node-delete-msgbox__confirm',
        showClose: false,
      },
    )
    return true
  } catch {
    return false
  }
}
