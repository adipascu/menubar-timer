import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const EDITION_FILE = /^(cards|book)-(\d{4})\.json$/

const readJson = (file, fallback) => {
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const isBook = (book) => typeof book?.title === 'string' && Array.isArray(book.chapters)

const isTitled = (entry) => isRecord(entry) && typeof entry.title === 'string'

const normalisedBook = (book) => ({
  ...book,
  chapters: book.chapters.filter(isTitled).map((chapter) => ({
    ...chapter,
    sections: (Array.isArray(chapter.sections) ? chapter.sections : []).filter(isRecord),
  })),
})

export const createLibrary = () => {
  const dir = join(app.getPath('userData'), 'library')
  mkdirSync(dir, { recursive: true })

  const file = (kind, edition) => join(dir, `${kind}-${String(edition).padStart(4, '0')}.json`)

  const editionsOf = (kind) =>
    readdirSync(dir)
      .map((name) => EDITION_FILE.exec(name))
      .filter((match) => match?.[1] === kind)
      .map((match) => Number(match[2]))
      .sort((a, b) => a - b)

  const latestOf = (kind) => editionsOf(kind).at(-1) ?? null

  const legacyCards = join(app.getPath('userData'), 'tips-personal.json')
  if (existsSync(legacyCards) && latestOf('cards') === null) {
    renameSync(legacyCards, file('cards', 1))
    log('moved tips-personal.json into the library as cards-0001.json')
  }

  const latestCardsFile = () => {
    const edition = latestOf('cards')
    return edition === null ? null : file('cards', edition)
  }

  const finishedChapters = (edition) => {
    const { finished } = readJson(file('reading', edition), {})
    return Array.isArray(finished) ? finished : []
  }

  let reserved = 0

  return {
    dir,
    latestCardsFile,
    cards: () => {
      const latest = latestCardsFile()
      const cards = latest === null ? [] : readJson(latest, [])
      return Array.isArray(cards) ? cards.filter(isTitled) : []
    },
    cardsWrittenAt: () => {
      const latest = latestCardsFile()
      return latest === null ? null : statSync(latest).mtimeMs
    },
    nextEdition: () => {
      reserved = Math.max(reserved, latestOf('cards') ?? 0, latestOf('book') ?? 0) + 1
      return { cardsFile: file('cards', reserved), bookFile: file('book', reserved) }
    },
    books: () =>
      editionsOf('book')
        .filter((edition) => isBook(readJson(file('book', edition), null)))
        .map((edition) => ({ edition, writtenAt: statSync(file('book', edition)).mtimeMs })),
    book: (edition) => {
      const book = readJson(file('book', edition), null)
      return isBook(book) ? normalisedBook(book) : null
    },
    notes: (edition) => readJson(file('notes', edition), {}),
    finished: finishedChapters,
    markFinished: (edition, chapter) => {
      const finished = [...new Set([...finishedChapters(edition), chapter])].sort((a, b) => a - b)
      writeFileSync(file('reading', edition), JSON.stringify({ finished, at: new Date().toISOString() }, null, 2))
    },
    saveNote: (edition, section, patch) => {
      const notes = readJson(file('notes', edition), {})
      const note = { ...notes[section], ...patch, at: new Date().toISOString() }
      if (typeof note.comment === 'string') note.comment = note.comment.trim()
      if (!note.comment) delete note.comment
      if (!note.highlighted) delete note.highlighted
      if (note.highlighted || note.comment) notes[section] = note
      else delete notes[section]
      writeFileSync(file('notes', edition), JSON.stringify(notes, null, 2))
      return notes[section] ?? null
    },
  }
}
