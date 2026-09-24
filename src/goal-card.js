import { formatDuration, formatShare } from './focus-stats.js'
import { GOAL_RULES, standingText } from './goals.js'

const ledger = (rows) =>
  rows
    .map(
      (row) =>
        `${row.name}: ${formatShare(row.actual)} of ${formatShare(row.goal)} over ${formatDuration(row.seconds)}, ${standingText(row)}`,
    )
    .join('\n')

export const goalCard = ({ behind, active, rows, total }) => ({
  kind: 'goal',
  title: `Switch to ${behind.name}`,
  body: `Over the last ${GOAL_RULES.windowDays} days ${behind.name} got ${formatShare(behind.actual)} of your timed work against a ${formatShare(behind.goal)} goal, ${standingText(behind)}. ${active.name} is ${standingText(active)}. Worth pointing the next session at ${behind.name}.`,
  source: 'Goal split',
  prompt: () =>
    [
      `My focus split over the last ${GOAL_RULES.windowDays} days, across ${formatDuration(total)} of timed work:`,
      '',
      ledger(rows),
      '',
      `${behind.name} is the furthest behind and I have just been working on ${active.name}.`,
      '',
      'Help me work out whether the goal split is still the right one, or whether the way I am actually spending my time is telling me something the split has not caught up with. Ask what changed before you advise.',
      '',
      `The card comes from TimerBar itself. It measures the last ${GOAL_RULES.windowDays} days of timed work against the current split, calls a category behind or ahead once it is more than ${GOAL_RULES.bandPoints} points off its share, says nothing until ${GOAL_RULES.enoughHours} hours are in that window, and comes at most once every ${GOAL_RULES.cardGapMinutes} minutes, all tunable at the top of src/goals.js.`,
    ].join('\n'),
})
