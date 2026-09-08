export const SNAPSHOT_VERSION = 2

const PERIOD_KEYS = { Today: 'today', 'This week': 'week', 'This month': 'month', 'All time': 'allTime' }

const points = (share) => Math.round(share * 100)

const wireCategory = ({ id, name, color }) => ({ id, name, color })

const wireGoal = ({ startedAt, rows, total }) => ({
  since: startedAt,
  seconds: total,
  rows: rows.map(({ id, name, color, seconds, goal, actual }) => ({
    ...wireCategory({ id, name, color }),
    seconds,
    goal: points(goal),
    actual: points(actual),
  })),
})

const wireFocus = (windows) =>
  Object.fromEntries(windows.map(({ label, total }) => [PERIOD_KEYS[label] ?? label, total]))

const wireBattery = (reading) =>
  reading ? { percent: reading.percent, charging: reading.charging, onBattery: reading.onBattery } : null

export const companionSnapshot = ({
  state,
  label,
  labelPending,
  minutes,
  remaining,
  lengths,
  categories,
  active,
  goal,
  focus,
  battery,
}) => ({
  version: SNAPSHOT_VERSION,
  state,
  label,
  labelPending,
  minutes,
  remaining,
  durations: lengths.map(({ minutes: length }) => length),
  hints: lengths.map(({ hint }) => hint),
  category: active ? wireCategory(active) : null,
  categories: categories.map((category) => ({ ...wireCategory(category), share: category.share })),
  goal: wireGoal(goal),
  focus: wireFocus(focus),
  battery: wireBattery(battery),
  tips: state === 'running' ? 'paused' : 'on',
})
