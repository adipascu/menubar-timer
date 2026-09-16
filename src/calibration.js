import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tuneUpPrompt } from './edition.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const createCalibration = ({ feedbackFile, ideasFile, library }) => {
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
      prompt: () => tuneUpPrompt({ feedbackFile, ideasFile, library }, lastCalibratedAt()),
    }),
  }
}
