import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

export const SITE_HOST = 'timerbar.pascu.be'

export const createSiteLine = (onChange = () => {}) => {
  const file = join(app.getPath('userData'), 'site-line.json')

  const read = () => {
    if (!existsSync(file)) return true
    try {
      return JSON.parse(readFileSync(file, 'utf8')).enabled !== false
    } catch {
      return true
    }
  }

  let enabled = read()

  return {
    isEnabled: () => enabled,
    text: () => (enabled ? SITE_HOST : null),
    set: (next) => {
      if (next === enabled) return
      enabled = next
      writeFileSync(file, JSON.stringify({ enabled }))
      log(`site line in copies set to ${enabled}`)
      onChange()
    },
  }
}
