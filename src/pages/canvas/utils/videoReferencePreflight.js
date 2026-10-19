export function submittedVideoReferences(urls, maxVideos) {
  if (!Array.isArray(urls)) return []
  return [...new Set(urls.filter((url) => typeof url === 'string' && /^https?:/.test(url)))].slice(
    0,
    maxVideos
  )
}

/** Single-reference constraints, distinct from output length and reference totals. */
export function resolveMinSingleVideoDuration(model) {
  const seedance25 = /^doubao-seedance-2[.-]5/.test(
    String(model?.model || '')
      .trim()
      .toLowerCase()
  )
  const raw = model?.mediaLimits?.minSingleVideoDuration
  if (raw === undefined) return seedance25 ? 1.8 : 0
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    if (seedance25) throw new Error('模型时长配置无效，请刷新模型配置后重试')
    return 0
  }
  return seedance25 ? Math.max(1.8, value) : value
}

export function readReferenceVideoDuration(url, signal) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const cleanup = () => {
      video.onloadedmetadata = null
      video.onerror = null
      signal?.removeEventListener('abort', abort)
      video.removeAttribute('src')
      video.load()
    }
    const finish = (error, duration) => {
      cleanup()
      error ? reject(error) : resolve(duration)
    }
    const abort = () => finish(new Error('视频校验已取消'))
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    video.preload = 'metadata'
    video.onloadedmetadata = () => finish(null, video.duration)
    video.onerror = () => finish(new Error('无法读取参考视频时长，请重新上传或更换素材'))
    video.src = url
  })
}

/** Fresh metadata on every attempt avoids stale durations after same-URL replacements. */
export function createVideoReferencePreflight({
  readDuration = readReferenceVideoDuration,
  timeoutMs = 10000
} = {}) {
  return {
    async validate(urls, model, { signal, names = [] } = {}) {
      const min = resolveMinSingleVideoDuration(model)
      if (!urls.length || min === 0) return 0
      const controller = new AbortController()
      const cancel = () => controller.abort()
      if (signal?.aborted) throw new Error('视频校验已取消')
      signal?.addEventListener('abort', cancel, { once: true })
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)
      const durations = new Array(urls.length)
      let next = 0
      const aborted = () =>
        new Error(timedOut ? '读取参考视频时长超时，请重新上传或更换素材' : '视频校验已取消')
      try {
        await Promise.all(
          Array.from({ length: Math.min(3, urls.length) }, async () => {
            while (next < urls.length) {
              if (controller.signal.aborted) throw aborted()
              const i = next++
              const name = names[i] || `视频${i + 1}`
              // Race also bounds injected readers that fail to respect AbortSignal.
              let stop
              const cancelled = new Promise((_, reject) => {
                stop = () => reject(aborted())
                controller.signal.addEventListener('abort', stop, { once: true })
              })
              let duration
              try {
                duration = await Promise.race([readDuration(urls[i], controller.signal), cancelled])
              } catch (error) {
                if (controller.signal.aborted) throw aborted()
                throw new Error(`无法读取参考视频「${name}」时长，请重新上传或更换素材`)
              } finally {
                controller.signal.removeEventListener('abort', stop)
              }
              if (controller.signal.aborted) throw aborted()
              if (!Number.isFinite(duration) || duration <= 0)
                throw new Error(`无法读取参考视频「${name}」时长，请重新上传或更换素材`)
              if (duration < min)
                throw new Error(
                  `参考视频「${name}」时长${String(duration)}秒，当前模型要求每个参考视频至少 ${min} 秒，请更换素材`
                )
              durations[i] = duration
            }
          })
        )
        const total = durations.reduce((a, b) => a + b, 0)
        const minimumTotal = Number(
          model?.minTotalVideoDuration ??
            model?.mediaLimits?.minTotalVideoDuration ??
            model?.mediaLimits?.minVideoDuration
        )
        if (Number.isFinite(minimumTotal) && minimumTotal > 0 && total < minimumTotal)
          throw new Error(`参考视频总时长${total}秒，不能低于${minimumTotal}秒`)
        const configured = Number(
          model?.mediaLimits?.maxTotalVideoDuration ?? model?.maxTotalVideoDuration
        )
        const max = Number.isFinite(configured) && configured > 0 ? configured : 15
        if (total > max) throw new Error(`参考视频总时长${total.toFixed(3)}秒，不能超过${max}秒`)
        return total
      } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', cancel)
        controller.abort()
      }
    }
  }
}
