import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_WIDTH = 480
const WINDOW_HEIGHT = 148

export const createTaskField = (onChange) => {
  const file = join(app.getPath('userData'), 'task.json')
  let label = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).label : ''
  let draft = null
  let window = null
  let onLabelled = null

  const close = () => {
    if (window && !window.isDestroyed()) window.close()
    window = null
    onLabelled = null
  }

  const discard = () => {
    draft = null
    close()
  }

  const store = (next) => {
    label = next.trim()
    writeFileSync(file, JSON.stringify({ label }))
    onChange()
    const continuation = label ? onLabelled : null
    discard()
    if (continuation) continuation()
  }

  ipcMain.on('task:save', (_event, next) => store(next))
  ipcMain.on('task:cancel', () => discard())
  ipcMain.on('task:draft', (_event, next) => {
    draft = next
  })

  return {
    get: () => label,
    cancelPending: () => {
      if (onLabelled) close()
    },
    prompt: (onSaved) => {
      onLabelled = onSaved ?? null
      if (window) {
        window.focus()
        return
      }

      const { workArea } = screen.getPrimaryDisplay()
      const opened = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        x: Math.round(workArea.x + (workArea.width - WINDOW_WIDTH) / 2),
        y: workArea.y + 90,
        show: false,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: false,
        webPreferences: { preload: join(here, 'task-preload.cjs') },
      })
      window = opened
      const isCurrent = () => window === opened

      opened.on('closed', () => {
        if (isCurrent()) window = null
      })
      opened.on('blur', () => {
        if (isCurrent()) close()
      })

      opened.webContents.on('did-finish-load', () => {
        if (!isCurrent()) return
        opened.webContents.send('label', label, draft)
        app.focus({ steal: true })
        opened.show()
      })

      opened.loadFile(join(here, 'task.html'))
    },
  }
}
