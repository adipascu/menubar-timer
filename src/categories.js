import { app, BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fitToContent, resizedByHand, showOnCurrentSpace } from './fitted-window.js'
import { GOAL_RULES, orderedByShare } from './goals.js'
import { log } from './log.js'
import { archived, redistributed, restored, shareTotal } from './shares.js'
import { swatchList, swatchOf } from './palette.js'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_WIDTH = 640
const MINIMUM_HEIGHT = 240
const DEFAULTS = [
  { name: 'Work', color: 'blue', share: 50 },
  { name: 'Side project', color: 'magenta', share: 30 },
  { name: 'Life admin', color: 'gray', share: 20 },
]

const wholeShare = (value) => {
  const share = Math.round(Number(value))
  return Number.isFinite(share) ? Math.min(100, Math.max(0, share)) : 0
}

const cleaned = ({ id, name, color, share, archived, archivedShare }) => ({
  id: id || randomUUID(),
  name: String(name ?? '').trim(),
  color: swatchOf(color).key,
  share: archived ? 0 : wholeShare(share),
  ...(archived ? { archived: true, archivedShare: wholeShare(archivedShare) } : {}),
})

const usable = (entries) => {
  const kept = (Array.isArray(entries) ? entries : []).map(cleaned).filter(({ name }) => name)
  return kept.some(({ archived }) => !archived) ? kept : null
}

const RESHARES = { archive: archived, restore: restored, redistribute: redistributed }

const splitOf = (categories) =>
  categories
    .filter(({ share }) => share > 0)
    .map(({ id, share }) => `${id}:${share}`)
    .sort()
    .join(',')

const sameShares = (before, after) => splitOf(before) === splitOf(after)

const unshared = (categories) => {
  log('no goal shares on file, splitting evenly')
  return categories.map((category) => ({ ...category, share: 0 }))
}

const wholeSplit = (categories) => {
  const total = shareTotal(categories)
  if (total === 100) return categories
  const scaled = redistributed(categories)
  log(`shares on file added up to ${total}%, scaled to 100%`)
  return scaled
}

const stored = (file) => {
  if (!existsSync(file)) return null
  try {
    const { categories, active, periods } = JSON.parse(readFileSync(file, 'utf8'))
    const kept = usable(categories)
    if (!kept) return null
    const fromAnEarlierRelease = !Array.isArray(periods)
    return {
      categories: wholeSplit(fromAnEarlierRelease ? unshared(kept) : kept),
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
  let handSized = () => false

  const persist = () => writeFileSync(file, JSON.stringify({ active, periods, categories }, null, 2))

  const live = () => categories.filter(({ archived }) => !archived)
  const activeCategory = () => live().find(({ id }) => id === active) ?? live()[0]

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
    log(
      `categories set to ${categories.map(({ name, color, archived }) => `${name} (${color}${archived ? ', archived' : ''})`).join(', ')}`,
    )
    onChange()
  }

  ipcMain.on('categories:save', (_event, next) => {
    replace(next)
    close()
  })
  ipcMain.on('categories:cancel', () => close())
  ipcMain.handle('categories:reshare', (_event, { action, id, categories: rows }) =>
    Object.hasOwn(RESHARES, action) && Array.isArray(rows) ? RESHARES[action](rows, id) : rows,
  )

  ipcMain.on('categories:height', (event, height) => {
    const sender = BrowserWindow.fromWebContents(event.sender)
    if (!sender || sender.isDestroyed() || sender !== window || handSized()) return
    fitToContent(sender, height)
    if (!sender.isVisible()) showOnCurrentSpace(sender)
  })

  return {
    all: () => categories,
    periods: () => periods,
    active: activeCategory,
    activate: (id) => {
      const next = live().find((category) => category.id === id)
      if (!next) return
      if (next.id !== activeCategory().id) log(`active category changed from ${activeCategory().name} to ${next.name}`)
      active = id
      persist()
      onChange()
    },
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
        title: 'Categories',
        webPreferences: { preload: join(here, 'categories-preload.cjs') },
      })

      handSized = resizedByHand(window)
      window.on('closed', () => {
        window = null
      })

      const target = window
      target.webContents.on('did-finish-load', () => {
        target.webContents.send('categories', {
          categories: orderedByShare(categories),
          active: activeCategory().id,
          palette: swatchList(),
          windowDays: GOAL_RULES.windowDays,
        })
      })
      target.loadFile(join(here, 'categories.html'))
    },
  }
}
