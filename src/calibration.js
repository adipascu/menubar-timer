import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE_RULE, bookStep, cardsStep, feedbackStep, historyStep } from './edition.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const buildPrompt = (feedbackFile, library, since) => {
  const { cardsFile, bookFile } = library.nextEdition()
  return [
    `It has been a week since we last tuned my coaching. The last tune-up was ${new Date(since).toISOString().slice(0, 10)}. Work through this in order.`,
    '',
    `1. Read my Claude Code session history on disk to work out what I have actually been doing since ${new Date(since).toISOString().slice(0, 10)}. The transcripts are JSONL files under ~/.claude/projects/, one directory per project path and one .jsonl file per session. Use modification times to find the sessions active since then. They are large, so sample the most recently active ones rather than reading everything. Work out what I am building, what I keep getting stuck on, and where my time is actually going.`,
    '',
    feedbackStep(2, feedbackFile),
    '',
    historyStep(3, library),
    '',
    '4. Tell me in a few sentences what you found, then interview me. Ask what making money with SaaS actually means for me, what "there" looks like and by when, where I am struggling right now, what I have already tried, and what my real constraints are in time, money, skill and risk. Then ask about the other half of it: how the working itself has been going, what my attention, sleep and stress have been like, and what keeps draining me. Ask one question at a time and keep going until you genuinely have enough to coach me well rather than generically.',
    '',
    cardsStep(
      5,
      cardsFile,
      'Spread them evenly across the three topics. They must be specific to my situation, my goal and where I am stuck, and together they should form a path from where I am now to where I said I want to be. Mix concrete next actions with the principles behind them.',
    ),
    '',
    bookStep(6, bookFile),
    '',
    SOURCE_RULE,
    '',
    'The cards become the popups that interrupt me while I work all week, so make every one worth the interruption, and the book is what I read when the popups cannot reach me.',
  ].join('\n')
}

export const createCalibration = (feedbackFile, library) => {
  const stateFile = join(app.getPath('userData'), 'coach.json')

  if (!existsSync(stateFile)) writeFileSync(stateFile, JSON.stringify({ seededAt: Date.now() }))
  const { seededAt } = JSON.parse(readFileSync(stateFile, 'utf8'))

  const lastCalibratedAt = () => Math.max(seededAt, library.cardsWrittenAt() ?? 0)

  return {
    isDue: () => Date.now() - lastCalibratedAt() > WEEK_MS,
    popup: () => ({
      kind: 'calibration',
      title: 'Weekly tune-up',
      body: 'Time to recalibrate. Open a Claude Code session and it will read what you have been working on this week, ask about your goals and where you are stuck, and write a new edition of these tips and of the book around your situation.',
      source: 'Personalised coaching',
      prompt: () => buildPrompt(feedbackFile, library, lastCalibratedAt()),
    }),
  }
}
