import { app, Menu, shell, Tray } from 'electron'
import ansiStyles from 'ansi-styles'
import { createCategories } from './categories.js'
import { createChargerPlaces } from './charger-places.js'
import { createCoach } from './coach.js'
import { createFocusLog } from './focus-log.js'
import { formatDuration, formatShare, periods, splitByCategory } from './focus-stats.js'
import { goalCard } from './goal-card.js'
import { nudge, standings, tracked } from './goals.js'
import { createLibrary } from './library.js'
import { swatchOf } from './palette.js'
import { createPowerWatch } from './power.js'
import { createReader } from './reader.js'
import { createReadout } from './readout.js'
import { swatchImage } from './swatch.js'
import { createTaskField } from './task.js'
import { log } from './log.js'
import * as loginItem from './login-item.js'
import * as singleInstance from './single-instance.js'

const IDLE_STATUS = '⏱'
const DURATIONS = [
  { minutes: 5, hint: 'drifting off constantly' },
  { minutes: 10, hint: 'hard to get started' },
  { minutes: 15, hint: 'everyday check-in' },
  { minutes: 20, hint: 'settled into it' },
  { minutes: 25, hint: 'a full pomodoro' },
  { minutes: 45, hint: 'deep in something' },
  { minutes: 60, hint: 'long anchor' },
  { minutes: 90, hint: 'one full focus cycle' },
]
const FREEBASING = 'Freebasing · no timer, chaos welcome'
const NO_TASK = 'No task, on purpose'
const FLASH_MS = 500
const MENU_REFRESH_MS = 60 * 1000

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

app.setName('Timer App')
app.on('window-all-closed', () => {})

