import { app, Menu, powerMonitor, shell, Tray } from 'electron'
import ansiStyles from 'ansi-styles'
import { BEACON_PRESETS, createBeaconPreset } from './beacon.js'
import { batteryMenuItem } from './battery.js'
import { createBridge } from './bridge.js'
import { createCategories } from './categories.js'
import { createChargerPlaces } from './charger-places.js'
import { createCoach } from './coach.js'
import { createFocusLog } from './focus-log.js'
import {
  expiries,
  formatDuration,
  formatShare,
  formatWait,
  periods,
  splitByCategory,
  splitByMode,
} from './focus-stats.js'
import { goalCard } from './goal-card.js'
import { GOAL_RULES, nudge, periodReviews, pickOrder, recentStanding, standingText, tracked } from './goals.js'
import { createIdeas } from './ideas.js'
import { createLibrary } from './library.js'
import { swatchOf } from './palette.js'
import { createPowerWatch } from './power.js'
import { createReader } from './reader.js'
import { createReadout } from './readout.js'
import { createSettings } from './settings.js'
import { createSiteLine, SITE_HOST } from './site-line.js'
import { swatchImage } from './swatch.js'
import { createTaskField } from './task.js'
import { pickerLabel } from './task-labels.js'
import { tuneUpGauge } from './tune-up-gauge.js'
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
const MODE_OF = { running: 'timer', expired: 'expired', idle: 'freebasing' }
const expiredLine = (seconds, ranOut) => {
  if (ranOut.count > 0)
    return `Timer ran out ${ranOut.count}× · ${formatWait(seconds)} after it, ${formatWait(ranOut.seconds / ranOut.count)} each`
  return seconds >= 60 ? `After the timer ran out · ${formatDuration(seconds)}` : null
}

