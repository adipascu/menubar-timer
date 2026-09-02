import { app } from 'electron'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const instanceFile = () => join(app.getPath('userData'), 'instance.json')

const commandOf = (pid) => {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const previousInstance = () => {
  const file = instanceFile()
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const stillRunning = ({ pid, execPath }) => pid !== process.pid && commandOf(pid).startsWith(execPath)

export const claim = () => {
  const previous = previousInstance()

  if (previous?.pid && previous.execPath && stillRunning(previous)) {
    try {
      process.kill(previous.pid)
      log(`replaced the instance running as pid ${previous.pid} from ${previous.execPath}`)
    } catch (error) {
      log(`could not replace pid ${previous.pid}: ${error.message}`)
    }
  }

  writeFileSync(instanceFile(), JSON.stringify({ pid: process.pid, execPath: process.execPath }))
}
