import { outline, rectangle, templateImage } from './menu-icon.js'
import { DAYS_IN_WEEK } from './tune-up.js'

const ICON = { width: 18, height: 9 }
const TRACK = { x: 0, y: 1, width: 18, height: 7 }
const FILL = { x: 2, y: 3, width: 14, height: 3 }
const cache = new Map()

export const tuneUpGauge = (daysElapsed) => {
  if (!cache.has(daysElapsed)) {
    const filled = Math.round((FILL.width * daysElapsed) / DAYS_IN_WEEK)
    cache.set(
      daysElapsed,
      templateImage(ICON, [
        { polygons: outline(TRACK) },
        { polygons: filled > 0 ? [rectangle({ ...FILL, width: filled })] : [] },
      ]),
    )
  }
  return cache.get(daysElapsed)
}
