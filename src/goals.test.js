import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import {
  GOAL_RULES,
  nudge,
  orderedByShare,
  periodReviews,
  pickOrder,
  recentStanding,
  standingText,
  standings,
  tracked,
} from './goals.js'

const category = (id, share) => ({ id, name: id, color: 'blue', share })

const hours = (id, count, at = 0) => ({
  start: new Date(at * 3600_000).toISOString(),
  end: new Date((at + count) * 3600_000).toISOString(),
  category: { id, name: id, color: 'blue' },
})

const window = { from: 0, to: 1000 * 3600_000 }

const standingsOf = (categories, segments) => standings(categories, segments, window.from, window.to)

describe('standings across modes', () => {
  it('leaves time after the timer ran out and freebasing out of the goals', () => {
    const rows = standingsOf(
      [category('a', 50), category('b', 50)],
      [hours('a', 2), { ...hours('b', 3, 2), mode: 'expired' }, { ...hours('b', 4, 5), mode: 'freebasing' }],
    )
    assert.deepEqual(
      rows.map(({ id, seconds }) => [id, seconds]),
      [
        ['b', 0],
        ['a', 7200],
      ],
    )
  })
})

describe('tracked', () => {
  it('drops a category with no share', () => {
    assert.deepEqual(
      tracked([category('a', 40), category('b', 0)]).map(({ id }) => id),
      ['a'],
    )
  })
})

describe('orderedByShare', () => {
  it('puts the biggest share first and a retired category last', () => {
    const listed = [category('ump', 20), category('archived', 0), category('latin', 40), category('belgabot', 10)]
    assert.deepEqual(
      orderedByShare(listed).map(({ id }) => id),
      ['latin', 'ump', 'belgabot', 'archived'],
    )
  })

  it('keeps equal shares in the order they were given', () => {
    const listed = [category('ump', 20), category('freelance', 20), category('latin', 40)]
    assert.deepEqual(
      orderedByShare(listed).map(({ id }) => id),
      ['latin', 'ump', 'freelance'],
    )
  })

  it('leaves the original list untouched', () => {
    const listed = [category('ump', 20), category('latin', 40)]
    orderedByShare(listed)
    assert.deepEqual(
      listed.map(({ id }) => id),
      ['ump', 'latin'],
    )
  })
})

describe('standings', () => {
  const categories = [category('freelance', 20), category('ump', 20), category('latin', 40), category('zero', 0)]

  it('normalizes goals over the tracked categories', () => {
    const rows = standingsOf(categories, [])
    assert.deepEqual(
      rows.map(({ id, goal }) => [id, goal]),
      [
        ['latin', 0.5],
        ['freelance', 0.25],
        ['ump', 0.25],
      ],
    )
  })

  it('sorts the most behind first', () => {
    const rows = standingsOf(categories, [hours('freelance', 8), hours('ump', 2, 8)])
    assert.deepEqual(
      rows.map(({ id }) => id),
      ['latin', 'ump', 'freelance'],
    )
    assert.equal(rows[0].gap, 0.5)
    assert.equal(rows.at(-1).gap, 0.25 - 0.8)
  })

  it('ignores time in an untracked category', () => {
    const rows = standingsOf(categories, [hours('freelance', 1), hours('zero', 9, 1)])
    assert.equal(rows.find(({ id }) => id === 'freelance').actual, 1)
    assert.equal(
      rows.reduce((sum, { seconds }) => sum + seconds, 0),
      3600,
    )
  })

  it('reports every actual as zero before anything is logged', () => {
    assert.deepEqual(
      standingsOf(categories, []).map(({ actual }) => actual),
      [0, 0, 0],
    )
  })

  it('stands nobody up when every category has been retired, so there is no share to divide by', () => {
    assert.deepEqual(standingsOf([category('a', 0), category('b', 0)], [hours('a', 2)]), [])
  })
})

describe('nudge', () => {
  const row = (id, status) => ({ id, name: id, status })
  const standing = (rows, enough = true) => ({ rows, enough })
  const rows = [row('latin', 'behind'), row('ump', 'on track'), row('freelance', 'ahead')]
  const now = Date.parse('2026-09-08T12:00:00Z')

  it('stays quiet until enough hours are logged in the window', () => {
    assert.equal(nudge({ standing: standing(rows, false), activeId: 'freelance', shownAt: null, now }), null)
  })

  it('stays quiet when nothing is outside its band on the short side', () => {
    const close = [row('latin', 'on track'), row('freelance', 'ahead')]
    assert.equal(nudge({ standing: standing(close), activeId: 'freelance', shownAt: null, now }), null)
  })

  it('stays quiet while working on a category that is not ahead of its band', () => {
    assert.equal(nudge({ standing: standing(rows), activeId: 'ump', shownAt: null, now }), null)
    assert.equal(nudge({ standing: standing(rows), activeId: 'latin', shownAt: null, now }), null)
  })

  it('names the most behind category when working on one that is ahead', () => {
    const suggestion = nudge({ standing: standing(rows), activeId: 'freelance', shownAt: null, now })
    assert.equal(suggestion.behind.id, 'latin')
    assert.equal(suggestion.active.id, 'freelance')
  })

  it('holds off for an hour after the last card', () => {
    assert.equal(nudge({ standing: standing(rows), activeId: 'freelance', shownAt: now - 59 * 60_000, now }), null)
    assert.ok(nudge({ standing: standing(rows), activeId: 'freelance', shownAt: now - 61 * 60_000, now }))
  })
})

