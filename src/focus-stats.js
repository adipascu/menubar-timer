const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const startOfWeek = (date) => {
  const monday = startOfDay(date)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

export const periods = (now) => [
  { label: 'Today', from: startOfDay(now).getTime() },
  { label: 'This week', from: startOfWeek(now).getTime() },
  { label: 'This month', from: startOfMonth(now).getTime() },
  { label: 'All time', from: 0 },
]

export const overlapSeconds = (segment, from, to) => {
  const start = Math.max(Date.parse(segment.start), from)
  const end = Math.min(Date.parse(segment.end), to)
  return Math.max(0, (end - start) / 1000)
}

const MODES = ['timer', 'expired', 'freebasing']

const modeOf = (segment) => segment.mode ?? 'timer'

export const timed = (segments) => segments.filter((segment) => modeOf(segment) === 'timer')

export const splitByMode = (segments, from, to) => {
  const totals = Object.fromEntries(MODES.map((mode) => [mode, 0]))
  for (const segment of segments) totals[modeOf(segment)] += overlapSeconds(segment, from, to)
  return totals
}

export const expiries = (segments, from, to) => {
  let count = 0
  let seconds = 0
  let onTrack = 0
  let counting = false
  segments.forEach((segment, index) => {
    if (modeOf(segment) !== 'expired') return
    const startsRun = index === 0 || modeOf(segments[index - 1]) !== 'expired'
    if (startsRun) {
      const at = Date.parse(segment.start)
      counting = at >= from && at < to
      if (counting) count += 1
    }
    if (!counting) return
    seconds += (Date.parse(segment.end) - Date.parse(segment.start)) / 1000
    if (segment.ended === 'on-track') onTrack += 1
  })
  return { count, seconds, onTrack }
}

export const splitByCategory = (segments, from, to, known = []) => {
  const totals = new Map()
  for (const segment of timed(segments)) {
    const seconds = overlapSeconds(segment, from, to)
    if (seconds === 0) continue
    const { id, name, color } = segment.category
    const current = known.find((category) => category.id === id)
    const sofar = totals.get(id)?.seconds ?? 0
    totals.set(id, { id, name: current?.name ?? name, color: current?.color ?? color, seconds: sofar + seconds })
  }
  const rows = [...totals.values()].sort((a, b) => b.seconds - a.seconds)
  const total = rows.reduce((sum, row) => sum + row.seconds, 0)
  return { total, rows: rows.map((row) => ({ ...row, share: row.seconds / total })) }
}

export const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export const formatWait = (seconds) => (seconds < 60 ? `${Math.round(seconds)}s` : formatDuration(seconds))

export const formatShare = (share) => `${Math.round(share * 100)}%`
