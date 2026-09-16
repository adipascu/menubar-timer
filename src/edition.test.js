import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { editionCard, tuneUpPrompt } from './edition.js'
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
  'the weekly tune-up': () => tuneUpPrompt(SOURCES, LAST_TUNE_UP),
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

describe('the tune-up date line', () => {
  it('is the day of the last tune-up', () => {
    assert.ok(tuneUpPrompt(SOURCES, LAST_TUNE_UP).includes('2026-09-01'))
  })
})
