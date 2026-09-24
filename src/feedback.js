import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { newEntry, retiredTitles, withClosing, withFeedback, withFeedbackLogs, withShowing } from './feedback-log.js'

export const createFeedback = () => {
  const file = join(app.getPath('userData'), 'feedback.json')

  const entries = () => withFeedbackLogs(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {})

  const save = (all) => writeFileSync(file, JSON.stringify(all, null, 2))

  const update = (tip, change) => {
    const all = entries()
    all[tip.title] = change(all[tip.title] ?? newEntry(tip.topic))
    save(all)
    return all[tip.title]
  }

  const now = () => new Date().toISOString()

  if (existsSync(file)) save(entries())

  return {
    file,
    recordShown: (tip, via) => update(tip, (entry) => withShowing(entry, { at: now(), via })).shown,
    recordClosed: (tip, showing, by) => update(tip, (entry) => withClosing(entry, showing, { at: now(), by })),
    record: (tip, showing, event) => update(tip, (entry) => withFeedback(entry, showing, { ...event, at: now() })),
    retiredTitles: () => retiredTitles(entries()),
  }
}
