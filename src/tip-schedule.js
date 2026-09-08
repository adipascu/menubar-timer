const MIN_GAP_MS = 4 * 60 * 1000
const MAX_GAP_MS = 12 * 60 * 1000
const RETRY_GAP_MS = 60 * 1000
const TIMER_ENDED_GAP_MS = 5 * 1000

const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))

export const createTipSchedule = (onDue, gap = randomGap) => {
  let timer = null
  let dueAt = 0

  const dueIn = (delay) => {
    clearTimeout(timer)
    dueAt = Date.now() + delay
    timer = setTimeout(() => {
      timer = null
      onDue()
    }, delay)
  }

  const dueNoLaterThan = (delay) => {
    if (timer !== null && dueAt <= Date.now() + delay) return
    dueIn(delay)
  }

  return {
    next: () => dueIn(gap()),
    retry: () => dueIn(RETRY_GAP_MS),
    timerEnded: () => dueNoLaterThan(TIMER_ENDED_GAP_MS),
    tipsResumed: () => dueNoLaterThan(gap()),
    stop: () => {
      clearTimeout(timer)
      timer = null
    },
  }
}