describe('standings in hours and bands', () => {
  it('says how many hours each category is behind or ahead of its share of the time', () => {
    const rows = standingsOf(
      [category('latin', 50), category('process', 50)],
      [hours('process', 8), hours('latin', 2, 8)],
    )
    const latin = rows.find(({ id }) => id === 'latin')
    assert.equal(latin.behind, 3 * 3600)
    assert.equal(rows.find(({ id }) => id === 'process').behind, -3 * 3600)
  })

  it('calls a category on track inside the band and behind or ahead outside it', () => {
    const rows = standingsOf(
      [category('a', 40), category('b', 30), category('c', 30)],
      [hours('a', 36), hours('b', 34, 36), hours('c', 30, 70)],
    )
    const statusOf = (id) => rows.find((row) => row.id === id).status
    assert.equal(statusOf('a'), 'on track')
    assert.equal(statusOf('b'), 'on track')
    const wide = standingsOf([category('a', 50), category('b', 50)], [hours('a', 3), hours('b', 7, 3)])
    assert.deepEqual(
      wide.map(({ id, status }) => [id, status]),
      [
        ['a', 'behind'],
        ['b', 'ahead'],
      ],
    )
  })
})

describe('recentStanding', () => {
  const day = 24 * 3600_000
  const now = 20 * day

  it(`counts only the last ${GOAL_RULES.windowDays} days, however long ago the shares changed`, () => {
    const segments = [
      hours('a', 10, 0),
      hours('b', 3, (now - 10 * day) / 3600_000),
      hours('a', 3, (now - day) / 3600_000),
    ]
    const { total, rows, from } = recentStanding([category('a', 50), category('b', 50)], segments, now)
    assert.equal(from, now - 14 * day)
    assert.equal(total, 6 * 3600)
    assert.deepEqual(
      rows.map(({ id, seconds }) => [id, seconds]),
      [
        ['a', 3 * 3600],
        ['b', 3 * 3600],
      ],
    )
  })

  it(`judges nothing before ${GOAL_RULES.enoughHours} hours are in the window`, () => {
    const under = recentStanding([category('a', 100)], [hours('a', 4.9, (now - day) / 3600_000)], now)
    const over = recentStanding([category('a', 100)], [hours('a', 5, (now - day) / 3600_000)], now)
    assert.equal(under.enough, false)
    assert.equal(over.enough, true)
  })
})

describe('pickOrder', () => {
  const row = (id, status, behind) => ({ id, status, behind })
  const listed = [
    category('process', 10),
    category('vacation', 20),
    category('latin', 40),
    category('belgabot', 15),
    category('hourly', 15),
  ]

  it('lists what needs catching up first by hours, then what is on track by share, then what is ahead', () => {
    const standing = {
      enough: true,
      rows: [
        row('latin', 'behind', 3 * 3600),
        row('hourly', 'behind', 5 * 3600),
        row('belgabot', 'on track', 600),
        row('vacation', 'on track', -600),
        row('process', 'ahead', -2 * 3600),
      ],
    }
    assert.deepEqual(
      pickOrder(standing, listed).map(({ id }) => id),
      ['hourly', 'latin', 'vacation', 'belgabot', 'process'],
    )
  })

  it('keeps a stable share order until there is enough to judge', () => {
    assert.deepEqual(
      pickOrder({ enough: false, rows: [] }, listed).map(({ id }) => id),
      ['latin', 'vacation', 'belgabot', 'hourly', 'process'],
    )
  })

  it('puts the one least ahead first among the ones ahead', () => {
    const standing = { enough: true, rows: [row('a', 'ahead', -3600), row('b', 'ahead', -600)] }
    assert.deepEqual(
      pickOrder(standing, [category('a', 50), category('b', 50)]).map(({ id }) => id),
      ['b', 'a'],
    )
  })
})

describe('standingText', () => {
  it('says hours behind, hours ahead or on track', () => {
    assert.equal(standingText({ status: 'behind', behind: 3 * 3600 + 600 }), '3h 10m behind')
    assert.equal(standingText({ status: 'ahead', behind: -45 * 60 }), '45m ahead')
    assert.equal(standingText({ status: 'on track', behind: 300 }), 'on track')
  })
})

describe('periodReviews', () => {
  const period = (startedAt, shares) => ({
    startedAt: new Date(startedAt * 3600_000).toISOString(),
    shares: Object.entries(shares).map(([id, share]) => ({ id, name: id, share })),
  })

  it('judges each goal period against the shares it was set with, newest first', () => {
    const periods = [
      period(0, { latin: 40, process: 60 }),
      period(10, { latin: 80, process: 20 }),
      period(30, { latin: 100 }),
    ]
    const segments = [hours('process', 6, 0), hours('latin', 4, 6), hours('latin', 4, 10), hours('process', 1, 14)]
    const reviews = periodReviews(periods, segments, 40 * 3600_000)
    assert.equal(reviews.length, 2)
    assert.equal(reviews[0].from, 10 * 3600_000)
    assert.equal(reviews[0].to, 30 * 3600_000)
    assert.deepEqual(
      reviews[0].rows.map(({ id, goal, actual }) => [id, goal, actual]),
      [
        ['latin', 0.8, 0.8],
        ['process', 0.2, 0.2],
      ],
    )
    assert.equal(reviews[1].rows.find(({ id }) => id === 'latin').actual, 0.4)
  })
})
