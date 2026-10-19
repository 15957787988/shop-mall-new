/**
 * Multi-tab / multi-window canvas sync helpers.
 * Prevents a passive session from overwriting a newer remote graph.
 */

export function toMillis(ts) {
  if (ts == null || ts === '') return 0
  if (typeof ts === 'number') return Number.isFinite(ts) ? ts : 0
  const n = Date.parse(ts)
  return Number.isFinite(n) ? n : 0
}

/** Remote updatedAt is strictly newer than the version this session loaded/last saved. */
export function isRemoteNewer(remoteUpdatedAt, baseUpdatedAt) {
  return toMillis(remoteUpdatedAt) > toMillis(baseUpdatedAt)
}

/** Only persist when this session has local edits. Clean leave must not write. */
export function shouldPersistCanvas({ isDirty }) {
  return !!isDirty
}

/**
 * On focus/visibility: reload remote graph when server moved ahead and local is clean.
 * Dirty local edits win until user resolves conflict (skip auto-reload).
 */
export function shouldReloadFromRemote({ isDirty, remoteUpdatedAt, baseUpdatedAt }) {
  if (isDirty) return false
  return isRemoteNewer(remoteUpdatedAt, baseUpdatedAt)
}
