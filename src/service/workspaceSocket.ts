import { resolveApiUrl } from '@/service/http'
import { getAccessToken } from '@/lib/auth/storage'

export type SocketState = 'connecting' | 'connected' | 'reconnecting' | 'unauthorized'

export function subscribeWorkspace(id: number, initialCursor: number, changed: () => void, state: (value: SocketState) => void) {
  let stopped = false
  let socket: WebSocket | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let heartbeat: ReturnType<typeof setTimeout> | undefined
  let cursor = initialCursor
  let delay = 1500
  function connect() {
    if (stopped) return
    state(delay === 1500 ? 'connecting' : 'reconnecting')
    const url = new URL(resolveApiUrl('/admin-api/ai/workspaces/socket'), window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const current = new WebSocket(url.toString())
    socket = current
    heartbeat = setTimeout(() => current.close(), 35000)
    current.onopen = () => {
      if (stopped || socket !== current) { current.close(); return }
      current.send(JSON.stringify({ type: 'authenticate', token: getAccessToken(), workspaceId: id, after: cursor }))
    }
    current.onmessage = (event: MessageEvent<string>) => {
      if (stopped || socket !== current) return
      clearTimeout(heartbeat)
      heartbeat = setTimeout(() => current.close(), 35000)
      try {
        const message: unknown = JSON.parse(event.data)
        if (!message || typeof message !== 'object' || !('type' in message)) return
        const payload = message as { type: string; cursor?: number; code?: number }
        if (payload.type === 'error' && payload.code === 401) { stopped = true; state('unauthorized'); current.close(); changed(); return }
        if (payload.type === 'ready') { delay = 1500; state('connected'); changed() }
        if (payload.type === 'events') {
          if (typeof payload.cursor === 'number' && Number.isSafeInteger(payload.cursor)) cursor = Math.max(cursor, payload.cursor)
          changed()
        }
      } catch { current.close() }
    }
    current.onclose = () => {
      if (stopped || socket !== current) return
      clearTimeout(heartbeat); state('reconnecting')
      retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 20000)
    }
    current.onerror = () => current.close()
  }
  connect()
  return () => { stopped = true; clearTimeout(retry); clearTimeout(heartbeat); socket?.close() }
}
