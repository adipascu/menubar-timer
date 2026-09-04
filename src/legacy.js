import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { log, logFile } from './log.js'
import { isFirstRun, resetFirstRunOffer } from './login-item.js'

const LEGACY_USER_DATA = 'Timer App'
const LEGACY_LOG = 'TimerBar.log'

const moveIfPresent = (from, to) => {
  if (existsSync(to) || !existsSync(from)) return false
  renameSync(from, to)
  return true
}

const adoptLog = () => {
  const current = logFile()
  for (const suffix of ['', '.1']) moveIfPresent(join(dirname(current), `${LEGACY_LOG}${suffix}`), `${current}${suffix}`)
}

const adoptUserData = () => {
  const userData = app.getPath('userData')
  const legacy = join(dirname(userData), LEGACY_USER_DATA)
  if (!existsSync(legacy) || !isFirstRun()) return
  mkdirSync(userData, { recursive: true })
  for (const entry of readdirSync(legacy)) moveIfPresent(join(legacy, entry), join(userData, entry))
  if (readdirSync(legacy).length === 0) rmdirSync(legacy)
  resetFirstRunOffer()
  log(`user data moved from ${legacy} to ${userData}, start at login will be offered again since the login item of the old bundle does not carry over`)
}

export const adoptLegacyFiles = () => {
  try {
    adoptLog()
    adoptUserData()
  } catch (error) {
    log(`could not adopt the TimerBar files, carrying on without them: ${error.message}`)
  }
}
