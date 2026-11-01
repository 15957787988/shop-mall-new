/** 合并同一会话的并发刷新，拒绝旧登录会话的迟到响应。 */
export function createSessionRefresh<T>(options: {
  session: () => string | null
  load: () => Promise<T>
  apply: (value: T) => void
}): (followUp?: boolean) => Promise<T | null> {
  interface Job {
    session: string
    again: boolean
    promise: Promise<T | null>
  }
  let active: Job | null = null
  return (followUp = false) => {
    const session = options.session()
    if (!session) return Promise.resolve(null)
    if (active?.session === session) {
      if (followUp) active.again = true
      return active.promise
    }
    const job: Job = { session, again: false, promise: Promise.resolve(null) }
    active = job
    job.promise = (async () => {
      let value: T | null = null
      do {
        job.again = false
        try {
          const result = await options.load()
          if (options.session() !== session) return null
          options.apply(result)
          value = result
        } catch {
          // 临时失败保留最后一次成功结果，下一次刷新再取最新余额。
        }
      } while (job.again && options.session() === session)
      return value
    })().finally(() => {
      if (active === job) active = null
    })
    return job.promise
  }
}
