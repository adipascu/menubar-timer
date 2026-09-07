import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { formatDuration, formatShare, overlapSeconds, periods, splitByCategory } from './focus-stats.js'

const work = { id: 'work', name: 'Work', color: 'blue' }
const admin = { id: 'admin', name: 'Life admin', color: 'gray' }

const segment = (category, start, end) => ({
  start: start.toISOString(),
  end: end.toISOString(),
  category,
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
    assert.deepEqual(rows.map(({ name, color }) => ({ name, color })), [
      { name: 'Freelance', color: 'red' },
      { name: 'Life admin', color: 'gray' },
    ])
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
