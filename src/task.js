import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fitToContent, showOnCurrentSpace } from './fitted-window.js'
import { log } from './log.js'
import { storedLabels, withLabel } from './task-labels.js'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_WIDTH = 480

export const createTaskField = (onChange, activeCategory) => {
  const file = join(app.getPath('userData'), 'task.json')
  const stored = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  let labels = storedLabels(stored, activeCategory().id)
  let drafts = {}
  let window = null
  let onLabelled = null
  let promptedFor = null
  let promptedName = null

  const labelOf = (categoryId) => labels[categoryId] ?? ''
  const persist = () => writeFileSync(file, JSON.stringify({ labels }))
  if (stored && !stored.labels) persist()

  const close = () => {
    if (window && !window.isDestroyed()) window.close()
    window = null
    onLabelled = null
    promptedFor = null
    promptedName = null
    onChange()
  }

  const discard = () => {
    if (promptedFor) drafts = withLabel(drafts, promptedFor, '')
    close()
  }

  const store = (categoryId, categoryName, next) => {
    const before = labelOf(categoryId)
    labels = withLabel(labels, categoryId, next)
    persist()
    const after = labelOf(categoryId)
    if (after !== before) log(`label for ${categoryName} changed from "${before}" to "${after}"`)
    if (categoryId !== promptedFor) {
      onChange()
      return
    }
    const continuation = labelOf(categoryId) ? onLabelled : null
    if (continuation) continuation()
    discard()
  }

  const fromPrompt = (event) => window !== null && !window.isDestroyed() && event.sender === window.webContents

  ipcMain.on('task:save', (event, next) => {
    if (fromPrompt(event)) store(promptedFor, promptedName, next)
  })
  ipcMain.on('task:cancel', (event) => {
    if (fromPrompt(event)) discard()
  })
  ipcMain.on('task:height', (event, height) => {
    if (!fromPrompt(event)) return
    fitToContent(window, height)
    if (!window.isVisible()) showOnCurrentSpace(window)
  })
  ipcMain.on('task:draft', (event, next) => {
    if (fromPrompt(event)) drafts = { ...drafts, [promptedFor]: next }
  })

  return {
    get: () => labelOf(activeCategory().id),
    of: labelOf,
    set: (next) => {
      const { id, name } = activeCategory()
      store(id, name, next)
    },
    pending: () => onLabelled !== null,
    cancelPending: () => {
      if (onLabelled) close()
    },
    prompt: (onSaved) => {
      onLabelled = onSaved ?? null
      const category = activeCategory()
      if (window && promptedFor === category.id) {
        if (window.isVisible()) showOnCurrentSpace(window)
        return
      }
      const replaced = window
      window = null
      if (replaced && !replaced.isDestroyed()) replaced.close()
      promptedFor = category.id
      promptedName = category.name

      const opened = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: 140,
        show: false,
        resizable: false,
        fullscreenable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        webPreferences: { preload: join(here, 'task-preload.cjs') },
      })
      window = opened
      const isCurrent = () => window === opened

      opened.on('closed', () => {
        if (isCurrent()) close()
      })
      opened.on('blur', () => {
        if (isCurrent()) close()
      })

      opened.webContents.on('did-finish-load', () => {
        if (!isCurrent()) return
        opened.webContents.send('label', labelOf(category.id), drafts[category.id] ?? null, category.name)
      })

      opened.loadFile(join(here, 'task.html'))
    },
  }
}
