const RETIRING_ACTIONS = new Set(['known', 'not-interested'])
const VERDICTS = new Set([...RETIRING_ACTIONS, 'interested', 'useful'])

const repeated = (count = 0, event) => Array.from({ length: count }, () => ({ ...event }))

const legacyEvents = ({ status, markedAt, interested, interestedAt, useful, usefulAt, notes = [] }) => [
  ...(status ? [{ action: status, at: markedAt }] : []),
  ...repeated(interested, { action: 'interested', at: interestedAt }),
  ...repeated(useful, { action: 'useful', at: usefulAt }),
  ...notes.map(({ text, at }) => ({ action: 'note', text, at })),
]

const byTime = (a, b) => String(a.at).localeCompare(String(b.at))

export const withFeedbackLog = (entry) => {
  const {
    status,
    markedAt,
    interested,
    interestedAt,
    useful,
    usefulAt,
    notes,
    showings = [],
    feedback = [],
    ...rest
  } = entry
  const legacy = legacyEvents({ status, markedAt, interested, interestedAt, useful, usefulAt, notes })
  return { ...rest, showings, feedback: [...feedback, ...legacy].sort(byTime) }
}

export const withFeedbackLogs = (entries) =>
  Object.fromEntries(Object.entries(entries).map(([title, entry]) => [title, withFeedbackLog(entry)]))

export const newEntry = (topic) => ({ topic, shown: 0, showings: [], feedback: [] })

export const withShowing = (entry, { at, via }) => {
  const number = entry.shown + 1
  return { ...entry, shown: number, lastShownAt: at, showings: [...entry.showings, { number, shownAt: at, via }] }
}

export const withClosing = (entry, number, { at, by }) => ({
  ...entry,
  showings: entry.showings.map((showing) =>
    showing.number === number && !showing.closedAt ? { ...showing, closedAt: at, closedBy: by } : showing,
  ),
})

export const withFeedback = (entry, number, event) => ({
  ...entry,
  feedback: [...entry.feedback, { ...event, showing: number }],
})

export const retiredTitles = (entries) =>
  new Set(
    Object.entries(entries)
      .filter(([, entry]) =>
        RETIRING_ACTIONS.has(entry.feedback.findLast(({ action }) => VERDICTS.has(action))?.action),
      )
      .map(([title]) => title),
  )
