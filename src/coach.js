import { app, BrowserWindow, ipcMain, powerMonitor, screen, shell } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCalibration } from './calibration.js'
import { createFeedback } from './feedback.js'
import { menuBarIsCovered } from './fullscreen.js'
import { log } from './log.js'
import { musicIsLoud } from './music.js'
import { quizCard } from './quiz.js'

const here = dirname(fileURLToPath(import.meta.url))
const tips = JSON.parse(readFileSync(join(here, 'tips.json'), 'utf8'))

const MIN_GAP_MS = 4 * 60 * 1000
const MAX_GAP_MS = 12 * 60 * 1000
const RETRY_GAP_MS = 60 * 1000
const ACTIVE_WITHIN_SECONDS = 60
const POPUP_WIDTH = 380
const POPUP_MARGIN = 12
const SCRATCH_DIR = '/tmp'

const HIDDEN_TIMER_NUDGE = {
  kind: 'nudge',
  title: 'The timer is off',
  body: 'A fullscreen window is covering the menu bar, so the timer is out of sight. Pick a timer length from the menu when you want to focus on something.',
}

const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))

const shuffled = (items) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const orderedForTopic = (pool, topic) => {
  const ofTopic = pool.filter((tip) => tip.topic === topic)
  const personal = ofTopic.filter((tip) => tip.personal)
  const definitions = ofTopic.filter((tip) => tip.definition && !tip.personal)
  const rest = ofTopic.filter((tip) => !tip.definition && !tip.personal)
  return [...shuffled(personal), ...shuffled(definitions), ...shuffled(rest)]
}

const createTipQueue = (allTips, retiredTitles) => {
  const queues = {}
  let turn = 0

  return () => {
    const retired = retiredTitles()
    const available = allTips().filter((tip) => !retired.has(tip.title))
    const topics = [...new Set(available.map((tip) => tip.topic))]
    if (topics.length === 0) return null

    const topic = topics[turn % topics.length]
    turn += 1
    for (;;) {
      if (!queues[topic]?.length) queues[topic] = orderedForTopic(available, topic)
      const tip = queues[topic].shift()
      if (!retired.has(tip.title)) return tip
    }
  }
}

const userIsAtTheComputer = () => powerMonitor.getSystemIdleState(ACTIVE_WITHIN_SECONDS) === 'active'

const sourcePathFile = () => join(app.getPath('userData'), 'source-path')

const rememberSourcePath = () => {
  if (!app.isPackaged) writeFileSync(sourcePathFile(), app.getAppPath())
}

const sourcePath = () => {
  if (!app.isPackaged) return app.getAppPath()
  const file = sourcePathFile()
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null
}

const ownSourceNote = () => {
  const source = sourcePath()
  return [
    'The popup came from TimerBar, a menu bar coach I built myself and keep changing, so if this turns into a change worth making to the coach we can go and make it.',
    source ? ` Its source is at ${source}.` : '',
  ].join('')
}

const DISCUSSION_BY_TOPIC = {
  saas: 'That tip just popped up while I was working. Help me think it through and work out what it means for the SaaS I am building. Ask me what I am building before you give advice.',
  psychology:
    'That popped up while I was working. Help me think it through and work out what it means for how I actually work: my attention, my motivation, my habits. Ask me how the work has been going lately before you give advice, and stay with what the research behind it supports rather than the pop version.',
  psychiatry:
    'That popped up while I was working. Help me understand what it actually says and what it means for looking after my head while I build things. Ask about my situation before you answer, keep to what the source supports, do not diagnose me, and say plainly when something belongs with a doctor rather than with you.',
}

const discussionPrompt = (tip) =>
  [
    `"${tip.title}" — ${tip.source}${tip.url ? `, ${tip.url}` : ''}`,
    '',
    tip.body,
    '',
    DISCUSSION_BY_TOPIC[tip.topic],
  ].join('\n')

const openClaudeSession = (tip) => {
  const promptFile = join(app.getPath('temp'), `timerbar-prompt-${Date.now()}.txt`)
  writeFileSync(promptFile, `${tip.prompt ?? discussionPrompt(tip)}\n\n${ownSourceNote()}`)

  const command = `cd ${SCRATCH_DIR} && claude "$(cat ${JSON.stringify(promptFile)})"`
  execFile(
    'osascript',
    [
      '-e',
      `tell application "Terminal" to do script ${JSON.stringify(command)}`,
      '-e',
      'tell application "Terminal" to activate',
    ],
    { timeout: 10000 },
    (error) => {
      if (error) log(`could not open a Claude Code session: ${error.message.trim()}`)
      else log(`opened a Claude Code session for "${tip.title}"`)
    },
  )
}

