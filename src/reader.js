import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { log } from './log.js'

const here = dirname(fileURLToPath(import.meta.url))

const WINDOW_SIZE = { width: 800, height: 700, minWidth: 560, minHeight: 440 }
const BACKGROUND = { light: '#fffdf3', dark: '#23211c' }

export const createReader = (library, writeEdition) => {
  let window = null

  const open = (wanted) => {
    const shelf = library.books()
    const chosen = shelf.find(({ edition }) => edition === wanted) ?? shelf.at(-1)
    return {
      shelf,
      edition: chosen?.edition,
      book: chosen ? library.book(chosen.edition) : null,
      notes: chosen ? library.notes(chosen.edition) : {},
      finished: chosen ? library.finished(chosen.edition) : [],
    }
  }

  ipcMain.handle('reader:open', (_event, edition) => open(edition))

  ipcMain.handle('reader:note', (_event, edition, section, patch) => {
    log(`noted section ${section} of edition ${edition}: ${JSON.stringify(patch)}`)
    return library.saveNote(edition, section, patch)
  })

  ipcMain.on('reader:finished', (_event, edition, chapter) => {
    library.markFinished(edition, chapter)
    log(`finished chapter ${chapter} of edition ${edition}`)
  })

  ipcMain.on('reader:write', () => writeEdition())

  ipcMain.on('reader:open-source', (_event, url) => {
    if (/^https?:\/\//.test(String(url))) shell.openExternal(url)
  })

  return {
    show: () => {
      if (window) {
        if (window.isMinimized()) window.restore()
        window.focus()
        app.focus({ steal: true })
        return
      }

      window = new BrowserWindow({
        ...WINDOW_SIZE,
        show: false,
        title: 'The book',
        titleBarStyle: 'hiddenInset',
        backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
        webPreferences: { preload: join(here, 'reader-preload.cjs') },
      })

      window.on('closed', () => {
        window = null
      })

      const target = window
      target.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      target.webContents.on('will-navigate', (event) => event.preventDefault())
      target.on('focus', () => target.webContents.send('reader:refresh'))
      target.once('ready-to-show', () => {
        app.focus({ steal: true })
        target.show()
      })
      target.loadFile(join(here, 'reader.html'))
    },
  }
}