const offTheClock = (modes, ranOut) =>
  [
    expiredLine(modes.expired, ranOut),
    modes.freebasing >= 60 ? `Freebasing · ${formatDuration(modes.freebasing)}` : null,
  ].filter(Boolean)
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
  let endTime = null
  let draw = null
  let drawOverLimit = false
  let loadFlash = null
  let flameShowing = false
  let menuOpen = false
  let menuStale = false
  let menuDay = null
  let menuTuneUp = null
  let goalCardShownAt = null
  let batteryItem = null
  let away = false

  const renderTitle = () => {
    const label = state === 'idle' ? '' : task.get()
    const shown = state === 'running' ? swatchOf(categories.active().color).paint(status) : status
    tray.setTitle(label ? `${label} · ${shown}` : shown, { fontType: 'monospacedDigit' })
  }

  const segmentDetails = (mode = MODE_OF[state]) => ({
    mode,
    category: categories.active(),
    task: task.get(),
    plannedMinutes: mode === 'freebasing' ? null : sessionMinutes,
  })

  const openSegment = (mode) => {
    if (!away) focusLog.begin(segmentDetails(mode))
  }

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
    openSegment()
  }

  const shownDraw = () => (chargerPlaces.isMarked() ? null : draw)

  const renderSlot = () => {
    const watts = shownDraw()
    tray.setImage(watts !== null && flameShowing ? readout.flame : readout.reading(watts))
  }

  const updateLoadFlash = () => {
    if (drawOverLimit && shownDraw() !== null) {
      loadFlash ??= setInterval(() => {
        flameShowing = !flameShowing
        renderSlot()
      }, FLASH_MS)
      return
    }
    clearInterval(loadFlash)
    loadFlash = null
    flameShowing = false
  }

  const renderPowerDraw = () => {
    updateLoadFlash()
    renderSlot()
  }

  const setPowerSample = (watts, overLimit, sample) => {
    draw = watts
    drawOverLimit = overLimit
    renderPowerDraw()

    const battery = batteryMenuItem(sample)
    if (battery?.label !== batteryItem?.label) {
      batteryItem = battery
      renderMenu()
    }
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
    bridge.publish()
  }

  const secondsLeft = () => Math.max(0, Math.round((endTime - Date.now()) / 1000))

  const snapshot = () => ({
    state,
    label: task.get(),
    labelPending: task.pending(),
    minutes: state === 'idle' && !task.pending() ? null : sessionMinutes,
    remaining: state === 'running' ? secondsLeft() : null,
    durations: DURATIONS.map(({ minutes }) => minutes),
    hints: DURATIONS.map(({ hint }) => hint),
  })

  const resetTimer = (minutes) => {
    clearInterval(interval)
    sessionMinutes = minutes
    focusLog.end(state === 'idle' ? 'started' : 'restarted')
    openSegment('timer')

    endTime = Date.now() + minutes * 60 * 1000

    const updateTimer = () => {
      const timeLeft = secondsLeft()

      if (timeLeft <= 0) {
        clearInterval(interval)
        focusLog.end('completed')
        openSegment('expired')
        status = "Time's up!"
        setState('expired')
        interval = flashMenuBar()
        popUpOnExpiry()
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
    sessionMinutes = minutes
    task.prompt(() => resetTimer(minutes))
    renderMenu()
    bridge.publish()
  }

  const switchCategory = (id) => {
    const starting = task.pending()
    categories.activate(id)
    if (starting) {
      task.cancelPending()
      startSession(sessionMinutes)
      return
    }
    if (state === 'running' && !task.get()) task.prompt()
  }

  const stopTimer = () => {
    task.cancelPending()
    if (state === 'idle') return
    clearInterval(interval)
    interval = null
    focusLog.end('stopped')
    openSegment('freebasing')
    status = IDLE_STATUS
    setState('idle')
  }

  const refreshStaleMenu = () => {
    const stale =
      focusLog.current() !== null ||
      menuDay !== periods(new Date())[0].from ||
      menuTuneUp !== coach.tuneUpTiming().label
    if (stale) renderMenu()
  }

  const standing = (now) => recentStanding(categories.all(), focusLog.segments(now), now.getTime())

  const offerSwitch = () => {
    const now = new Date()
    const current = standing(now)
    const suggestion = nudge({
      standing: current,
      activeId: categories.active().id,
      shownAt: goalCardShownAt,
      now: now.getTime(),
    })
    if (!suggestion) return null
    goalCardShownAt = now.getTime()
    log(`goal nudge: ${suggestion.behind.name} is behind while working on ${suggestion.active.name}`)
    const card = goalCard({ ...suggestion, rows: current.rows, total: current.total })
    coach.alert(card)
    return card
  }

  const popUpOnExpiry = () => {
    if (away) return
    const card = offerSwitch() ?? coach.timerExpired()
    if (card) focusLog.note({ popup: { kind: card.kind ?? 'tip', title: card.title } })
  }

  const pickerCategories = (now) => {
    const current = standing(now)
    const shown = tracked(categories.all())
    const active = categories.active()
    const ordered = pickOrder(current, shown)
    const listed = shown.some(({ id }) => id === active.id) ? ordered : [...ordered, active]
    const rowOf = new Map(current.rows.map((row) => [row.id, row]))
    return listed.map((category) => ({
      category,
      standing: current.enough && rowOf.has(category.id) ? standingText(rowOf.get(category.id)) : null,
    }))
  }

  const goalRow = (row, withStanding) => {
    const live = categories.all().find(({ id }) => id === row.id)
    return {
      label: pickerLabel(
        live?.name ?? row.name,
        withStanding ? standingText(row) : null,
        `${formatShare(row.actual)} of ${formatShare(row.goal)}`,
      ),
      icon: swatchImage(swatchOf(live?.color ?? row.color).hex),
      enabled: false,
    }
  }

  const shortDate = (at) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  const goalMenu = (now) => {
    const { rows, total, enough } = standing(now)
    if (rows.length === 0) return [{ label: 'No goals set', enabled: false }]
    const header = enough
      ? `Goals, last ${GOAL_RULES.windowDays} days · ${formatDuration(total)}`
      : `Goals, last ${GOAL_RULES.windowDays} days · ${formatDuration(total)} of the ${GOAL_RULES.enoughHours}h needed to judge`
    return [{ label: header, enabled: false }, ...rows.map((row) => goalRow(row, enough))]
  }

  const goalPeriodsMenu = (now) => {
    const reviews = periodReviews(categories.periods(), focusLog.segments(now), now.getTime())
    if (reviews.length === 0) return [{ label: 'Nothing timed in any goal period yet', enabled: false }]
    return reviews.flatMap((review, index) => [
      ...(index > 0 ? [{ type: 'separator' }] : []),
      {
        label: `${shortDate(review.from)} to ${review.to === now.getTime() ? 'now' : shortDate(review.to)} · ${formatDuration(review.total)}`,
        enabled: false,
      },
      ...review.rows.map((row) => goalRow(row, review.enough)),
    ])
  }

  const focusMenu = (now) => {
    const segments = focusLog.segments(now)
    return [
      ...goalMenu(now),
      { type: 'separator' },
      ...periods(now).flatMap(({ label, from }, index) => {
        const { total, rows } = splitByCategory(segments, from, now.getTime(), categories.all())
        const modes = splitByMode(segments, from, now.getTime())
        return [
          ...(index > 0 ? [{ type: 'separator' }] : []),
          { label: total >= 60 ? `${label} · ${formatDuration(total)}` : `${label} · nothing yet`, enabled: false },
          ...rows.map((row) => ({
            label: `${row.name} · ${formatDuration(row.seconds)} · ${formatShare(row.share)}`,
            icon: swatchImage(swatchOf(row.color).hex),
            enabled: false,
          })),
          ...offTheClock(modes, expiries(segments, from, now.getTime())).map((label) => ({ label, enabled: false })),
        ]
      }),
      { type: 'separator' },
      { label: 'Goal periods', submenu: goalPeriodsMenu(now) },
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
    const tuneUp = coach.tuneUpTiming()
    menuTuneUp = tuneUp.label
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
      ...pickerCategories(now).map(({ category, standing: where }) => ({
        label: pickerLabel(category.name, where, task.of(category.id)),
        type: 'radio',
        checked: category.id === categories.active().id,
        icon: swatchImage(swatchOf(category.color).hex),
        click: () => switchCategory(category.id),
      })),
      { label: 'Edit categories…', click: () => categories.edit() },
      { label: 'Focus time', submenu: focusMenu(now) },
      { type: 'separator' },
      ...(batteryItem ? [batteryItem] : []),
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
      {
        label: bridge.phones() > 0 ? 'Pebble: connected' : `Pebble: pairing code ${bridge.code}`,
        enabled: false,
      },
      { label: 'Show a card now', click: () => coach.showCardNow() },
      { label: 'Notes and ideas…', click: () => ideas.edit() },
      {
        label: `Tune up the coach… · ${tuneUp.label}`,
        icon: tuneUpGauge(tuneUp.daysElapsed),
        click: () => coach.tuneUp(),
      },
      { label: 'Quiz me…', click: () => coach.quiz() },
      { label: 'Read the book…', click: () => reader.show() },
      {
        label: `Beacon: ${BEACON_PRESETS.find(({ id }) => id === beacon.get()).name}`,
        submenu: BEACON_PRESETS.map(({ id, name }) => ({
          label: name,
          type: 'radio',
          checked: beacon.get() === id,
          click: () => beacon.set(id),
        })),
      },
      {
        label: `Include ${SITE_HOST} in copies`,
        type: 'checkbox',
        checked: siteLine.isEnabled(),
        click: () => siteLine.set(!siteLine.isEnabled()),
      },
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
      {
        label: 'Show Quit in menu',
        type: 'checkbox',
        checked: settings.get('showQuit'),
        click: () => {
          settings.set('showQuit', !settings.get('showQuit'))
          renderMenu()
        },
      },
      ...(settings.get('showQuit') ? [{ role: 'quit' }] : []),
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

  const settings = createSettings()
  const focusLog = createFocusLog()
  focusLog.recover()
  app.on('before-quit', () => focusLog.end('quit'))

  const refresh = () => {
    resegment()
    renderTitle()
    renderMenu()
    bridge.publish()
  }
  const categories = createCategories(refresh)
  const task = createTaskField(refresh, categories.active)
  openSegment()
  const stepAway = (reason) => {
    away = true
    focusLog.end(reason)
  }
  const comeBack = () => {
    away = false
    openSegment()
  }
  powerMonitor.on('suspend', () => stepAway('asleep'))
  powerMonitor.on('lock-screen', () => stepAway('locked'))
  powerMonitor.on('resume', comeBack)
  powerMonitor.on('unlock-screen', comeBack)
  const beacon = createBeaconPreset((id) => {
    coach.setBeacon(id)
    renderMenu()
  })
  const siteLine = createSiteLine(() => {
    coach.setSiteLine(siteLine.text())
    renderMenu()
  })
  const bridge = createBridge({
    snapshot,
    start: startSession,
    stop: stopTimer,
    setLabel: (label) => task.set(label),
    onPhonesChanged: () => renderMenu(),
  })
  app.on('will-quit', () => bridge.stop())
  const library = createLibrary()
  const ideas = createIdeas()
  const coach = createCoach(() => state, library, ideas.file, beacon.get, siteLine.text)
  const reader = createReader(library, () => coach.edition())
  const chargerPlaces = createChargerPlaces(() => {
    renderMenu()
    renderPowerDraw()
  })
  const powerWatch = createPowerWatch((card) => coach.alert(card), setPowerSample, chargerPlaces.shouldAlert)

  const readout = createReadout()
  const tray = new Tray(readout.reading(null))
  renderTitle()
  renderMenu()
  coach.start()
  chargerPlaces.start()
  powerWatch.start()
  powerMonitor.on('on-ac', () => {
    log('charger connected')
    coach.dropAlert('power')
    powerWatch.chargerArrived()
  })
  await bridge.start()
  setInterval(refreshStaleMenu, MENU_REFRESH_MS)
  log(`ready, start at login ${loginItem.isEnabled()}`)
  await loginItem.offerOnFirstRun()
  renderMenu()
})()
