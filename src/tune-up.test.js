import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { daysBetween, tuneUpTiming } from './tune-up.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const TUNED_AT = Date.parse('2026-09-01T09:00:00.000Z')

const after = (days, hours = 0) => tuneUpTiming(TUNED_AT, TUNED_AT + days * DAY_MS + hours * HOUR_MS)

describe('the label', () => {
  it('counts the whole week down from a tune-up just done', () => {
    assert.equal(after(0).label, 'due in 7 days')
  })

  it('counts part of a day as the day it is in', () => {
    assert.equal(after(0, 1).label, 'due in 7 days')
    assert.equal(after(2, 5).label, 'due in 5 days')
  })

  it('counts the last day down like every other', () => {
    assert.equal(after(6).label, 'due in a day')
    assert.equal(after(6, 12).label, 'due in a day')
  })

  it('is due on the seventh day and stays so for that whole day', () => {
    assert.equal(after(7).label, 'due now')
    assert.equal(after(7, 23).label, 'due now')
  })

  it('counts the days past due once one has gone by', () => {
    assert.equal(after(8).label, 'a day late')
    assert.equal(after(10).label, '3 days late')
    assert.equal(after(28).label, '21 days late')
  })
})

describe('due', () => {
  it('is false right up to the deadline', () => {
    assert.equal(after(6, 23).due, false)
  })

  it('turns true on the deadline and stays true', () => {
    assert.equal(after(7).due, true)
    assert.equal(after(70).due, true)
  })
})

describe('daysElapsed', () => {
  it('fills a day at a time', () => {
    assert.deepEqual(
      [after(0), after(1), after(6, 23)].map(({ daysElapsed }) => daysElapsed),
      [0, 1, 6],
    )
  })

  it('stops at a full week however overdue the tune-up is', () => {
    assert.deepEqual(
      [after(7), after(9), after(400)].map(({ daysElapsed }) => daysElapsed),
      [7, 7, 7],
    )
  })

  it('never goes negative when the clock has moved backwards', () => {
    assert.equal(tuneUpTiming(TUNED_AT, TUNED_AT - 5 * DAY_MS).daysElapsed, 0)
  })
})

describe('daysBetween', () => {
  it('counts whole days only', () => {
    assert.equal(daysBetween(TUNED_AT, TUNED_AT), 0)
    assert.equal(daysBetween(TUNED_AT, TUNED_AT + DAY_MS - HOUR_MS), 0)
    assert.equal(daysBetween(TUNED_AT, TUNED_AT + 9 * DAY_MS + 3 * HOUR_MS), 9)
  })

  it('never goes negative when the clock has moved backwards', () => {
    assert.equal(daysBetween(TUNED_AT, TUNED_AT - 5 * DAY_MS), 0)
  })
})
