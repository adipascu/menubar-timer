import { app } from 'electron'
import { appendFileSync, existsSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAX_BYTES = 1024 * 1024

const logFile = () => join(app.getPath('home'), 'Library', 'Logs', 'TimerBar.log')

export const log = (message) => {
  const path = logFile()
  if (existsSync(path) && statSync(path).size > MAX_BYTES) renameSync(path, `${path}.1`)
  appendFileSync(path, `${new Date().toISOString()} ${message}\n`)
}
