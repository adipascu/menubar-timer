import { app, BrowserWindow, clipboard, ipcMain, Menu, powerMonitor, screen, shell } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCalibration } from './calibration.js'
import { createCardSlot } from './card-slot.js'
import { editionCard } from './edition.js'
import { createFeedback } from './feedback.js'
import { menuBarIsCovered } from './fullscreen.js'
import { log } from './log.js'
import { musicIsLoud, shareSystemAudio } from './music.js'
import { quizCard } from './quiz.js'
import { createTipSchedule } from './tip-schedule.js'

const here = dirname(fileURLToPath(import.meta.url))
const tips = JSON.parse(readFileSync(join(here, 'tips.json'), 'utf8'))

const ACTIVE_WITHIN_SECONDS = 60
const POPUP_WIDTH = 380
const POPUP_MARGIN = 12
const SCRATCH_DIR = '/tmp'

const HIDDEN_TIMER_NUDGE = {
  kind: 'nudge',
  title: 'The timer is off',
  body: 'A fullscreen window is covering the menu bar, so the timer is out of sight. Pick a timer length from the menu when you want to focus on something.',
}

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
  writeFileSync(promptFile, `${tip.prompt?.() ?? discussionPrompt(tip)}\n\n${ownSourceNote()}`)

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

const focusCard = (window) => {
  if (window.isDestroyed()) return
  window.setFocusable(true)
  window.focus()
  app.focus({ steal: true })
}

const exportPool = () => {
  const file = join(app.getPath('userData'), 'tips-builtin.json')
  writeFileSync(file, readFileSync(join(here, 'tips.json')))
  return file
}

const SHOWN_VIA = {
  schedule: '',
  'on-demand': ' on demand',
  'timer-ran-out': ' the moment the timer ran out',
  again: ' again on demand',
}

