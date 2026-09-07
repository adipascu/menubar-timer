import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { nudge, standings, tracked } from './goals.js'

const category = (id, share) => ({ id, name: id, color: 'blue', share })

const hours = (id, count, at = 0) => ({
  start: new Date(at * 3600_000).toISOString(),
  end: new Date((at + count) * 3600_000).toISOString(),
  category: { id, name: id, color: 'blue' },
})

const window = { from: 0, to: 1000 * 3600_000 }

const standingsOf = (categories, segments) => standings(categories, segments, window.from, window.to)

describe('tracked', () => {
  it('drops a category with no share', () => {
    assert.deepEqual(tracked([category('a', 40), category('b', 0)]).map(({ id }) => id), ['a'])
  })
})

describe('standings', () => {
  const categories = [category('freelance', 20), category('ump', 20), category('latin', 40), category('zero', 0)]

  it('normalizes goals over the tracked categories', () => {
    const rows = standingsOf(categories, [])
    assert.deepEqual(rows.map(({ id, goal }) => [id, goal]), [
      ['latin', 0.5],
      ['freelance', 0.25],
      ['ump', 0.25],
    ])
  })

  it('sorts the most behind first', () => {
    const rows = standingsOf(categories, [hours('freelance', 8), hours('ump', 2, 8)])
    assert.deepEqual(rows.map(({ id }) => id), ['latin', 'ump', 'freelance'])
    assert.equal(rows[0].gap, 0.5)
    assert.equal(rows.at(-1).gap, 0.25 - 0.8)
  })

  it('ignores time in an untracked category', () => {
    const rows = standingsOf(categories, [hours('freelance', 1), hours('zero', 9, 1)])
    assert.equal(rows.find(({ id }) => id === 'freelance').actual, 1)
    assert.equal(rows.reduce((sum, { seconds }) => sum + seconds, 0), 3600)
  })

  it('reports every actual as zero before anything is logged', () => {
    assert.deepEqual(standingsOf(categories, []).map(({ actual }) => actual), [0, 0, 0])
  })
})

describe('nudge', () => {
  const rows = [
    { id: 'latin', name: 'latindance.be', gap: 0.3 },
    { id: 'ump', name: 'UMP', gap: -0.1 },
    { id: 'freelance', name: 'Freelance', gap: -0.2 },
  ]
  const enough = 9 * 3600
  const now = Date.parse('2026-09-08T12:00:00Z')

  it('stays quiet until enough hours are logged', () => {
    assert.equal(nudge({ rows, total: 7 * 3600, activeId: 'freelance', shownAt: null, now }), null)
  })

  it('stays quiet when nothing is far enough behind', () => {
    const close = [{ id: 'latin', gap: 0.05 }, { id: 'ump', gap: -0.05 }]
    assert.equal(nudge({ rows: close, total: enough, activeId: 'ump', shownAt: null, now }), null)
  })

  it('stays quiet while working on a category that is itself behind', () => {
    assert.equal(nudge({ rows, total: enough, activeId: 'latin', shownAt: null, now }), null)
  })

  it('names the most behind category when working on one that is ahead', () => {
    const suggestion = nudge({ rows, total: enough, activeId: 'freelance', shownAt: null, now })
    assert.equal(suggestion.behind.id, 'latin')
    assert.equal(suggestion.active.id, 'freelance')
  })

  it('holds off for an hour after the last card', () => {
    assert.equal(nudge({ rows, total: enough, activeId: 'freelance', shownAt: now - 59 * 60_000, now }), null)
    assert.ok(nudge({ rows, total: enough, activeId: 'freelance', shownAt: now - 61 * 60_000, now }))
  })
})
