export const SAMPLE_MS = 30 * 1000
export const WINDOW_SAMPLES = 10
export const HEAVY_LOAD_WATTS = 22
export const LOW_BATTERY_PERCENT = 40
export const CHARGER_SHORTFALL_WATTS = 5
export const ALERT_GAP_MS = 3 * 60 * 1000
export const STALE_AFTER_MS = 2 * SAMPLE_MS

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export const createWindow = () => {
  const samples = []
  return {
    push: (watts) => {
      samples.push(watts)
      if (samples.length > WINDOW_SAMPLES) samples.shift()
    },
    clear: () => {
      samples.length = 0
    },
    size: () => samples.length,
    full: () => samples.length === WINDOW_SAMPLES,
    sustained: () => Math.round(median(samples) * 10) / 10,
  }
}
