import { inject, watch } from 'vue'
import { CANVAS_PLAYBACK } from '../utils/canvasPlayback'

export function useCanvasVideo(videoRef, nodeId) {
  const playback = inject(CANVAS_PLAYBACK, null)
  watch(videoRef, (video, _previous, onCleanup) => {
    if (!video) return
    const unregister = playback?.register(video, nodeId)
    onCleanup(() => unregister?.())
  }, { flush: 'post' })
  return playback
}
