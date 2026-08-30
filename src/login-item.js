import { app, dialog } from 'electron'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const FLAGS = ['--enable-login-item', '--disable-login-item', '--status']

export const isEnabled = () => app.getLoginItemSettings().openAtLogin

export const setEnabled = (enabled) => {
  if (!app.isPackaged) {
    log(`refused to set start at login from a source run, which would register ${app.getPath('exe')}`)
    return
  }
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true })
  log(`start at login set to ${enabled}, system reports ${isEnabled()}`)
}

export const offerOnFirstRun = async () => {
  const marker = join(app.getPath('userData'), 'first-run.json')
  if (existsSync(marker)) return

  writeFileSync(marker, JSON.stringify({ shownAt: new Date().toISOString() }))
  const { response } = await dialog.showMessageBox({
    type: 'question',
    message: 'Start TimerBar at login?',
    detail: 'TimerBar lives in the menu bar and only coaches you when the timer is off. Starting it at login is the recommended setup.',
    buttons: ['Start at login', 'Not now'],
    defaultId: 0,
    cancelId: 1,
  })

  if (response === 0) setEnabled(true)
  else log('start at login declined at first run')
}

export const handleCommandLine = () => {
  const flag = process.argv.find((argument) => FLAGS.includes(argument))
  if (!flag) return false

  if (flag === '--enable-login-item') setEnabled(true)
  if (flag === '--disable-login-item') setEnabled(false)

  process.stdout.write(`start at login: ${isEnabled() ? 'enabled' : 'disabled'}\n`)
  return true
}
