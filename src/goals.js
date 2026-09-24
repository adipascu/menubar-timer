import { formatDuration, overlapSeconds, timed } from './focus-stats.js'

const WINDOW_DAYS = 14
const BAND_POINTS = 5
const ENOUGH_HOURS = 5
const CARD_GAP_MS = 60 * 60 * 1000
const WINDOW_MS = WINDOW_DAYS * 24 * 3600 * 1000

export const GOAL_RULES = {
  windowDays: WINDOW_DAYS,
  bandPoints: BAND_POINTS,
  enoughHours: ENOUGH_HOURS,
  cardGapMinutes: CARD_GAP_MS / 60000,
}

const statusOf = (gap) => {
  if (gap * 100 > BAND_POINTS) return 'behind'
  if (gap * 100 < -BAND_POINTS) return 'ahead'
  return 'on track'
}

export const tracked = (categories) => categories.filter(({ share }) => share > 0)

export const orderedByShare = (categories) => [...categories].sort((first, second) => second.share - first.share)

export const standings = (categories, segments, from, to) => {
  const wanted = tracked(categories)
  const goalTotal = wanted.reduce((sum, { share }) => sum + share, 0)
  const seconds = new Map(wanted.map(({ id }) => [id, 0]))
  for (const segment of timed(segments)) {
    if (!seconds.has(segment.category.id)) continue
    seconds.set(segment.category.id, seconds.get(segment.category.id) + overlapSeconds(segment, from, to))
  }
  const total = [...seconds.values()].reduce((sum, value) => sum + value, 0)
  return wanted
    .map(({ share, ...category }) => {
      const goal = share / goalTotal
      const actual = total > 0 ? seconds.get(category.id) / total : 0
      const gap = goal - actual
      return {
        ...category,
        seconds: seconds.get(category.id),
        goal,
        actual,
        gap,
        behind: goal * total - seconds.get(category.id),
        status: statusOf(gap),
      }
    })
    .sort((first, second) => second.gap - first.gap)
}

const standingOver = (categories, segments, from, to) => {
  const rows = standings(categories, segments, from, to)
  const total = rows.reduce((sum, row) => sum + row.seconds, 0)
  return { from, to, rows, total, enough: total >= ENOUGH_HOURS * 3600 }
}

export const recentStanding = (categories, segments, now) => standingOver(categories, segments, now - WINDOW_MS, now)

export const periodReviews = (periods, segments, now) =>
  periods
    .map((period, index) =>
      standingOver(
        period.shares,
        segments,
        Date.parse(period.startedAt),
        index + 1 < periods.length ? Date.parse(periods[index + 1].startedAt) : now,
      ),
    )
    .filter(({ total }) => total >= 60)
    .reverse()

const RANK = { behind: 0, 'on track': 1, ahead: 2 }

export const pickOrder = ({ rows, enough }, categories) => {
  if (!enough) return orderedByShare(categories)
  const rowOf = new Map(rows.map((row) => [row.id, row]))
  return [...categories].sort((first, second) => {
    const a = rowOf.get(first.id)
    const b = rowOf.get(second.id)
    const byStatus = RANK[a.status] - RANK[b.status]
    if (byStatus !== 0) return byStatus
    return a.status === 'on track' ? second.share - first.share : b.behind - a.behind
  })
}

export const standingText = ({ status, behind }) => {
  if (status === 'behind') return `${formatDuration(behind)} behind`
  if (status === 'ahead') return `${formatDuration(-behind)} ahead`
  return 'on track'
}

export const nudge = ({ standing, activeId, shownAt, now }) => {
  if (!standing.enough) return null
  const behind = standing.rows[0]
  if (!behind || behind.status !== 'behind') return null
  const active = standing.rows.find(({ id }) => id === activeId)
  if (!active || active.status !== 'ahead') return null
  if (shownAt && now - shownAt < CARD_GAP_MS) return null
  return { behind, active }
}
