import { app, Tray, Menu } from 'electron'
import ansiStyles from 'ansi-styles';
import { createChargerPlaces } from './charger-places.js'
import { createCoach } from './coach.js'
import { createPowerWatch } from './power.js'
import { createReadout } from './readout.js'
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
const FLASH_MS = 500

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

app.setName('Timer App');
app.on('window-all-closed', () => {});

(async () => {
  let interval = null
  let state = 'idle'
  let status = IDLE_STATUS
  let sessionMinutes = null
  let reading = null
  let loadFlash = null
  let flameShowing = false

  const renderTitle = () => {
    const label = task.get()
    tray.setTitle(label ? `${label} · ${status}` : status, { fontType: 'monospacedDigit' })
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
    let isGreen = true;
    return setInterval(() => {
      if (isGreen) {
        setStatus(`${ansiStyles.bgGreen.open}Time's up!${ansiStyles.bgGreen.close}`);
      } else {
        setStatus("Time's up!");
      }
      isGreen = !isGreen;
    }, 500);
  };

  const setState = (next) => {
    log(`state ${state} to ${next}, tips ${next === 'running' ? 'paused' : 'on'}`)
    state = next
    coach.refresh()
    renderMenu()
  }

  const resetTimer = (minutes) => {
    clearInterval(interval);
    sessionMinutes = minutes

    const endTime = Date.now() + minutes * 60 * 1000;

    const updateTimer = () => {
      const currentTime = Date.now();
      const timeLeft = Math.max(0, Math.round((endTime - currentTime) / 1000));

      if (timeLeft <= 0) {
        clearInterval(interval);
        setStatus("Time's up!");
        interval = flashMenuBar();
        setState('expired');
      } else {
        setStatus(formatTime(timeLeft));
      }
    };

    setState('running');
    updateTimer();
    interval = setInterval(updateTimer, 1000);
  };

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
    setStatus(IDLE_STATUS)
    setState('idle')
  }

  const renderMenu = () => {
    const label = task.get()
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: label ? `Working on: ${label}` : 'Set what you are working on…', click: () => task.prompt() },
      { type: 'separator' },
      { label: FREEBASING, type: 'radio', checked: state === 'idle', click: stopTimer },
      ...DURATIONS.map(({ minutes, hint }) => ({
        label: `${minutes} min · ${hint}`,
        type: 'radio',
        checked: state !== 'idle' && minutes === sessionMinutes,
        click: () => startSession(minutes),
      })),
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
    ]))
  }

  await app.whenReady()

  if (loginItem.handleCommandLine()) {
    app.exit(0)
    return
  }

  singleInstance.claim()
  app.dock?.hide()

  const task = createTaskField(() => {
    renderTitle()
    renderMenu()
  })
  const coach = createCoach(() => state)
  const chargerPlaces = createChargerPlaces(() => renderMenu())
  const powerWatch = createPowerWatch((card) => coach.alert(card), setPowerDraw, chargerPlaces.shouldAlert)

  const readout = createReadout()
  const tray = new Tray(readout.reading(null))
  renderTitle()
  renderMenu()
  coach.start()
  chargerPlaces.start()
  powerWatch.start()
  log(`ready, start at login ${loginItem.isEnabled()}`)
  await loginItem.offerOnFirstRun()
  renderMenu()
})()
