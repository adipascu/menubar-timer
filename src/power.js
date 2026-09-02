import { execFile } from 'node:child_process'
import { log } from './log.js'

const SAMPLE_MS = 30 * 1000
const WINDOW_SAMPLES = 10
const HEAVY_LOAD_WATTS = 22
const LOW_BATTERY_PERCENT = 40
const ALERT_GAP_MS = 3 * 60 * 1000
const UNKNOWN_MINUTES = 65535

const number = (text, key) => {
  const match = text.match(new RegExp(`"${key}" = (-?\\d+)`))
  return match ? Number(BigInt.asIntN(64, BigInt(match[1]))) : null
}

const flag = (text, key) => {
  const match = text.match(new RegExp(`"${key}" = (Yes|No)`))
  return match ? match[1] === 'Yes' : null
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const describeRemaining = (minutes) =>
  minutes > 0 && minutes < UNKNOWN_MINUTES ? `, about ${Math.floor(minutes / 60)}h ${minutes % 60}m left` : ''

const readPower = () =>
  new Promise((resolve, reject) => {
    execFile('ioreg', ['-rn', 'AppleSmartBattery'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve({
        onBattery: flag(stdout, 'ExternalConnected') === false,
        percent: number(stdout, 'CurrentCapacity'),
        minutesRemaining: number(stdout, 'TimeRemaining'),
        watts: Math.abs(number(stdout, 'InstantAmperage') * number(stdout, 'Voltage')) / 1e6,
      })
    })
  })

const TUNABLES = [
  'This alert comes from TimerBar itself, so if it fired at the wrong moment we can retune it.',
  `The knobs are all at the top of src/power.js: HEAVY_LOAD_WATTS ${HEAVY_LOAD_WATTS}, sampled every ${SAMPLE_MS / 1000}s and compared as a median over the last ${WINDOW_SAMPLES} samples, LOW_BATTERY_PERCENT ${LOW_BATTERY_PERCENT}, and ALERT_GAP_MS ${ALERT_GAP_MS / 60000} minutes between alerts.`,
  'The reading comes from ioreg AppleSmartBattery, InstantAmperage times Voltage, so it is whole-system draw rather than any one process.',
].join(' ')

const heavyLoadCard = (watts, reading) => ({
  kind: 'power',
  title: `Plug in, you are pulling ${watts.toFixed(0)} W`,
  body: `Sustained ${watts.toFixed(1)} W on battery for the last five minutes, over the ${HEAVY_LOAD_WATTS} W limit. Battery is at ${reading.percent}%${describeRemaining(reading.minutesRemaining)}.`,
  source: 'Power draw',
  prompt: [
    `My Mac has been drawing a sustained ${watts.toFixed(1)} W on battery for the last five minutes, with the battery at ${reading.percent}%. That is over the ${HEAVY_LOAD_WATTS} W limit.`,
    '',
    'Help me find what is responsible. Suggest what to run, read the output with me, and tell me whether it is worth killing something or whether I should just plug in.',
    '',
    TUNABLES,
  ].join('\n'),
})

const lowBatteryCard = (reading) => ({
  kind: 'power',
  title: `Battery at ${reading.percent}%`,
  body: `Running on battery at ${reading.percent}%, currently drawing ${reading.watts.toFixed(0)} W${describeRemaining(reading.minutesRemaining)}. Worth plugging in.`,
  source: 'Battery level',
  prompt: [
    `My Mac is on battery at ${reading.percent}%, drawing ${reading.watts.toFixed(0)} W right now.`,
    '',
    'Tell me whether that draw is reasonable for what I am doing, and what I could turn off to stretch the remaining charge.',
    '',
    TUNABLES,
  ].join('\n'),
})

export const createPowerWatch = (onAlert, onDraw = () => {}, chargerNearby = () => true) => {
  const watts = []
  let lastAlertAt = 0
  let lastSuppressedLogAt = 0
  let timer = null
  let wasOverLimit = false

  const report = (sustained, overLimit) => {
    if (overLimit !== wasOverLimit) {
      wasOverLimit = overLimit
      log(`draw over ${HEAVY_LOAD_WATTS} W on battery ${overLimit ? 'started' : 'ended'}`)
    }
    onDraw(sustained, overLimit)
  }

  const check = async () => {
    const reading = await readPower().catch((error) => {
      log(`power read failed: ${error.message.trim()}`)
      return null
    })

    if (!reading) return
    if (!reading.onBattery) {
      watts.length = 0
      report(null, false)
      return
    }

    watts.push(reading.watts)
    if (watts.length > WINDOW_SAMPLES) watts.shift()

    const sustained = Math.round(median(watts) * 10) / 10
    const overLimit = sustained > HEAVY_LOAD_WATTS
    const overheating = overLimit && watts.length === WINDOW_SAMPLES
    report(sustained, overLimit)

    if (Date.now() - lastAlertAt < ALERT_GAP_MS) return
    const card = overheating
      ? heavyLoadCard(sustained, reading)
      : reading.percent < LOW_BATTERY_PERCENT
        ? lowBatteryCard(reading)
        : null

    if (!card) return

    if (!chargerNearby()) {
      if (Date.now() - lastSuppressedLogAt >= ALERT_GAP_MS) {
        lastSuppressedLogAt = Date.now()
        log(`power alert suppressed, no charger at this place: ${card.title}`)
      }
      return
    }

    lastAlertAt = Date.now()
    log(
      `power alert: ${card.title} (median ${sustained.toFixed(1)} W over ${watts.length} samples, limit ${HEAVY_LOAD_WATTS} W)`,
    )
    onAlert(card)
  }

  return {
    start: () => {
      check()
      timer = setInterval(check, SAMPLE_MS)
    },
    stop: () => clearInterval(timer),
  }
}
