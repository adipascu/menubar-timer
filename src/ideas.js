import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fitToContent, resizedByHand, showOnCurrentSpace } from './fitted-window.js'
import { log } from './log.js'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_WIDTH = 520
const MINIMUM_HEIGHT = 240

const isNote = (note) => typeof note?.text === 'string'

const isWritten = (note) => note.text.trim().length > 0

const readNotes = (file) => {
  try {
    const notes = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(notes) && notes.every(isNote) ? notes.filter(isWritten) : null
  } catch {
    return null
  }
}

const keepUnreadable = (file) => {
  const kept = `${file}.${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.unreadable`
  try {
    renameSync(file, kept)
    log(`could not read the notes and ideas, kept them at ${kept} and started an empty list`)
  } catch (error) {
    log(`could not read the notes and ideas, and could not set them aside either: ${error.message}`)
  }
}

const stored = (file) => {
  if (!existsSync(file)) return []
  const notes = readNotes(file)
  if (notes) return notes
  keepUnreadable(file)
  return []
}

export const createIdeas = () => {
  const file = join(app.getPath('userData'), 'ideas.json')
  let window = null
  let handSized = () => false

  const close = () => {
    if (window && !window.isDestroyed()) window.close()
    window = null
  }

  const replace = (next) => {
    const writtenAt = new Date().toISOString()
    const notes = (Array.isArray(next) ? next : [])
      .map(({ text, at }) => ({ text: String(text ?? '').trim(), at: typeof at === 'string' ? at : writtenAt }))
      .filter(({ text }) => text)
    writeFileSync(file, JSON.stringify(notes, null, 2))
    log(`notes and ideas saved, ${notes.length} on file`)
  }

  ipcMain.on('ideas:save', (_event, next) => {
    replace(next)
    close()
  })

  ipcMain.on('ideas:cancel', () => close())

  ipcMain.on('ideas:height', (event, height) => {
    const sender = BrowserWindow.fromWebContents(event.sender)
    if (!sender || sender.isDestroyed() || sender !== window || handSized()) return
    fitToContent(sender, height)
    if (!sender.isVisible()) showOnCurrentSpace(sender)
  })

  return {
    file,
    edit: () => {
      if (window) {
        if (window.isVisible()) showOnCurrentSpace(window)
        return
      }

      window = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: MINIMUM_HEIGHT,
        minWidth: WINDOW_WIDTH,
        minHeight: MINIMUM_HEIGHT,
        show: false,
        fullscreenable: false,
        minimizable: false,
        skipTaskbar: true,
        title: 'Notes and ideas',
        webPreferences: { preload: join(here, 'ideas-preload.cjs') },
      })

      handSized = resizedByHand(window)
      window.on('closed', () => {
        window = null
      })

      const target = window
      target.webContents.on('did-finish-load', () => target.webContents.send('ideas', stored(file)))
      target.loadFile(join(here, 'ideas.html'))
    },
  }
}
