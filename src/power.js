import { execFile } from 'node:child_process'
import { log } from './log.js'

const SAMPLE_MS = 30 * 1000
const WINDOW_SAMPLES = 10
const HEAVY_LOAD_WATTS = 22
const LOW_BATTERY_PERCENT = 40
const CHARGER_SHORTFALL_WATTS = 5
const ALERT_GAP_MS = 3 * 60 * 1000
const STALE_AFTER_MS = 2 * SAMPLE_MS
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

const sustainedWatts = (samples) => Math.round(median(samples) * 10) / 10

const createWindow = () => {
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
    sustained: () => sustainedWatts(samples),
  }
}

const adapterWatts = (text) => {
  const details = text.split('\n').find((line) => line.includes('"AdapterDetails" ='))
  const match = details?.match(/"Watts"=(\d+)/)
  return match ? Number(match[1]) : null
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
      const amperage = number(stdout, 'InstantAmperage')
      resolve({
        onBattery: flag(stdout, 'ExternalConnected') === false,
        charging: flag(stdout, 'IsCharging') === true,
        percent: number(stdout, 'CurrentCapacity'),
        minutesRemaining: number(stdout, 'TimeRemaining'),
        watts: Math.abs(amperage * number(stdout, 'Voltage')) / 1e6,
        draining: amperage < 0,
        adapterWatts: adapterWatts(stdout),
      })
    })
  })

const KNOBS = [
  'This alert comes from TimerBar itself, so if it fired at the wrong moment we can retune it.',
  `The knobs are all at the top of src/power.js: HEAVY_LOAD_WATTS ${HEAVY_LOAD_WATTS}, sampled every ${SAMPLE_MS / 1000}s and compared as a median over the last ${WINDOW_SAMPLES} samples, LOW_BATTERY_PERCENT ${LOW_BATTERY_PERCENT}, CHARGER_SHORTFALL_WATTS ${CHARGER_SHORTFALL_WATTS}, and ALERT_GAP_MS ${ALERT_GAP_MS / 60000} minutes between alerts.`,
].join(' ')

const WHOLE_SYSTEM_DRAW =
  'The reading comes from ioreg AppleSmartBattery, InstantAmperage times Voltage, so it is whole-system draw rather than any one process.'

const OUT_OF_THE_BATTERY =
  'The reading comes from ioreg AppleSmartBattery, InstantAmperage times Voltage, so it is only the current coming out of the battery, the part of the load the adapter is not covering, rather than the whole-system draw. The adapter wattage is the rating it reports, not what it is delivering.'

const tunables = (reading) => `${KNOBS} ${reading}`

const heavyLoadCard = (watts, reading) => ({
  kind: 'power',
  asksForACharger: true,
  title: `Plug in, you are pulling ${watts.toFixed(0)} W`,
  body: `Sustained ${watts.toFixed(1)} W on battery for the last five minutes, over the ${HEAVY_LOAD_WATTS} W limit. Battery is at ${reading.percent}%${describeRemaining(reading.minutesRemaining)}.`,
  source: 'Power draw',
  prompt: () =>
    [
      `My Mac has been drawing a sustained ${watts.toFixed(1)} W on battery for the last five minutes, with the battery at ${reading.percent}%. That is over the ${HEAVY_LOAD_WATTS} W limit.`,
      '',
      'Help me find what is responsible. Suggest what to run, read the output with me, and tell me whether it is worth killing something or whether I should just plug in.',
      '',
      tunables(WHOLE_SYSTEM_DRAW),
    ].join('\n'),
})

const lowBatteryCard = (reading) => ({
  kind: 'power',
  asksForACharger: true,
  title: `Battery at ${reading.percent}%`,
  body: `Running on battery at ${reading.percent}%, currently drawing ${reading.watts.toFixed(0)} W${describeRemaining(reading.minutesRemaining)}. Worth plugging in.`,
  source: 'Battery level',
  prompt: () =>
    [
      `My Mac is on battery at ${reading.percent}%, drawing ${reading.watts.toFixed(0)} W right now.`,
      '',
      'Tell me whether that draw is reasonable for what I am doing, and what I could turn off to stretch the remaining charge.',
      '',
      tunables(WHOLE_SYSTEM_DRAW),
    ].join('\n'),
})

const describeAdapter = (rated) => (rated ? `a ${rated} W adapter` : 'the adapter')

