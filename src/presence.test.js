import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { createPresence, IDLE_AFTER_SECONDS, SETTLE_MS } from './presence.js'

const T = Date.parse('2026-09-26T09:00:00.000Z')

const watched = () => {
  const events = []
  const presence = createPresence({
    onAway: (reason, at) => events.push(['away', reason, at]),
    onBack: (awayMs) => events.push(['back', awayMs]),
  })
  return { presence, events }
}

describe('idle', () => {
  it('stays present while the input is recent enough', () => {
    const { presence, events } = watched()
    presence.sample(IDLE_AFTER_SECONDS - 1, T)
    assert.equal(presence.isAway(), false)
    assert.equal(presence.isSettled(T), true)
    assert.deepEqual(events, [])
  })

  it('goes away from the moment the input stopped, not the moment it was noticed', () => {
    const { presence, events } = watched()
    presence.sample(IDLE_AFTER_SECONDS, T)
    presence.sample(IDLE_AFTER_SECONDS + 15, T + 15_000)
    assert.equal(presence.isAway(), true)
    assert.deepEqual(events, [['away', 'idle', T - IDLE_AFTER_SECONDS * 1000]])
  })

  it('comes back on the first input and says how long it was away', () => {
    const { presence, events } = watched()
    presence.sample(IDLE_AFTER_SECONDS, T)
    presence.sample(0, T + 60_000)
    assert.equal(presence.isAway(), false)
    assert.deepEqual(events[1], ['back', IDLE_AFTER_SECONDS * 1000 + 60_000])
  })
})

describe('settling', () => {
  it('holds cards for a while after coming back', () => {
    const { presence } = watched()
    presence.locked(T)
    assert.equal(presence.isSettled(T), false)
    presence.unlocked(T + 600_000)
    assert.equal(presence.isSettled(T + 600_000 + SETTLE_MS - 1), false)
    assert.equal(presence.isSettled(T + 600_000 + SETTLE_MS), true)
  })

  it('says how long is left until it settles', () => {
    const { presence } = watched()
    assert.equal(presence.settlesIn(T), 0)
    presence.asleep(T)
    presence.awake(T + 1000)
    assert.equal(presence.settlesIn(T + 1000 + 20_000), SETTLE_MS - 20_000)
    assert.equal(presence.settlesIn(T + 1000 + SETTLE_MS + 5), 0)
  })
})

describe('overlapping reasons', () => {
  it('is away until every reason has cleared, and reports one stretch', () => {
    const { presence, events } = watched()
    presence.sample(IDLE_AFTER_SECONDS, T)
    presence.locked(T + 10_000)
    presence.locked(T + 11_000)
    presence.asleep(T + 20_000)
    presence.awake(T + 90_000)
    assert.equal(presence.isAway(), true)
    presence.unlocked(T + 95_000)
    assert.equal(presence.isAway(), true)
    presence.sample(1, T + 96_000)
    assert.equal(presence.isAway(), false)
    assert.deepEqual(events, [
      ['away', 'idle', T - IDLE_AFTER_SECONDS * 1000],
      ['back', IDLE_AFTER_SECONDS * 1000 + 96_000],
    ])
  })

  it('ignores a return from somewhere it never went', () => {
    const { presence, events } = watched()
    presence.awake(T)
    presence.sample(0, T)
    assert.deepEqual(events, [])
  })
})
