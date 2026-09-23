import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { editionCard, poolStep, tuneUpPrompt } from './edition.js'
import { quizCard } from './quiz.js'

const SOURCES = {
  poolFile: '/data/tips-builtin.json',
  feedbackFile: '/data/feedback.json',
  ideasFile: '/data/ideas.json',
  quizFile: '/data/quiz.json',
  library: {
    dir: '/data/library',
    latestCardsFile: () => '/data/library/cards-0003.json',
    nextEdition: () => ({ cardsFile: '/data/library/cards-0004.json', bookFile: '/data/library/book-0004.json' }),
  },
}

const DAY_MS = 24 * 60 * 60 * 1000
const LAST_TUNE_UP = Date.parse('2026-09-01T09:00:00.000Z')

const stepNumbers = (prompt) =>
  prompt
    .split('\n')
    .map((line) => /^(\d+)\. /.exec(line))
    .filter(Boolean)
    .map(([, number]) => Number(number))

const counted = (length) => Array.from({ length }, (_, index) => index + 1)

const PROMPTS = {
  'the edition': () => editionCard(SOURCES).prompt(),
  'the quiz': () => quizCard(SOURCES).prompt(),
  'the weekly tune-up': () => tuneUpPrompt(SOURCES, LAST_TUNE_UP, LAST_TUNE_UP + 7 * DAY_MS),
}

const READS = {
  'the edition': ['poolFile', 'feedbackFile', 'ideasFile', 'quizFile'],
  'the quiz': ['poolFile', 'feedbackFile', 'ideasFile', 'quizFile'],
  'the weekly tune-up': ['feedbackFile', 'ideasFile'],
}

for (const [name, build] of Object.entries(PROMPTS)) {
  describe(name, () => {
    const prompt = build()

    it('numbers its steps from one without a gap', () => {
      const numbers = stepNumbers(prompt)
      assert.deepEqual(numbers, counted(numbers.length))
    })

    it('names every file it is told to read, the notes and ideas among them', () => {
      for (const source of [...READS[name], 'library']) {
        const file = source === 'library' ? SOURCES.library.dir : SOURCES[source]
        assert.ok(prompt.includes(file), `${name} prompt never mentions ${source} at ${file}`)
      }
    })
  })
}

describe('the card pool step', () => {
  it('points at the cards written for the last edition', () => {
    assert.ok(poolStep(1, SOURCES.poolFile, SOURCES.library).includes('/data/library/cards-0003.json'))
  })

  it('names the pool alone before any edition has been written', () => {
    const step = poolStep(1, SOURCES.poolFile, { ...SOURCES.library, latestCardsFile: () => null })
    assert.ok(step.includes(SOURCES.poolFile))
    assert.ok(!step.includes('personalised cards'))
  })
})

describe('the tune-up opening line', () => {
  const opening = (elapsedMs) => tuneUpPrompt(SOURCES, LAST_TUNE_UP, LAST_TUNE_UP + elapsedMs).split('\n')[0]

  it('names the day of the last tune-up', () => {
    assert.match(opening(7 * DAY_MS), /2026-09-01/)
  })

  it('says how long ago that was rather than assuming a week', () => {
    assert.match(opening(0), /earlier today/)
    assert.match(opening(2 * 60 * 60 * 1000), /earlier today/)
    assert.match(opening(DAY_MS), /yesterday/)
    assert.match(opening(3 * DAY_MS), /3 days ago/)
    assert.match(opening(30 * DAY_MS), /30 days ago/)
  })

  it('counts those days off the same calendar the date comes from', () => {
    const sinceLateOn = Date.parse('2026-09-15T23:00:00.000Z')
    const justAfterMidnight = Date.parse('2026-09-16T02:00:00.000Z')
    const line = tuneUpPrompt(SOURCES, sinceLateOn, justAfterMidnight).split('\n')[0]
    assert.match(line, /was 2026-09-15, yesterday/)
  })
})