const describeLevel = (percent) => (percent === null ? '' : `, now at ${percent}%`)

const chargerTooSmallCard = (watts, reading) => ({
  kind: 'power',
  title: `The charger is ${watts.toFixed(0)} W short`,
  body: `Plugged into ${describeAdapter(reading.adapterWatts)} and still losing charge: a sustained ${watts.toFixed(1)} W has been coming out of the battery over the last five minutes${describeLevel(reading.percent)}. The battery is covering what the adapter does not.`,
  source: 'Charger shortfall',
  prompt: () =>
    [
      `My Mac is plugged into ${describeAdapter(reading.adapterWatts)} and the battery is still draining, a sustained ${watts.toFixed(1)} W out of it over the last five minutes${describeLevel(reading.percent)}.`,
      '',
      'Help me work out whether the charger is simply too small for this machine under load or whether something is drawing more than it should. Suggest what to run, read the output with me, and say whether the answer is a bigger adapter or a lighter load.',
      '',
      tunables(OUT_OF_THE_BATTERY),
    ].join('\n'),
})

export const createPowerWatch = (onAlert, onSample = () => {}, chargerNearby = () => true) => {
  const draw = createWindow()
  const shortfall = createWindow()
  let lastAlertAt = 0
  let lastSuppressedLogAt = 0
  let timer = null
  let wasOverLimit = false
  let chargerChangedAt = 0
  let lastReadAt = 0

  const forgetWindows = () => {
    draw.clear()
    shortfall.clear()
  }

  const report = (sustained, overLimit, reading) => {
    if (overLimit !== wasOverLimit) {
      wasOverLimit = overLimit
      log(`draw over ${HEAVY_LOAD_WATTS} W on battery ${overLimit ? 'started' : 'ended'}`)
    }
    onSample(sustained, overLimit, reading)
  }

  const raise = (card, detail) => {
    if (Date.now() - lastAlertAt < ALERT_GAP_MS) return

    if (card.asksForACharger && !chargerNearby()) {
      if (Date.now() - lastSuppressedLogAt >= ALERT_GAP_MS) {
        lastSuppressedLogAt = Date.now()
        log(`power alert suppressed, no charger at this place: ${card.title}`)
      }
      return
    }

    lastAlertAt = Date.now()
    log(`power alert: ${card.title} (${detail})`)
    onAlert(card)
  }

  const checkOnBattery = (reading) => {
    draw.push(reading.watts)

    const sustained = draw.sustained()
    const overLimit = sustained > HEAVY_LOAD_WATTS
    const overheating = overLimit && draw.full()
    report(sustained, overLimit, reading)

    const card = overheating
      ? heavyLoadCard(sustained, reading)
      : reading.percent !== null && reading.percent < LOW_BATTERY_PERCENT
        ? lowBatteryCard(reading)
        : null

    if (card) {
      raise(card, `median ${sustained.toFixed(1)} W over ${draw.size()} samples, limit ${HEAVY_LOAD_WATTS} W`)
    }
  }

  const checkOnCharger = (reading) => {
    report(null, false, reading)
    shortfall.push(reading.draining ? reading.watts : 0)

    const sustained = shortfall.sustained()
    if (!shortfall.full() || sustained < CHARGER_SHORTFALL_WATTS) return
    raise(
      chargerTooSmallCard(sustained, reading),
      `median ${sustained.toFixed(1)} W out of the battery over ${shortfall.size()} samples with the adapter in, floor ${CHARGER_SHORTFALL_WATTS} W`,
    )
  }

  const check = async () => {
    const readAt = Date.now()
    const reading = await readPower().catch((error) => {
      log(`power read failed: ${error.message.trim()}`)
      return null
    })

    if (!reading || readAt < chargerChangedAt) return
    if (readAt - lastReadAt > STALE_AFTER_MS) forgetWindows()
    lastReadAt = readAt

    if (reading.onBattery) {
      shortfall.clear()
      checkOnBattery(reading)
      return
    }

    draw.clear()
    checkOnCharger(reading)
  }

  return {
    start: () => {
      check()
      timer = setInterval(check, SAMPLE_MS)
    },
    chargerArrived: () => {
      chargerChangedAt = Date.now()
      forgetWindows()
      check()
    },
    stop: () => clearInterval(timer),
  }
}
