import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { companionSnapshot, SNAPSHOT_VERSION } from './companion-state.js'

const LENGTHS = [
  { minutes: 5, hint: 'drifting off constantly' },
  { minutes: 25, hint: 'a full pomodoro' },
]

const WORK = { id: 'work', name: 'Work', color: 'blue', share: 60 }
const ADMIN = { id: 'admin', name: 'Life admin', color: 'gray', share: 40 }

const inputs = (overrides = {}) => ({
  state: 'running',
  label: 'Write',
  labelPending: false,
  minutes: 25,
  remaining: 900,
  lengths: LENGTHS,
  categories: [WORK, ADMIN],
  active: WORK,
  goal: {
    startedAt: '2026-09-01T00:00:00.000Z',
    total: 7200,
    rows: [
      { id: 'admin', name: 'Life admin', color: 'gray', seconds: 1800, goal: 0.4, actual: 0.25, gap: 0.15 },
      { id: 'work', name: 'Work', color: 'blue', seconds: 5400, goal: 0.6, actual: 0.75, gap: -0.15 },
    ],
  },
  focus: [
    { label: 'Today', total: 3600 },
    { label: 'This week', total: 7200 },
    { label: 'This month', total: 10_800 },
    { label: 'All time', total: 14_400 },
  ],
  battery: { percent: 82, charging: false, onBattery: true, minutesRemaining: 300, watts: 12.4 },
  ...overrides,
})

describe('companionSnapshot', () => {
  it('stamps the payload version', () => {
    assert.equal(companionSnapshot(inputs()).version, SNAPSHOT_VERSION)
  })

  it('carries the timer as the Mac sees it', () => {
    const snapshot = companionSnapshot(inputs())
    assert.equal(snapshot.state, 'running')
    assert.equal(snapshot.label, 'Write')
    assert.equal(snapshot.labelPending, false)
    assert.equal(snapshot.minutes, 25)
    assert.equal(snapshot.remaining, 900)
    assert.deepEqual(snapshot.durations, [5, 25])
    assert.deepEqual(snapshot.hints, ['drifting off constantly', 'a full pomodoro'])
  })

  it('sends the active category and the full list with shares', () => {
    const snapshot = companionSnapshot(inputs())
    assert.deepEqual(snapshot.category, { id: 'work', name: 'Work', color: 'blue' })
    assert.deepEqual(snapshot.categories, [
      { id: 'work', name: 'Work', color: 'blue', share: 60 },
      { id: 'admin', name: 'Life admin', color: 'gray', share: 40 },
    ])
  })

  it('turns goal shares into whole points', () => {
    const { goal } = companionSnapshot(inputs())
    assert.equal(goal.since, '2026-09-01T00:00:00.000Z')
    assert.equal(goal.seconds, 7200)
    assert.deepEqual(goal.rows, [
      { id: 'admin', name: 'Life admin', color: 'gray', seconds: 1800, goal: 40, actual: 25 },
      { id: 'work', name: 'Work', color: 'blue', seconds: 5400, goal: 60, actual: 75 },
    ])
  })

  it('keys the focus windows by name rather than by label', () => {
    const { focus } = companionSnapshot(inputs())
    assert.deepEqual(focus, { today: 3600, week: 7200, month: 10_800, allTime: 14_400 })
  })

  it('keeps an unknown focus window under its own label', () => {
    const { focus } = companionSnapshot(inputs({ focus: [{ label: 'This year', total: 60 }] }))
    assert.deepEqual(focus, { 'This year': 60 })
  })

  it('reduces the battery to what a watch can show', () => {
    const { battery } = companionSnapshot(inputs())
    assert.deepEqual(battery, { percent: 82, charging: false, onBattery: true })
  })

  it('reports no battery until the first reading', () => {
    assert.equal(companionSnapshot(inputs({ battery: null })).battery, null)
  })

  it('reports no category when every share is zero', () => {
    const snapshot = companionSnapshot(
      inputs({ active: null, categories: [], goal: { startedAt: '', total: 0, rows: [] } }),
    )
    assert.equal(snapshot.category, null)
    assert.deepEqual(snapshot.categories, [])
    assert.deepEqual(snapshot.goal, { since: '', seconds: 0, rows: [] })
  })

  it('pauses tips only while the clock runs', () => {
    assert.equal(companionSnapshot(inputs()).tips, 'paused')
    assert.equal(companionSnapshot(inputs({ state: 'idle' })).tips, 'on')
    assert.equal(companionSnapshot(inputs({ state: 'expired' })).tips, 'on')
  })
})
