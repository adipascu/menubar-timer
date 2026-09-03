import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const DEFAULTS = { showQuit: true }

const readStored = (file) => {
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    log(`ignoring unreadable ${file}: ${error.message.replace(/\s+/g, ' ')}`)
    return {}
  }
}

export const createSettings = () => {
  const file = join(app.getPath('userData'), 'settings.json')
  const values = { ...DEFAULTS, ...readStored(file) }

  return {
    get: (key) => values[key],
    set: (key, value) => {
      values[key] = value
      writeFileSync(file, JSON.stringify(values, null, 2))
      log(`${key} set to ${value}`)
    },
  }
}
