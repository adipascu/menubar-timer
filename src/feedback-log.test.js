import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import {
  newEntry,
  retiredTitles,
  withClosing,
  withFeedback,
  withFeedbackLog,
  withFeedbackLogs,
  withShowing,
} from './feedback-log.js'

const SHOWN = '2026-09-24T09:00:00.000Z'
const LATER = '2026-09-24T09:00:40.000Z'

describe('withFeedbackLog', () => {
  it('folds the old status, counts and notes into one feedback log in time order', () => {
    const legacy = {
      topic: 'psychiatry',
      shown: 3,
      lastShownAt: '2026-09-10T02:27:51.747Z',
      status: 'known',
      markedAt: '2026-09-11T08:00:00.000Z',
      interested: 1,
      interestedAt: '2026-09-08T18:38:41.724Z',
      useful: 2,
      usefulAt: '2026-09-09T10:00:00.000Z',
      notes: [{ text: 'More on SaaS', at: '2026-09-10T02:28:35.716Z' }],
    }
    assert.deepEqual(withFeedbackLog(legacy), {
      topic: 'psychiatry',
      shown: 3,
      lastShownAt: '2026-09-10T02:27:51.747Z',
      showings: [],
      feedback: [
        { action: 'interested', at: '2026-09-08T18:38:41.724Z' },
        { action: 'useful', at: '2026-09-09T10:00:00.000Z' },
        { action: 'useful', at: '2026-09-09T10:00:00.000Z' },
        { action: 'note', text: 'More on SaaS', at: '2026-09-10T02:28:35.716Z' },
        { action: 'known', at: '2026-09-11T08:00:00.000Z' },
      ],
    })
  })

  it('keeps a log that is already there and adds a status written on top of it', () => {
    const entry = {
      topic: 'saas',
      shown: 1,
      showings: [{ number: 1, shownAt: SHOWN, via: 'schedule' }],
      feedback: [{ action: 'useful', at: SHOWN, showing: 1 }],
      status: 'known',
    }
    assert.deepEqual(withFeedbackLog(entry).feedback, [
      { action: 'useful', at: SHOWN, showing: 1 },
      { action: 'known', at: undefined },
    ])
  })

  it('normalises every entry in the file', () => {
    assert.deepEqual(withFeedbackLogs({ A: { topic: 'saas', shown: 0 } }), {
      A: { topic: 'saas', shown: 0, showings: [], feedback: [] },
    })
  })
})

describe('a card shown twice', () => {
  const twice = () => {
    let entry = withShowing(newEntry('saas'), { at: SHOWN, via: 'schedule' })
    entry = withFeedback(entry, 1, { action: 'interested', at: LATER })
    entry = withClosing(entry, 1, { at: LATER, by: 'interested' })
    entry = withShowing(entry, { at: '2026-09-25T09:00:00.000Z', via: 'again' })
    entry = withFeedback(entry, 2, { action: 'interested', at: '2026-09-25T09:01:00.000Z' })
    entry = withFeedback(entry, 2, { action: 'not-interested', at: '2026-09-25T09:02:00.000Z' })
    return withClosing(entry, 2, { at: '2026-09-25T09:02:00.000Z', by: 'not-interested' })
  }

  it('keeps a separate record of each showing with when and how it opened and closed', () => {
    assert.deepEqual(twice().showings, [
      { number: 1, shownAt: SHOWN, via: 'schedule', closedAt: LATER, closedBy: 'interested' },
      {
        number: 2,
        shownAt: '2026-09-25T09:00:00.000Z',
        via: 'again',
        closedAt: '2026-09-25T09:02:00.000Z',
        closedBy: 'not-interested',
      },
    ])
    assert.equal(twice().shown, 2)
    assert.equal(twice().lastShownAt, '2026-09-25T09:00:00.000Z')
  })

  it('keeps every press, repeats and disagreements included, tied to the showing it came on', () => {
    assert.deepEqual(twice().feedback, [
      { action: 'interested', at: LATER, showing: 1 },
      { action: 'interested', at: '2026-09-25T09:01:00.000Z', showing: 2 },
      { action: 'not-interested', at: '2026-09-25T09:02:00.000Z', showing: 2 },
    ])
  })

  it('never overwrites a showing that already closed', () => {
    const entry = withClosing(twice(), 1, { at: '2026-09-26T00:00:00.000Z', by: 'quit' })
    assert.equal(entry.showings[0].closedBy, 'interested')
  })
})

describe('retiredTitles', () => {
  it('retires cards whose latest verdict is known or not interested, whatever came before or after it as a note', () => {
    const entries = withFeedbackLogs({
      Known: {
        topic: 'saas',
        shown: 1,
        feedback: [
          { action: 'useful', at: SHOWN },
          { action: 'known', at: LATER },
        ],
      },
      Dropped: {
        topic: 'saas',
        shown: 1,
        status: 'not-interested',
        markedAt: LATER,
        notes: [{ text: 'too basic', at: '2026-09-25T00:00:00.000Z' }],
      },
      Liked: { topic: 'saas', shown: 1, feedback: [{ action: 'useful', at: SHOWN }] },
      Unmarked: { topic: 'saas', shown: 1 },
    })
    assert.deepEqual(retiredTitles(entries), new Set(['Known', 'Dropped']))
  })

  it('brings a card back once a later press changes its mind', () => {
    const entries = withFeedbackLogs({
      Reconsidered: {
        topic: 'saas',
        shown: 2,
        feedback: [
          { action: 'not-interested', at: SHOWN, showing: 1 },
          { action: 'interested', at: LATER, showing: 2 },
        ],
      },
    })
    assert.deepEqual(retiredTitles(entries), new Set())
  })
})
