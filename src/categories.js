import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { orderedByShare } from './goals.js'
import { log } from './log.js'
import { swatchList, swatchOf } from './palette.js'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_WIDTH = 560
const DEFAULTS = [
  { name: 'Work', color: 'blue', share: 50 },
  { name: 'Side project', color: 'magenta', share: 30 },
  { name: 'Life admin', color: 'gray', share: 20 },
]

const wholeShare = (value) => {
  const share = Math.round(Number(value))
  return Number.isFinite(share) ? Math.min(100, Math.max(0, share)) : 0
}

const cleaned = ({ id, name, color, share }) => ({
  id: id || randomUUID(),
  name: String(name ?? '').trim(),
  color: swatchOf(color).key,
  share: wholeShare(share),
})

const usable = (entries) => {
  const kept = (Array.isArray(entries) ? entries : []).map(cleaned).filter(({ name }) => name)
  return kept.length > 0 ? kept : null
}

const splitOf = (categories) =>
  categories
    .filter(({ share }) => share > 0)
    .map(({ id, share }) => `${id}:${share}`)
    .sort()
    .join(',')

const sameShares = (before, after) => splitOf(before) === splitOf(after)

const evenlyShared = (categories) => {
  const share = Math.floor(100 / categories.length)
  log(`no goal shares on file, splitting evenly at ${share}% each`)
  return categories.map((category) => ({ ...category, share }))
}

const stored = (file) => {
  if (!existsSync(file)) return null
  try {
    const { categories, active, periods } = JSON.parse(readFileSync(file, 'utf8'))
    const kept = usable(categories)
    if (!kept) return null
    const fromAnEarlierRelease = !Array.isArray(periods)
    return {
      categories: fromAnEarlierRelease ? evenlyShared(kept) : kept,
      active,
      periods: fromAnEarlierRelease ? [] : periods,
    }
  } catch {
    log('categories file unreadable, starting from the defaults')
    return null
  }
}

const openedNow = (categories) => ({
  startedAt: new Date().toISOString(),
  shares: categories.map(({ id, name, share }) => ({ id, name, share })),
})

export const createCategories = (onChange) => {
  const file = join(app.getPath('userData'), 'categories.json')
  const loaded = stored(file)
  let { categories, active, periods } = loaded ?? { categories: DEFAULTS.map(cleaned), active: null, periods: [] }
  let window = null

  const persist = () => writeFileSync(file, JSON.stringify({ active, periods, categories }, null, 2))

  const activeCategory = () => categories.find(({ id }) => id === active) ?? categories[0]

  const opening = periods.length === 0
  if (opening) periods = [openedNow(categories)]
  if (!loaded || opening) persist()

  const close = () => {
    if (window && !window.isDestroyed()) window.close()
    window = null
  }

  const replace = (next) => {
    const kept = usable(next)
    if (!kept) return
    const shifted = !sameShares(categories, kept)
    categories = kept
    active = activeCategory().id
    if (shifted) {
      periods = [...periods, openedNow(categories)]
      log(`goal period opened with ${categories.map(({ name, share }) => `${name} ${share}%`).join(', ')}`)
    }
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
    period: () => periods.at(-1),
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
        target.webContents.send('categories', {
          categories: orderedByShare(categories),
          active: activeCategory().id,
          palette: swatchList(),
          periodStartedAt: periods.at(-1).startedAt,
        })
      })
      target.loadFile(join(here, 'categories.html'))
    },
  }
}
