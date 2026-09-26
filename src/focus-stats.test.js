import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import {
  expiries,
  formatDuration,
  formatWait,
  formatShare,
  overlapSeconds,
  periods,
  splitByCategory,
  splitByMode,
  timed,
} from './focus-stats.js'

const work = { id: 'work', name: 'Work', color: 'blue' }
const admin = { id: 'admin', name: 'Life admin', color: 'gray' }

const segment = (category, start, end, mode) => ({
  start: start.toISOString(),
  end: end.toISOString(),
  category,
  ...(mode ? { mode } : {}),
})

const local = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute)

describe('periods', () => {
  it('starts the week on Monday', () => {
    const wednesday = local(2026, 9, 9, 14, 30)
    const [today, week, month] = periods(wednesday)
    assert.equal(today.from, local(2026, 9, 9).getTime())
    assert.equal(week.from, local(2026, 9, 7).getTime())
    assert.equal(month.from, local(2026, 9, 1).getTime())
  })

  it('keeps a Sunday in the week that began the previous Monday', () => {
    const [, week] = periods(local(2026, 9, 13, 23, 59))
    assert.equal(week.from, local(2026, 9, 7).getTime())
  })

  it('opens a new week on Monday morning', () => {
    const [, week] = periods(local(2026, 9, 14, 0, 1))
    assert.equal(week.from, local(2026, 9, 14).getTime())
  })
})

describe('overlapSeconds', () => {
  it('counts only the part of a segment inside the window', () => {
    const midnight = local(2026, 9, 9)
    const crossing = segment(work, local(2026, 9, 8, 23, 30), local(2026, 9, 9, 0, 20))
    assert.equal(overlapSeconds(crossing, midnight.getTime(), local(2026, 9, 9, 12).getTime()), 20 * 60)
  })

  it('ignores a segment outside the window', () => {
    const yesterday = segment(work, local(2026, 9, 8, 9), local(2026, 9, 8, 10))
    assert.equal(overlapSeconds(yesterday, local(2026, 9, 9).getTime(), local(2026, 9, 9, 12).getTime()), 0)
  })
})

describe('splitByCategory', () => {
  const day = local(2026, 9, 9)
  const noon = local(2026, 9, 9, 12)
  const segments = [
    segment(work, local(2026, 9, 9, 9), local(2026, 9, 9, 9, 25)),
    segment(admin, local(2026, 9, 9, 10), local(2026, 9, 9, 10, 10)),
    segment(work, local(2026, 9, 9, 11), local(2026, 9, 9, 11, 5)),
  ]

  it('sums each category and sorts the biggest first', () => {
    const { total, rows } = splitByCategory(segments, day.getTime(), noon.getTime())
    assert.equal(total, 40 * 60)
    assert.deepEqual(
      rows.map(({ id, seconds, share }) => ({ id, seconds, share })),
      [
        { id: 'work', seconds: 30 * 60, share: 0.75 },
        { id: 'admin', seconds: 10 * 60, share: 0.25 },
      ],
    )
  })

  it('shows a renamed category under its current name and color', () => {
    const renamed = [{ id: 'work', name: 'Freelance', color: 'red' }]
    const { rows } = splitByCategory(segments, day.getTime(), noon.getTime(), renamed)
    assert.deepEqual(
      rows.map(({ name, color }) => ({ name, color })),
      [
        { name: 'Freelance', color: 'red' },
        { name: 'Life admin', color: 'gray' },
      ],
    )
  })

  it('returns nothing for an empty window', () => {
    assert.deepEqual(splitByCategory(segments, noon.getTime(), noon.getTime() + 1000), { total: 0, rows: [] })
  })
})

describe('formatting', () => {
  it('rounds durations down to whole minutes', () => {
    assert.equal(formatDuration(0), '0m')
    assert.equal(formatDuration(59), '0m')
    assert.equal(formatDuration(60), '1m')
    assert.equal(formatDuration(3600), '1h 0m')
    assert.equal(formatDuration(5400 + 30), '1h 30m')
  })

  it('rounds shares to whole percents', () => {
    assert.equal(formatShare(2 / 3), '67%')
    assert.equal(formatShare(1), '100%')
  })
})

describe('timed', () => {
  it('keeps timer segments and the ones logged before modes existed', () => {
    const noon = local(2026, 9, 24, 12)
    const later = local(2026, 9, 24, 13)
    const kept = timed([
      segment(work, noon, later),
      segment(work, noon, later, 'timer'),
      segment(work, noon, later, 'expired'),
      segment(admin, noon, later, 'freebasing'),
    ])
    assert.deepEqual(
      kept.map(({ mode }) => mode ?? 'before modes'),
      ['before modes', 'timer'],
    )
  })
})

