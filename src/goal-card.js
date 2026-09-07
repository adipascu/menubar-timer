import { formatDuration, formatShare } from './focus-stats.js'
import { NUDGE_RULES } from './goals.js'

const points = (gap) => `${Math.round(Math.abs(gap) * 100)} points`

const ledger = (rows) =>
  rows.map((row) => `${row.name}: ${formatShare(row.actual)} of ${formatShare(row.goal)} over ${formatDuration(row.seconds)}`).join('\n')

export const goalCard = ({ behind, active, rows, total, startedAt }) => ({
  kind: 'goal',
  title: `Switch to ${behind.name}`,
  body: `Since ${new Date(startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} you have given ${behind.name} ${formatShare(behind.actual)} of your focus against a ${formatShare(behind.goal)} goal, ${points(behind.gap)} behind. ${active.name} is ${points(active.gap)} ahead of its own. Worth pointing the next session at ${behind.name}.`,
  source: 'Goal split',
  prompt: () =>
    [
      `My focus split since ${startedAt} across ${formatDuration(total)} of timed work:`,
      '',
      ledger(rows),
      '',
      `${behind.name} is the furthest behind and I have just been working on ${active.name}.`,
      '',
      'Help me work out whether the goal split is still the right one, or whether the way I am actually spending my time is telling me something the split has not caught up with. Ask what changed before you advise.',
      '',
      `The card comes from TimerBar itself. It only fires once ${NUDGE_RULES.enoughHours} hours are logged in the goal period and something is at least ${NUDGE_RULES.behindPoints} points behind, at most once every ${NUDGE_RULES.cardGapMinutes} minutes, all tunable at the top of src/goals.js.`,
    ].join('\n'),
})
