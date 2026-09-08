import { overlapSeconds } from './focus-stats.js'

const BEHIND_POINTS = 10
const ENOUGH_HOURS = 8
const CARD_GAP_MS = 60 * 60 * 1000

export const NUDGE_RULES = {
  behindPoints: BEHIND_POINTS,
  enoughHours: ENOUGH_HOURS,
  cardGapMinutes: CARD_GAP_MS / 60000,
}

export const tracked = (categories) => categories.filter(({ share }) => share > 0)

export const orderedByShare = (categories) => [...categories].sort((first, second) => second.share - first.share)

export const standings = (categories, segments, from, to) => {
  const wanted = tracked(categories)
  const goalTotal = wanted.reduce((sum, { share }) => sum + share, 0)
  const seconds = new Map(wanted.map(({ id }) => [id, 0]))
  for (const segment of segments) {
    if (!seconds.has(segment.category.id)) continue
    seconds.set(segment.category.id, seconds.get(segment.category.id) + overlapSeconds(segment, from, to))
  }
  const total = [...seconds.values()].reduce((sum, value) => sum + value, 0)
  return wanted
    .map(({ share, ...category }) => {
      const goal = goalTotal > 0 ? share / goalTotal : 0
      const actual = total > 0 ? seconds.get(category.id) / total : 0
      return { ...category, seconds: seconds.get(category.id), goal, actual, gap: goal - actual }
    })
    .sort((first, second) => second.gap - first.gap)
}

export const nudge = ({ rows, total, activeId, shownAt, now }) => {
  if (total < ENOUGH_HOURS * 3600) return null
  const behind = rows[0]
  if (!behind || behind.gap * 100 < BEHIND_POINTS) return null
  const active = rows.find(({ id }) => id === activeId)
  if (!active || active.gap >= 0) return null
  if (shownAt && now - shownAt < CARD_GAP_MS) return null
  return { behind, active }
}
