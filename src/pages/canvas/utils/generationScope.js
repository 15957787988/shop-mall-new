/** 只停止离开画布后的客户端回写；已提交的服务端生成任务继续执行。 */
export function createGenerationScopes(getProjectId) {
  let revision = 0
  let disposed = false
  return {
    invalidate() {
      revision++
    },
    dispose() {
      disposed = true
      revision++
    },
    capture() {
      const capturedRevision = revision
      const projectId = getProjectId()
      const isActive = () =>
        !disposed && capturedRevision === revision && projectId === getProjectId()
      return {
        isActive,
        async wait(promise) {
          const value = await promise
          if (!isActive()) throw new Error('画布生成回调已失效')
          return value
        },
        progress(callback) {
          return (...args) => {
            if (isActive()) callback?.(...args)
          }
        }
      }
    }
  }
}
