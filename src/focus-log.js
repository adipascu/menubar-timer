import { app } from 'electron'
import { appendFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const HEARTBEAT_MS = 15 * 1000

const snapshot = ({ id, name, color }) => ({ id, name, color })

const settle = ({ seen, pid, ...segment }, end, ended) => ({
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

  const ownsMarker = () => existsSync(openFile) && parsed(readFileSync(openFile, 'utf8'))[0]?.pid === process.pid

  const letGo = (why) => {
    clearInterval(heartbeat)
    heartbeat = null
    log(`${why}, leaving the ${open.mode} segment in ${open.category.name} to it`)
    open = null
  }

  const touch = () => {
    if (!ownsMarker()) {
      letGo('another instance took over the focus marker')
      return
    }
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
      log(`recovered a ${cut.mode ?? 'timer'} segment in ${cut.category.name} last seen at ${cut.seen}`)
    },
    begin: ({ mode, category, task, plannedMinutes }) => {
      if (open) return
      const start = new Date().toISOString()
      open = { start, seen: start, pid: process.pid, mode, category: snapshot(category), task, plannedMinutes }
      writeOpen()
      heartbeat = setInterval(touch, HEARTBEAT_MS)
      log(
        `${mode} segment started: ${category.name}, "${task}"${plannedMinutes ? `, ${plannedMinutes} min timer` : ''}`,
      )
    },
    end: (ended, at = Date.now()) => {
      if (!open) return
      if (!ownsMarker()) {
        letGo('another instance already closed this segment')
        return
      }
      clearInterval(heartbeat)
      heartbeat = null
      const segment = settle(open, new Date(Math.max(at, Date.parse(open.start))).toISOString(), ended)
      open = null
      append(segment)
      rmSync(openFile, { force: true })
      log(`${segment.mode} segment ${ended}: ${segment.category.name}, "${segment.task}", ${segment.seconds} s`)
    },
    note: (fields) => {
      if (!open || !ownsMarker()) return
      open = { ...open, ...fields }
      writeOpen()
    },
    segments: (now) => (open ? [...settled, settle(open, now.toISOString(), 'open')] : settled),
  }
}
