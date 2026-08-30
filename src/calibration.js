import { app } from 'electron'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const buildPrompt = (tipsFile, since) => [
  `It has been a week since we last tuned my SaaS coaching. The last tune-up was ${new Date(since).toISOString().slice(0, 10)}. Work through this in order.`,
  '',
  `1. Read my Claude Code session history on disk to work out what I have actually been doing since ${new Date(since).toISOString().slice(0, 10)}. The transcripts are JSONL files under ~/.claude/projects/, one directory per project path and one .jsonl file per session. Use modification times to find the sessions active since then. They are large, so sample the most recently active ones rather than reading everything. Work out what I am building, what I keep getting stuck on, and where my time is actually going.`,
  '',
  '2. Tell me in a few sentences what you found, then interview me. Ask what making money with SaaS actually means for me, what "there" looks like and by when, where I am struggling right now, what I have already tried, and what my real constraints are in time, money, skill and risk. Ask one question at a time and keep going until you genuinely have enough to coach me well rather than generically.',
  '',
  `3. Then write my personalised tips to ${tipsFile} as a JSON array. Each entry is {"title": a short imperative line, "body": two or three sentences, "source": where the idea comes from, "url": a real link or omitted}. Write 20 to 40 of them. They must be specific to my situation, my goal and where I am stuck, and together they should form a path from where I am now to where I said I want to be. Mix concrete next actions with the principles behind them.`,
  '',
  'That file becomes the popups that interrupt me while I work all week, so make every one worth the interruption.',
].join('\n')

export const createCalibration = () => {
  const stateFile = join(app.getPath('userData'), 'coach.json')
  const tipsFile = join(app.getPath('userData'), 'tips-personal.json')

  if (!existsSync(stateFile)) writeFileSync(stateFile, JSON.stringify({ seededAt: Date.now() }))
  const { seededAt } = JSON.parse(readFileSync(stateFile, 'utf8'))

  const lastCalibratedAt = () =>
    existsSync(tipsFile) ? Math.max(seededAt, statSync(tipsFile).mtimeMs) : seededAt

  return {
    isDue: () => Date.now() - lastCalibratedAt() > WEEK_MS,
    personalTips: () => (existsSync(tipsFile) ? JSON.parse(readFileSync(tipsFile, 'utf8')) : []),
    popup: () => ({
      kind: 'calibration',
      title: 'Weekly tune-up',
      body: 'Time to recalibrate. Open a Claude Code session and it will read what you have been working on this week, ask about your goals and where you are stuck, and rewrite these tips around your situation.',
      source: 'Personalised coaching',
      prompt: buildPrompt(tipsFile, lastCalibratedAt()),
    }),
  }
}