export const createCoach = (
  getState,
  library,
  ideasFile,
  getBeacon,
  getSiteLine,
  onCardShown,
  isSettled,
  onOnTrack,
) => {
  rememberSourcePath()
  shareSystemAudio()
  const feedback = createFeedback()
  const quizFile = join(app.getPath('userData'), 'quiz.json')
  const poolFile = exportPool()
  const editionSources = { poolFile, feedbackFile: feedback.file, ideasFile, quizFile, library }
  const calibration = createCalibration({ feedbackFile: feedback.file, ideasFile, library })
  const allTips = () => [...tips, ...library.cards().map((tip) => ({ ...tip, personal: true }))]
  const nextTip = createTipQueue(allTips, feedback.retiredTitles)
  const showingOf = new Map()
  const onScreen = createCardSlot((card, reason) => {
    if (showingOf.has(card)) feedback.recordClosed(card, showingOf.get(card), reason)
    showingOf.delete(card)
  })
  app.on('before-quit', () => onScreen.close('quit'))
  let dragOffset = null

  const tipsAreAllowed = () => getState() !== 'running'
  const timerIsOff = () => getState() === 'idle'

  const placeBottomRight = (window) => {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const [width, height] = window.getSize()
    window.setPosition(
      workArea.x + workArea.width - width - POPUP_MARGIN,
      workArea.y + workArea.height - height - POPUP_MARGIN,
    )
  }

  const resizeKeepingBottomEdge = (window, height) => {
    const bounds = window.getBounds()
    const { workArea } = screen.getDisplayMatching(bounds)
    const y = Math.max(workArea.y, bounds.y + bounds.height - height)
    window.setBounds({ x: bounds.x, y, width: POPUP_WIDTH, height })
  }

  const keptOnDisplayOf = (pointer, x, y, height) => {
    const { workArea } = screen.getDisplayNearestPoint(pointer)
    return {
      x: Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - POPUP_WIDTH),
      y: Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height),
    }
  }

  const requestedAt = new WeakMap()
  let lastCard = null

  const show = (tip, extras = {}) => {
    requestedAt.set(tip, Date.now())
    const loudMusic = musicIsLoud().catch(() => false)
    const window = new BrowserWindow({
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

    onScreen.open(window, tip)
    if (tip.kind !== HIDDEN_TIMER_NUDGE.kind) lastCard = tip
    onCardShown()
    window.setAlwaysOnTop(true, 'screen-saver')
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    window.on('closed', () => onScreen.closed(window))
    window.on('blur', () => window.setFocusable(false))
    window.on('close', () => {
      if (!window.isFocused()) return
      const othersShowing = BrowserWindow.getAllWindows().some((other) => other !== window && other.isVisible())
      if (!othersShowing) app.hide()
    })
    const whileOpen = (action) => () => {
      if (!window.isDestroyed()) action()
    }
    window.webContents.on('context-menu', (_event, { selectionText, linkURL, isEditable }) => {
      Menu.buildFromTemplate([
        { role: 'cut', visible: isEditable, enabled: selectionText.length > 0 },
        { label: 'Copy', enabled: selectionText.length > 0, click: whileOpen(() => window.webContents.copy()) },
        { role: 'paste', visible: isEditable },
        { label: 'Copy Link', visible: linkURL.length > 0, click: () => clipboard.writeText(linkURL) },
        {
          label: 'Select All',
          click: whileOpen(() => {
            window.webContents.selectAll()
            focusCard(window)
          }),
        },
      ]).popup({ window })
    })
    window.webContents.on('did-finish-load', async () => {
      const { prompt, ...shown } = tip
      const card = { ...shown, ...extras, beacon: getBeacon(), siteLine: getSiteLine(), loudMusic: await loudMusic }
      if (!window.isDestroyed()) window.webContents.send('tip', card)
    })
    window.loadFile(join(here, 'popup.html'))
  }

  const nextCard = () => (calibration.isDue() ? calibration.popup() : (nextTip() ?? calibration.popup()))

  const dueNow = async () => {
    if (!calibration.isDue() && timerIsOff() && (await menuBarIsCovered())) return HIDDEN_TIMER_NUDGE
    return nextCard()
  }

  const present = (tip, via = 'schedule', extras) => {
    show(tip, extras)
    if (tip.topic) showingOf.set(tip, feedback.recordShown(tip, via))
    log(`showed ${tip.kind ?? 'tip'}${SHOWN_VIA[via]}: ${tip.title}`)
  }

  const tick = async () => {
    if (!(tipsAreAllowed() && isSettled() && userIsAtTheComputer() && onScreen.isEmpty())) {
      schedule.retry()
      return
    }

    const tip = await dueNow()
    if (tipsAreAllowed() && onScreen.isEmpty()) present(tip)
    schedule.next()
  }

  const schedule = createTipSchedule(tick)

  ipcMain.on('coach:height', (event, reported) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed()) return
    const height = Math.round(reported)
    if (window.isVisible()) {
      resizeKeepingBottomEdge(window, height)
      return
    }
    window.setContentSize(POPUP_WIDTH, height)
    placeBottomRight(window)
    window.showInactive()
    const card = onScreen.card()
    if (onScreen.window() === window && requestedAt.has(card))
      log(`card on screen ${Date.now() - requestedAt.get(card)} ms after it was asked for: ${card.title}`)
  })

  ipcMain.on('coach:drag-start', (event, pointer) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed()) return
    const [x, y] = window.getPosition()
    dragOffset = { x: pointer.x - x, y: pointer.y - y }
  })

  ipcMain.on('coach:drag', (event, pointer) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed() || !dragOffset) return
    const [, height] = window.getSize()
    const { x, y } = keptOnDisplayOf(pointer, pointer.x - dragOffset.x, pointer.y - dragOffset.y, height)
    window.setPosition(Math.round(x), Math.round(y))
  })

  ipcMain.on('coach:beacon', (_event, label) => log(`beacon ${label}`))

  ipcMain.on('coach:dismiss', (_event, how) => onScreen.close(how))

  const recordAndClose = (event, describe) => {
    const tip = onScreen.card()
    if (tip && showingOf.has(tip)) {
      feedback.record(tip, showingOf.get(tip), event)
      log(describe(tip.title))
    }
    onScreen.close(event.action)
  }

  ipcMain.on('coach:mark', (_event, status) =>
    recordAndClose({ action: status }, (title) => `marked "${title}" ${status}`),
  )

  ipcMain.on('coach:useful', () => recordAndClose({ action: 'useful' }, (title) => `found "${title}" useful`))

  ipcMain.on('coach:interested', () =>
    recordAndClose({ action: 'interested' }, (title) => `asked for more like "${title}"`),
  )

  ipcMain.on('coach:note', (_event, text) =>
    recordAndClose({ action: 'note', text }, (title) => `noted on "${title}": ${JSON.stringify(text)}`),
  )

  ipcMain.on('coach:on-track', () => {
    const restarting = getState() === 'expired'
    onScreen.close(restarting ? 'on-track' : 'got-it')
    if (restarting) onOnTrack()
  })

  ipcMain.on('coach:discuss', () => {
    const tip = onScreen.card()
    onScreen.close('discuss')
    if (tip) openClaudeSession(tip)
  })

  ipcMain.on('coach:open-source', (_event, url) => {
    shell.openExternal(url)
    onScreen.close('opened-source')
  })

  ipcMain.on('coach:focus', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) focusCard(window)
  })

  return {
    start: () => schedule.next(),
    alert: (card, extras) => show(card, extras),
    timerExpired: (extras) => {
      if (!onScreen.isEmpty()) return null
      const card = nextCard()
      present(card, 'timer-ran-out', extras)
      schedule.next()
      return card
    },
    dropAlert: (kind) => {
      const card = onScreen.card()
      if (card?.kind !== kind) return
      onScreen.close('dropped')
      log(`dropped the ${kind} card: ${card.title}`)
    },
    lastCard: () => lastCard,
    showLastAgain: () => {
      if (!lastCard) return
      present(lastCard, 'again')
      schedule.next()
    },
    showCardNow: () => {
      present(nextCard(), 'on-demand')
      schedule.next()
    },
    quiz: () => openClaudeSession(quizCard(editionSources)),
    edition: () => openClaudeSession(editionCard(editionSources)),
    tuneUp: () => openClaudeSession(calibration.popup()),
    tuneUpTiming: calibration.timing,
    setBeacon: (id) => {
      onScreen.window()?.webContents.send('beacon', id)
    },
    setSiteLine: (text) => {
      onScreen.window()?.webContents.send('site-line', text)
    },
    refresh: () => {
      if (!tipsAreAllowed()) {
        onScreen.close('timer-started')
        return
      }
      if (timerIsOff()) schedule.tipsResumed()
    },
    stop: () => {
      schedule.stop()
      onScreen.close('stopped')
    },
  }
}
