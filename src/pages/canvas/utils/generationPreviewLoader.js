/** Latest preview wins, including when an aborted transport still resolves. */
export function createGenerationPreviewLoader(prepare, update) {
  let revision = 0
  let controller
  return {
    async open(projectId, item) {
      controller?.abort()
      controller = new AbortController()
      const current = ++revision
      update({ status: 'loading', media: null, error: '' })
      try {
        const media = await prepare(projectId, item, controller.signal)
        if (current === revision) update({ status: 'ready', media, error: '' })
      } catch (error) {
        if (current === revision) update({ status: 'error', media: null, error: error?.message || '媒体暂不可用，请重试' })
      }
    },
    close() {
      ++revision
      controller?.abort()
      update({ status: 'idle', media: null, error: '' })
    }
  }
}
