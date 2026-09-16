const DAY_MS = 24 * 60 * 60 * 1000

export const DAYS_IN_WEEK = 7

const WEEK_MS = DAYS_IN_WEEK * DAY_MS

const inDays = (count) => (count === 1 ? 'a day' : `${count} days`)

export const daysBetween = (from, to) => Math.max(0, Math.floor((to - from) / DAY_MS))

export const tuneUpTiming = (lastTunedAt, now) => {
  const elapsed = Math.max(0, now - lastTunedAt)
  const daysElapsed = Math.min(DAYS_IN_WEEK, Math.floor(elapsed / DAY_MS))

  if (elapsed < WEEK_MS) {
    return { daysElapsed, due: false, label: `due in ${inDays(Math.ceil((WEEK_MS - elapsed) / DAY_MS))}` }
  }

  const late = Math.floor((elapsed - WEEK_MS) / DAY_MS)
  return { daysElapsed, due: true, label: late === 0 ? 'due now' : `${inDays(late)} late` }
}
