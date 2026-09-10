import { strict as assert } from 'node:assert'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { createTipSchedule } from './tip-schedule.js'

const SECOND = 1000
const MINUTE = 60 * SECOND
const GAP_MS = 8 * MINUTE
const gap = () => GAP_MS

beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 }))
afterEach(() => mock.timers.reset())

const dueTimes = () => {
  const times = []
  const schedule = createTipSchedule(() => times.push(Date.now()), gap)
  return { schedule, times }
}

describe('next', () => {
  it('puts the first tip a gap away', () => {
    const { schedule, times } = dueTimes()
    schedule.next()
    mock.timers.tick(GAP_MS)
    assert.deepEqual(times, [GAP_MS])
  })
})

describe('tipsResumed', () => {
  it('leaves a tip that is already pending where it is', () => {
    const { schedule, times } = dueTimes()
    schedule.next()
    mock.timers.tick(7 * MINUTE)
    schedule.tipsResumed()
    mock.timers.tick(MINUTE)
    assert.deepEqual(times, [GAP_MS])
  })

  it('arms a tip when none is pending', () => {
    const { schedule, times } = dueTimes()
    schedule.tipsResumed()
    mock.timers.tick(GAP_MS)
    assert.deepEqual(times, [GAP_MS])
  })

  it('keeps the retry a running timer left, so a timer stopped early gets a tip within a minute', () => {
    const times = []
    let running = true
    const schedule = createTipSchedule(() => {
      if (running) schedule.retry()
      else times.push(Date.now())
    }, gap)
    schedule.next()
    mock.timers.tick(10 * MINUTE)
    running = false
    schedule.tipsResumed()
    mock.timers.tick(MINUTE)
    assert.deepEqual(times, [11 * MINUTE])
  })
})

describe('timerEnded', () => {
  it('brings a distant tip forward to seconds after the timer runs to zero', () => {
    const { schedule, times } = dueTimes()
    schedule.next()
    mock.timers.tick(MINUTE)
    schedule.timerEnded()
    mock.timers.tick(5 * SECOND)
    assert.deepEqual(times, [MINUTE + 5 * SECOND])
  })
})

describe('stop', () => {
  it('drops the pending tip', () => {
    const { schedule, times } = dueTimes()
    schedule.next()
    schedule.stop()
    mock.timers.tick(GAP_MS)
    assert.deepEqual(times, [])
  })
})

describe('a run of timer sessions with short breaks', () => {
  const runSessions = ({ sessionMinutes, breakSeconds, rounds }) => {
    const shown = []
    let state = 'idle'

    const schedule = createTipSchedule(() => {
      if (state === 'running') {
        schedule.retry()
        return
      }
      shown.push(state)
      schedule.next()
    }, gap)

    const setState = (next) => {
      state = next
      if (next === 'running') return
      if (next === 'expired') schedule.timerEnded()
      else schedule.tipsResumed()
    }

    schedule.next()
    for (let round = 0; round < rounds; round += 1) {
      setState('running')
      mock.timers.tick(sessionMinutes * MINUTE)
      setState('expired')
      mock.timers.tick(breakSeconds * SECOND)
    }
    return shown
  }

  it('shows a tip in every break, however short', () => {
    assert.deepEqual(runSessions({ sessionMinutes: 15, breakSeconds: 50, rounds: 5 }), [
      'expired',
      'expired',
      'expired',
      'expired',
      'expired',
    ])
  })

  it('shows a tip in a break shorter than the retry gap', () => {
    assert.deepEqual(runSessions({ sessionMinutes: 10, breakSeconds: 20, rounds: 3 }), [
      'expired',
      'expired',
      'expired',
    ])
  })
})
