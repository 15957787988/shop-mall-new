export const CANVAS_PLAYBACK = Symbol('canvas-playback')

function sourceOf(video) {
  return video.getAttribute('src') || ''
}

function readPosition(video) {
  return {
    source: sourceOf(video),
    time: video.currentTime,
    volume: video.volume,
    muted: video.muted,
    rate: video.playbackRate
  }
}

export function applyPlaybackPosition(video, position) {
  if (!position || position.source !== sourceOf(video)) return
  video.volume = position.volume
  video.muted = position.muted
  video.playbackRate = position.rate
  if (Number.isFinite(position.time)) {
    // HAVE_NOTHING 时 currentTime 可设置默认起播位置，无需额外监听或缓存。
    const duration = video.readyState > 0 && Number.isFinite(video.duration) ? video.duration : position.time
    video.currentTime = Math.max(0, Math.min(position.time, duration))
  }
}

/** 每个编辑页持有一个实例；只管理该画布登记的视频，不查询全局 DOM。 */
export function createCanvasPlayback(onPlayingChange = () => {}) {
  const players = new Map()
  let active = null
  let disposed = false
  function setActive(video) {
    if (active === video) return
    active = video
    onPlayingChange(!!video)
  }
  function pauseAll() {
    setActive(null)
    for (const video of players.keys()) if (!video.paused) video.pause()
  }
  function register(video, nodeId) {
    if (!video || disposed) return () => {}
    if (players.has(video)) return players.get(video).unregister
    function play() {
      // 延迟到达的 play 事件不能让已被暂停的旧播放器抢回播放权。
      if (video.paused || video.ended) return
      setActive(video)
      for (const other of players.keys()) {
        if (other !== video && !other.paused) other.pause()
      }
    }
    function stop() {
      if (active === video && (video.paused || video.ended || video.error)) setActive(null)
    }
    function reset() {
      if (active === video) setActive(null)
    }
    const listeners = { play, pause: stop, ended: reset, error: reset, emptied: reset }
    for (const [name, listener] of Object.entries(listeners)) video.addEventListener(name, listener)
    function unregister() {
      if (!players.delete(video)) return
      for (const [name, listener] of Object.entries(listeners)) video.removeEventListener(name, listener)
      if (active === video) setActive(null)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    players.set(video, { unregister, nodeId })
    if (!video.paused) play()
    return unregister
  }
  function positionFor(source, nodeId) {
    const matches = (video) => sourceOf(video) === source &&
      (nodeId === undefined || players.get(video)?.nodeId === nodeId)
    const video = active && matches(active)
      ? active
      : [...players.keys()].find(matches)
    return video ? readPosition(video) : null
  }
  function syncPosition(video, nodeId) {
    if (!video || video.readyState === 0) return
    const position = readPosition(video)
    for (const other of players.keys()) {
      if (other !== video && (nodeId === undefined || players.get(other).nodeId === nodeId)) {
        applyPlaybackPosition(other, position)
      }
    }
  }
  function dispose() {
    disposed = true
    for (const { unregister } of [...players.values()]) unregister()
    setActive(null)
  }
  return { register, pauseAll, positionFor, syncPosition, dispose }
}