;(async () => {
  let interval = null
  let state = 'idle'
  let status = IDLE_STATUS
  let sessionMinutes = null
  let reading = null
  let loadFlash = null
  let flameShowing = false
  let menuOpen = false
  let menuStale = false
  let menuDay = null
  let goalCardShownAt = null

  const renderTitle = () => {
    const label = state === 'idle' ? '' : task.get()
    const shown = state === 'running' ? swatchOf(categories.active().color).paint(status) : status
    tray.setTitle(label ? `${label} · ${shown}` : shown, { fontType: 'monospacedDigit' })
  }

  const segmentDetails = () => ({ category: categories.active(), task: task.get(), plannedMinutes: sessionMinutes })

  const segmentChange = (current) => {
    if (current.category.id !== categories.active().id) return 'switched'
    if (current.task !== task.get()) return 'relabelled'
    return null
  }

  const resegment = () => {
    const current = focusLog.current()
    const change = current && segmentChange(current)
    if (!change) return
    focusLog.end(change)
    focusLog.begin(segmentDetails())
  }

  const renderSlot = () => tray.setImage(flameShowing ? readout.flame : reading)

  const setPowerDraw = (watts, overLimit) => {
    reading = readout.reading(watts)
    if (overLimit) {
      loadFlash ??= setInterval(() => {
        flameShowing = !flameShowing
        renderSlot()
      }, FLASH_MS)
    } else {
      clearInterval(loadFlash)
      loadFlash = null
      flameShowing = false
    }
    renderSlot()
  }

  const setStatus = (next) => {
    status = next
    renderTitle()
  }

  const flashMenuBar = () => {
    let isGreen = true
    return setInterval(() => {
      if (isGreen) {
        setStatus(`${ansiStyles.bgGreen.open}Time's up!${ansiStyles.bgGreen.close}`)
      } else {
        setStatus("Time's up!")
      }
      isGreen = !isGreen
    }, 500)
  }

  const setState = (next) => {
    log(`state ${state} to ${next}, tips ${next === 'running' ? 'paused' : 'on'}`)
    state = next
    renderTitle()
    coach.refresh()
    renderMenu()
  }

  const resetTimer = (minutes) => {
    clearInterval(interval)
    sessionMinutes = minutes
    focusLog.end('restarted')
    focusLog.begin(segmentDetails())

    const endTime = Date.now() + minutes * 60 * 1000

    const updateTimer = () => {
      const currentTime = Date.now()
      const timeLeft = Math.max(0, Math.round((endTime - currentTime) / 1000))

      if (timeLeft <= 0) {
        clearInterval(interval)
        focusLog.end('completed')
        status = "Time's up!"
        setState('expired')
        interval = flashMenuBar()
        offerSwitch()
      } else {
        setStatus(formatTime(timeLeft))
      }
    }

    setState('running')
    updateTimer()
    interval = setInterval(updateTimer, 1000)
    offerSwitch()
  }

  const startSession = (minutes) => {
    if (task.get()) {
      resetTimer(minutes)
      return
    }
    task.prompt(() => resetTimer(minutes))
    renderMenu()
  }

  const stopTimer = () => {
    task.cancelPending()
    if (state === 'idle') return
    clearInterval(interval)
    interval = null
    focusLog.end('stopped')
    status = IDLE_STATUS
    setState('idle')
  }

  const refreshStaleMenu = () => {
    if (state === 'running' || menuDay !== periods(new Date())[0].from) renderMenu()
  }

  const periodStandings = (now) => {
    const { startedAt } = categories.period()
    const rows = standings(categories.all(), focusLog.segments(now), Date.parse(startedAt), now.getTime())
    return { startedAt, rows, total: rows.reduce((sum, row) => sum + row.seconds, 0) }
  }

  const offerSwitch = () => {
    const now = new Date()
    const { startedAt, rows, total } = periodStandings(now)
    const suggestion = nudge({
      rows,
      total,
      activeId: categories.active().id,
      shownAt: goalCardShownAt,
      now: now.getTime(),
    })
    if (!suggestion) return
    goalCardShownAt = now.getTime()
    log(`goal nudge: ${suggestion.behind.name} is behind while working on ${suggestion.active.name}`)
    coach.alert(goalCard({ ...suggestion, rows, total, startedAt }))
  }

  const rankedCategories = (now) => {
    const ranking = periodStandings(now).rows.map(({ id }) => id)
    const shown = tracked(categories.all())
    const active = categories.active()
    const ordered = [...shown].sort((first, second) => ranking.indexOf(first.id) - ranking.indexOf(second.id))
    return shown.some(({ id }) => id === active.id) ? ordered : [...ordered, active]
  }

  const goalMenu = (now) => {
    const { startedAt, rows, total } = periodStandings(now)
    if (rows.length === 0) return [{ label: 'No goals set', enabled: false }]
    const since = new Date(startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    return [
      { label: `Goals since ${since} · ${formatDuration(total)}`, enabled: false },
      ...rows.map((row) => ({
        label: `${row.name} · ${formatShare(row.actual)} of ${formatShare(row.goal)}`,
        icon: swatchImage(swatchOf(row.color).hex),
        enabled: false,
      })),
    ]
  }

  const focusMenu = (now) => {
    const segments = focusLog.segments(now)
    return [
      ...goalMenu(now),
      { type: 'separator' },
      ...periods(now).flatMap(({ label, from }, index) => {
        const { total, rows } = splitByCategory(segments, from, now.getTime(), categories.all())
        return [
          ...(index > 0 ? [{ type: 'separator' }] : []),
          { label: total >= 60 ? `${label} · ${formatDuration(total)}` : `${label} · nothing yet`, enabled: false },
          ...rows.map((row) => ({
            label: `${row.name} · ${formatDuration(row.seconds)} · ${formatShare(row.share)}`,
            icon: swatchImage(swatchOf(row.color).hex),
            enabled: false,
          })),
        ]
      }),
      { type: 'separator' },
      {
        label: 'Reveal the focus log in Finder',
        enabled: focusLog.exists(),
        click: () => shell.showItemInFolder(focusLog.file),
      },
    ]
  }

  const renderMenu = () => {
    if (menuOpen) {
      menuStale = true
      return
    }
    const now = new Date()
    menuDay = periods(now)[0].from
    const label = task.get()
    const menu = Menu.buildFromTemplate([
      state === 'idle'
        ? { label: NO_TASK, enabled: false }
        : { label: label ? `Working on: ${label}` : 'Set what you are working on…', click: () => task.prompt() },
      { type: 'separator' },
      { label: FREEBASING, type: 'radio', checked: state === 'idle', click: stopTimer },
      ...DURATIONS.map(({ minutes, hint }) => ({
        label: `${minutes} min · ${hint}`,
        type: 'radio',
        checked: state !== 'idle' && minutes === sessionMinutes,
        click: () => startSession(minutes),
      })),
      { type: 'separator' },
      ...rankedCategories(now).map((category) => ({
        label: category.name,
        type: 'radio',
        checked: category.id === categories.active().id,
        icon: swatchImage(swatchOf(category.color).hex),
        click: () => categories.activate(category.id),
      })),
      { label: 'Edit categories…', click: () => categories.edit() },
      { label: 'Focus time', submenu: focusMenu(now) },
      { type: 'separator' },
      {
        label: chargerPlaces.networkLabel()
          ? `Charger available at ${chargerPlaces.networkLabel()}`
          : 'Charger available here',
        type: 'checkbox',
        checked: chargerPlaces.isMarked(),
        enabled: chargerPlaces.networkLabel() !== null,
        click: () => {
          chargerPlaces.toggleHere()
          renderMenu()
        },
      },
      {
        label: state === 'running' ? 'Tips: paused until the timer ends' : 'Tips: on',
        enabled: false,
      },
      { label: 'Quiz me…', click: () => coach.quiz() },
      { label: 'Read the book…', click: () => reader.show() },
      { type: 'separator' },
      {
        label: 'Start at login',
        type: 'checkbox',
        checked: loginItem.isEnabled(),
        click: () => {
          loginItem.setEnabled(!loginItem.isEnabled())
          renderMenu()
        },
      },
      { role: 'quit' },
    ])
    menu.on('menu-will-show', () => {
      menuOpen = true
    })
    menu.on('menu-will-close', () => {
      menuOpen = false
      if (!menuStale) return
      menuStale = false
      setTimeout(renderMenu, 0)
    })
    tray.setContextMenu(menu)
  }

  await app.whenReady()

  if (loginItem.handleCommandLine()) {
    app.exit(0)
    return
  }

  singleInstance.claim()
  app.dock?.hide()
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'editMenu' }, { label: 'Window', submenu: [{ role: 'close' }] }]),
  )

  const focusLog = createFocusLog()
  focusLog.recover()
  app.on('before-quit', () => focusLog.end('quit'))

  const refresh = () => {
    resegment()
    renderTitle()
    renderMenu()
  }
  const task = createTaskField(refresh)
  const categories = createCategories(refresh)
  const library = createLibrary()
  const coach = createCoach(() => state, library)
  const reader = createReader(library, () => coach.edition())
  const chargerPlaces = createChargerPlaces(() => renderMenu())
  const powerWatch = createPowerWatch((card) => coach.alert(card), setPowerDraw, chargerPlaces.shouldAlert)

  const readout = createReadout()
  const tray = new Tray(readout.reading(null))
  renderTitle()
  renderMenu()
  coach.start()
  chargerPlaces.start()
  powerWatch.start()
  setInterval(refreshStaleMenu, MENU_REFRESH_MS)
  log(`ready, start at login ${loginItem.isEnabled()}`)
  await loginItem.offerOnFirstRun()
  renderMenu()
})()
