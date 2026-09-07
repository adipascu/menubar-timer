import { app } from 'electron'
import { appendFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const HEARTBEAT_MS = 15 * 1000

const snapshot = ({ id, name, color }) => ({ id, name, color })

const settle = ({ seen, ...segment }, end, ended) => ({
  ...segment,
  end,
  seconds: Math.round((Date.parse(end) - Date.parse(segment.start)) / 1000),
  ended,
})

const parsed = (text) => {
  try {
    return [JSON.parse(text)]
  } catch {
    return []
  }
}

const readSettled = (file) =>
  existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(parsed) : []

export const createFocusLog = () => {
  const file = join(app.getPath('userData'), 'focus-log.jsonl')
  const openFile = join(app.getPath('userData'), 'focus-open.json')
  const settled = readSettled(file)
  let open = null
  let heartbeat = null

  const append = (segment) => {
    appendFileSync(file, `${JSON.stringify(segment)}\n`)
    settled.push(segment)
  }

  const writeOpen = () => {
    const staging = `${openFile}.saving`
    writeFileSync(staging, JSON.stringify(open))
    renameSync(staging, openFile)
  }

  const touch = () => {
    open = { ...open, seen: new Date().toISOString() }
    writeOpen()
  }

  return {
    file,
    exists: () => existsSync(file),
    current: () => open,
    recover: () => {
      if (!existsSync(openFile)) return
      const [cut] = parsed(readFileSync(openFile, 'utf8'))
      rmSync(openFile, { force: true })
      if (!cut?.start || !cut.seen || !cut.category) {
        log('dropped an unreadable focus marker')
        return
      }
      append(settle(cut, cut.seen, 'lost'))
      log(`recovered a ${cut.category.name} focus segment last seen at ${cut.seen}`)
    },
    begin: ({ category, task, plannedMinutes }) => {
      const start = new Date().toISOString()
      open = { start, seen: start, category: snapshot(category), task, plannedMinutes }
      writeOpen()
      heartbeat = setInterval(touch, HEARTBEAT_MS)
      log(`focus segment started: ${category.name}, ${plannedMinutes} min`)
    },
    end: (ended) => {
      if (!open) return
      clearInterval(heartbeat)
      heartbeat = null
      const segment = settle(open, new Date().toISOString(), ended)
      open = null
      if (!existsSync(openFile)) {
        log(`another instance already closed the ${segment.category.name} segment`)
        return
      }
      append(segment)
      rmSync(openFile, { force: true })
      log(`focus segment ${ended}: ${segment.category.name}, ${segment.seconds} s`)
    },
    segments: (now) => (open ? [...settled, settle(open, now.toISOString(), 'open')] : settled),
  }
}