const exportPool = () => {
  const file = join(app.getPath('userData'), 'tips-builtin.json')
  writeFileSync(file, readFileSync(join(here, 'tips.json')))
  return file
}

export const createCoach = (getState) => {
  rememberSourcePath()
  const feedback = createFeedback()
  const tipsFile = join(app.getPath('userData'), 'tips-personal.json')
  const quizFile = join(app.getPath('userData'), 'quiz.json')
  const poolFile = exportPool()
  const calibration = createCalibration(tipsFile, feedback.file)
  const allTips = () => [...tips, ...calibration.personalTips().map((tip) => ({ ...tip, personal: true }))]
  const nextTip = createTipQueue(allTips, feedback.retiredTitles)
  let timer = null
  let popup = null
  let showing = null

  const tipsAreAllowed = () => getState() !== 'running'
  const timerIsOff = () => getState() === 'idle'

  const closePopup = () => {
    if (popup && !popup.isDestroyed()) popup.close()
    popup = null
    showing = null
  }

  const placeBottomRight = (window) => {
    const { workArea } = screen.getPrimaryDisplay()
    const [width, height] = window.getSize()
    window.setPosition(
      workArea.x + workArea.width - width - POPUP_MARGIN,
      workArea.y + workArea.height - height - POPUP_MARGIN,
    )
  }

  const show = (tip) => {
    showing = tip
    const loudMusic = musicIsLoud().catch(() => false)
    popup = new BrowserWindow({
      width: POPUP_WIDTH,
      height: 200,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      webPreferences: { preload: join(here, 'popup-preload.cjs') },
    })

    popup.setAlwaysOnTop(true, 'screen-saver')
    popup.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    popup.on('closed', () => {
      popup = null
      showing = null
    })

    const window = popup
    window.webContents.on('did-finish-load', async () => {
      const tipWithBeacon = { ...tip, loudMusic: await loudMusic }
      if (!window.isDestroyed()) window.webContents.send('tip', tipWithBeacon)
    })
    window.loadFile(join(here, 'popup.html'))
  }

  const dueNow = async () => {
    if (calibration.isDue()) return calibration.popup()
    if (timerIsOff() && (await menuBarIsCovered())) return HIDDEN_TIMER_NUDGE
    return nextTip() ?? calibration.popup()
  }

  const tick = async () => {
    if (!(tipsAreAllowed() && userIsAtTheComputer() && popup === null)) {
      schedule(RETRY_GAP_MS)
      return
    }

    const tip = await dueNow()
    if (tipsAreAllowed() && popup === null) {
      show(tip)
      if (tip.topic) feedback.recordShown(tip)
      log(`showed ${tip.kind ?? 'tip'}: ${tip.title}`)
    }
    schedule(randomGap())
  }

  const schedule = (delay) => {
    clearTimeout(timer)
    timer = setTimeout(tick, delay)
  }

  ipcMain.on('coach:height', (event, height) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed()) return
    window.setContentSize(POPUP_WIDTH, Math.round(height))
    placeBottomRight(window)
    window.showInactive()
  })

  ipcMain.on('coach:dismiss', () => closePopup())

  ipcMain.on('coach:mark', (_event, status) => {
    const tip = showing
    closePopup()
    feedback.mark(tip, status)
    log(`marked "${tip.title}" ${status}`)
  })

  ipcMain.on('coach:discuss', () => {
    const tip = showing
    closePopup()
    if (tip) openClaudeSession(tip)
  })

  ipcMain.on('coach:open-source', (_event, url) => {
    shell.openExternal(url)
    closePopup()
  })

  return {
    start: () => schedule(randomGap()),
    alert: (card) => {
      closePopup()
      show(card)
    },
    quiz: () => openClaudeSession(quizCard({ poolFile, tipsFile, feedbackFile: feedback.file, quizFile })),
    refresh: () => {
      if (tipsAreAllowed()) schedule(randomGap())
      else closePopup()
    },
    stop: () => {
      clearTimeout(timer)
      timer = null
      closePopup()
    },
  }
}