describe('splitByMode', () => {
  it('adds up the time spent in each mode inside the window', () => {
    const day = local(2026, 9, 24)
    const segments = [
      segment(work, local(2026, 9, 24, 9), local(2026, 9, 24, 9, 25), 'timer'),
      segment(work, local(2026, 9, 24, 9, 25), local(2026, 9, 24, 9, 40), 'expired'),
      segment(work, local(2026, 9, 24, 9, 40), local(2026, 9, 24, 11), 'freebasing'),
      segment(admin, local(2026, 9, 23, 23), local(2026, 9, 24, 0, 30), 'freebasing'),
    ]
    assert.deepEqual(splitByMode(segments, day.getTime(), local(2026, 9, 25).getTime()), {
      timer: 25 * 60,
      expired: 15 * 60,
      freebasing: 110 * 60,
    })
  })
})

describe('splitByCategory across modes', () => {
  it('counts only timed work toward a category', () => {
    const { total, rows } = splitByCategory(
      [
        segment(work, local(2026, 9, 24, 9), local(2026, 9, 24, 10), 'timer'),
        segment(work, local(2026, 9, 24, 10), local(2026, 9, 24, 11), 'expired'),
        segment(admin, local(2026, 9, 24, 11), local(2026, 9, 24, 12), 'freebasing'),
      ],
      0,
      local(2026, 9, 25).getTime(),
    )
    assert.equal(total, 3600)
    assert.deepEqual(
      rows.map(({ id }) => id),
      ['work'],
    )
  })
})

describe('expiries', () => {
  const at = (hour, minute = 0) => local(2026, 9, 24, hour, minute)
  const day = local(2026, 9, 24).getTime()
  const next = local(2026, 9, 25).getTime()

  it('counts each run of time after a timer ran out once, however often it was split', () => {
    const segments = [
      segment(work, at(9), at(9, 25), 'timer'),
      segment(work, at(9, 25), at(9, 28), 'expired'),
      segment(admin, at(9, 28), at(9, 31), 'expired'),
      segment(admin, at(9, 31), at(10), 'freebasing'),
      segment(admin, at(10), at(10, 25), 'timer'),
      segment(admin, at(10, 25), at(10, 26), 'expired'),
    ]
    assert.deepEqual(expiries(segments, day, next), { count: 2, seconds: 7 * 60, onTrack: 0 })
  })

  it('files a run under the window it began in and ignores timers logged before modes existed', () => {
    const segments = [
      { ...segment(work, at(7), at(7, 25)), ended: 'completed' },
      segment(work, local(2026, 9, 23, 23, 50), at(0, 40), 'expired'),
      segment(work, at(0, 40), at(1), 'freebasing'),
    ]
    assert.deepEqual(expiries(segments, day, next), { count: 0, seconds: 0, onTrack: 0 })
  })

  it('leaves a run that began after the window out entirely', () => {
    const segments = [
      segment(work, at(22), at(22, 10), 'expired'),
      segment(work, at(22, 10), at(22, 30), 'timer'),
      segment(work, local(2026, 9, 25, 0, 5), local(2026, 9, 25, 0, 10), 'expired'),
      segment(admin, local(2026, 9, 25, 0, 10), local(2026, 9, 25, 0, 40), 'expired'),
    ]
    assert.deepEqual(expiries(segments, day, next), { count: 1, seconds: 10 * 60, onTrack: 0 })
  })

  it('counts the runs you ended with I am on track', () => {
    const segments = [
      { ...segment(work, local(2026, 9, 23, 23, 58), at(0, 1), 'expired'), ended: 'on-track' },
      segment(work, at(0, 1), at(0, 26), 'timer'),
      { ...segment(work, at(9, 25), at(9, 26), 'expired'), ended: 'on-track' },
      segment(work, at(9, 26), at(9, 51), 'timer'),
      { ...segment(work, at(9, 51), at(9, 53), 'expired'), ended: 'switched' },
      { ...segment(admin, at(9, 53), at(9, 54), 'expired'), ended: 'on-track' },
      segment(admin, at(9, 54), at(10, 19), 'timer'),
      { ...segment(admin, at(10, 19), at(10, 30), 'expired'), ended: 'started' },
    ]
    assert.deepEqual(expiries(segments, day, next), { count: 3, seconds: 15 * 60, onTrack: 2 })
  })

  it('keeps adding to a run that began before the window without counting it', () => {
    const segments = [
      segment(work, local(2026, 9, 23, 23, 50), at(0, 10), 'expired'),
      segment(admin, at(0, 10), at(0, 20), 'expired'),
    ]
    assert.deepEqual(expiries(segments, day, next), { count: 0, seconds: 0, onTrack: 0 })
  })
})

describe('formatWait', () => {
  it('shows seconds under a minute so a quick restart does not read as zero', () => {
    assert.equal(formatWait(42.4), '42s')
    assert.equal(formatWait(125), '2m')
  })
})
