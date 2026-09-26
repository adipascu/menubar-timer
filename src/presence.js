export const IDLE_AFTER_SECONDS = 3 * 60
export const SETTLE_MS = 60 * 1000

export const createPresence = ({ onAway, onBack }) => {
  const reasons = new Set()
  let awaySince = null
  let backAt = null

  const leave = (reason, at) => {
    if (reasons.has(reason)) return
    const wasHere = reasons.size === 0
    reasons.add(reason)
    if (!wasHere) return
    awaySince = at
    onAway(reason, at)
  }

  const comeBack = (reason, at) => {
    if (!reasons.delete(reason) || reasons.size > 0) return
    backAt = at
    onBack(at - awaySince)
  }

  return {
    sample: (idleSeconds, now) =>
      idleSeconds >= IDLE_AFTER_SECONDS ? leave('idle', now - idleSeconds * 1000) : comeBack('idle', now),
    asleep: (now) => leave('asleep', now),
    awake: (now) => comeBack('asleep', now),
    locked: (now) => leave('locked', now),
    unlocked: (now) => comeBack('locked', now),
    isAway: () => reasons.size > 0,
    isSettled: (now) => reasons.size === 0 && (backAt === null || now - backAt >= SETTLE_MS),
    settlesIn: (now) => (backAt === null ? 0 : Math.max(0, backAt + SETTLE_MS - now)),
  }
}
