import { app } from 'electron'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PERSONAL_TIP_SHAPE, SOURCE_RULE } from './personal-tips.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const buildPrompt = (tipsFile, feedbackFile, since) => [
  `It has been a week since we last tuned my coaching. The last tune-up was ${new Date(since).toISOString().slice(0, 10)}. Work through this in order.`,
  '',
  `1. Read my Claude Code session history on disk to work out what I have actually been doing since ${new Date(since).toISOString().slice(0, 10)}. The transcripts are JSONL files under ~/.claude/projects/, one directory per project path and one .jsonl file per session. Use modification times to find the sessions active since then. They are large, so sample the most recently active ones rather than reading everything. Work out what I am building, what I keep getting stuck on, and where my time is actually going.`,
  '',
  `2. Read ${feedbackFile}. It is a JSON object keyed by tip title. Each entry carries the tip's topic, how many times it has been shown, a status of "known" when I said I already knew it or "not-interested" when I said I did not want it, and an "interested" count of how many times I asked for more like it. Known tips are learned, so build on them rather than repeating them. Not-interested tips tell you which angles to drop, and that verdict wins over any interested count on the same tip. Interested tips are the ones to go deeper on, the higher the count the more so: write what follows from them, the ideas next to them and the sources behind them. Tips shown many times without a mark are the ones I keep sitting with, so those themes are still open.`,
  '',
  '3. Tell me in a few sentences what you found, then interview me. Ask what making money with SaaS actually means for me, what "there" looks like and by when, where I am struggling right now, what I have already tried, and what my real constraints are in time, money, skill and risk. Then ask about the other half of it: how the working itself has been going, what my attention, sleep and stress have been like, and what keeps draining me. Ask one question at a time and keep going until you genuinely have enough to coach me well rather than generically.',
  '',
  `4. Then write my personalised tips to ${tipsFile} as a JSON array. ${PERSONAL_TIP_SHAPE} Write 20 to 40 of them, spread evenly across the three topics. They must be specific to my situation, my goal and where I am stuck, and together they should form a path from where I am now to where I said I want to be. Mix concrete next actions with the principles behind them.`,
  '',
  SOURCE_RULE,
  '',
  'That file becomes the popups that interrupt me while I work all week, so make every one worth the interruption.',
].join('\n')

export const createCalibration = (tipsFile, feedbackFile) => {
  const stateFile = join(app.getPath('userData'), 'coach.json')

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
      prompt: buildPrompt(tipsFile, feedbackFile, lastCalibratedAt()),
    }),
  }
}
