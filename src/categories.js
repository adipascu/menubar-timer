import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { log } from './log.js'
import { swatchList, swatchOf } from './palette.js'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_WIDTH = 520
const DEFAULTS = [
  { name: 'Work', color: 'blue' },
  { name: 'Side project', color: 'magenta' },
  { name: 'Life admin', color: 'gray' },
]

const cleaned = ({ id, name, color }) => ({ id: id || randomUUID(), name: String(name ?? '').trim(), color: swatchOf(color).key })

const usable = (entries) => {
  const kept = (Array.isArray(entries) ? entries : []).map(cleaned).filter(({ name }) => name)
  return kept.length > 0 ? kept : null
}

const stored = (file) => {
  if (!existsSync(file)) return null
  try {
    const { categories, active } = JSON.parse(readFileSync(file, 'utf8'))
    const kept = usable(categories)
    return kept && { categories: kept, active }
  } catch {
    log('categories file unreadable, starting from the defaults')
    return null
  }
}

export const createCategories = (onChange) => {
  const file = join(app.getPath('userData'), 'categories.json')
  const loaded = stored(file)
  let { categories, active } = loaded ?? { categories: DEFAULTS.map(cleaned), active: null }
  let window = null

  const persist = () => writeFileSync(file, JSON.stringify({ active, categories }, null, 2))

  const activeCategory = () => categories.find(({ id }) => id === active) ?? categories[0]

  if (!loaded) persist()

  const close = () => {
    if (window && !window.isDestroyed()) window.close()
    window = null
  }

  const replace = (next) => {
    const kept = usable(next)
    if (!kept) return
    categories = kept
    active = activeCategory().id
    persist()
    log(`categories set to ${categories.map(({ name, color }) => `${name} (${color})`).join(', ')}`)
    onChange()
  }

  ipcMain.on('categories:save', (_event, next) => {
    replace(next)
    close()
  })
  ipcMain.on('categories:cancel', () => close())
  ipcMain.on('categories:height', (event, height) => {
    const sender = BrowserWindow.fromWebContents(event.sender)
    if (!sender || sender.isDestroyed()) return
    sender.setContentSize(WINDOW_WIDTH, Math.round(height))
    if (sender.isVisible()) return
    app.focus({ steal: true })
    sender.show()
  })

  return {
    all: () => categories,
    active: activeCategory,
    activate: (id) => {
      if (!categories.some((category) => category.id === id)) return
      active = id
      persist()
      onChange()
    },
    edit: () => {
      if (window) {
        window.focus()
        app.focus({ steal: true })
        return
      }

      const { workArea } = screen.getPrimaryDisplay()
      window = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: 200,
        x: Math.round(workArea.x + (workArea.width - WINDOW_WIDTH) / 2),
        y: workArea.y + 90,
        show: false,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        title: 'Categories',
        webPreferences: { preload: join(here, 'categories-preload.cjs') },
      })

      window.on('closed', () => {
        window = null
      })

      const target = window
      target.webContents.on('did-finish-load', () => {
        target.webContents.send('categories', { categories, active: activeCategory().id, palette: swatchList() })
      })
      target.loadFile(join(here, 'categories.html'))
    },
  }
}
