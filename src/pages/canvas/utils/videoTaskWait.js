// This is a UI waiting limit, not the server's generation/failure/refund deadline.
export const VIDEO_WAIT_TIMEOUT_MS = 15 * 60 * 1000
export const VIDEO_WAIT_TIMEOUT_MESSAGE = '视频等待已超过15分钟，暂未取得最终结果；系统会继续查询，请勿重复提交'

export function videoWaitState(data, now = Date.now()) {
  const startedAt = Number(data?.genRequestedAt)
  const expired = !!data?.genWaitTimedOut || (startedAt > 0 && now - startedAt >= VIDEO_WAIT_TIMEOUT_MS)
  return {
    genWaitTimedOut: expired,
    generating: !expired,
    genError: expired ? VIDEO_WAIT_TIMEOUT_MESSAGE : ''
  }
}

export function videoWaitTimeoutError() {
  const error = new Error(VIDEO_WAIT_TIMEOUT_MESSAGE)
  error.waitTimedOut = true
  return error
}
