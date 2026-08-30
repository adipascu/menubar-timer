import { app, Tray, Menu, nativeImage, } from 'electron'
import ansiStyles from 'ansi-styles';
import { createCoach } from './coach.js'
import { createTaskField } from './task.js'
import { log } from './log.js'
import * as loginItem from './login-item.js'

const IDLE_STATUS = '⏱'
const DURATIONS = [5, 10, 15, 20]
const DEFAULT_DURATION = 20

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
  let sessionMinutes = DEFAULT_DURATION

  const renderTitle = () => {
    const label = task.get()
    tray.setTitle(label ? `${label} · ${status}` : status)
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

  const resetTimer = (duration) => {
    clearInterval(interval);

    const endTime = Date.now() + duration * 1000;

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
    sessionMinutes = minutes
    if (task.get()) resetTimer(minutes * 60)
    else task.prompt(() => resetTimer(minutes * 60))
  }

  const stopTimer = () => {
    clearInterval(interval)
    interval = null
    setStatus(IDLE_STATUS)
    setState('idle')
  }

  const toggleFlowMode = () => {
    if (state === 'idle') startSession(sessionMinutes)
    else stopTimer()
  }

  const renderMenu = () => {
    const label = task.get()
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: label ? `Working on: ${label}` : 'Set what you are working on…', click: () => task.prompt() },
      { type: 'separator' },
      { label: 'Flow mode', type: 'checkbox', checked: state !== 'idle', click: toggleFlowMode },
      ...DURATIONS.map((minutes) => ({
        label: `${minutes} minutes`,
        click: () => startSession(minutes),
      })),
      { type: 'separator' },
      { label: 'Stop timer', enabled: state !== 'idle', click: stopTimer },
      {
        label: state === 'running' ? 'SaaS tips: paused during flow' : 'SaaS tips: on',
        enabled: false,
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
      { role: 'quit' },
    ]))
  }

  await app.whenReady()

  if (loginItem.handleCommandLine()) {
    app.exit(0)
    return
  }

  app.dock?.hide()

  const task = createTaskField(() => {
    renderTitle()
    renderMenu()
  })
  const coach = createCoach(() => state)

  const tray = new Tray(nativeImage.createEmpty())
  renderTitle()
  renderMenu()
  coach.start()
  log(`ready, start at login ${loginItem.isEnabled()}`)
  await loginItem.offerOnFirstRun()
  renderMenu()
})()
