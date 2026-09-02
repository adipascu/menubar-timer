import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RETIRING_STATUSES = new Set(['known', 'not-interested'])

export const createFeedback = () => {
  const file = join(app.getPath('userData'), 'feedback.json')

  const entries = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {})

  const update = (tip, patch) => {
    const all = entries()
    const entry = all[tip.title] ?? { topic: tip.topic, shown: 0 }
    all[tip.title] = { ...entry, ...patch(entry) }
    writeFileSync(file, JSON.stringify(all, null, 2))
  }

  return {
    file,
    recordShown: (tip) => update(tip, (entry) => ({ shown: entry.shown + 1, lastShownAt: new Date().toISOString() })),
    mark: (tip, status) => update(tip, () => ({ status, markedAt: new Date().toISOString() })),
    retiredTitles: () =>
      new Set(
        Object.entries(entries())
          .filter(([, entry]) => RETIRING_STATUSES.has(entry.status))
          .map(([title]) => title),
      ),
  }
}
