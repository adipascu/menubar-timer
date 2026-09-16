import { outline, rectangle, templateImage } from './menu-icon.js'

const ICON = { width: 17, height: 11 }
const BODY = { x: 0, y: 0, width: 15, height: 11 }
const CAP = { x: 15, y: 4, width: 2, height: 3 }
const CHARGE = { x: 2, y: 2, width: 11, height: 7 }
const BOLT = { x: 5, y: 1.5, width: 5, height: 8 }
const BOLT_SHAPE = [
  [0.6, 0],
  [0, 0.56],
  [0.4, 0.56],
  [0.28, 1],
  [1, 0.44],
  [0.55, 0.44],
]

const placed = (shape, { x, y, width, height }) =>
  shape.map(([alongX, alongY]) => [x + alongX * width, y + alongY * height])

const batteryIcon = (percent, charging) => {
  const filled = Math.round((CHARGE.width * Math.min(100, Math.max(0, percent))) / 100)
  return templateImage(ICON, [
    { polygons: [...outline(BODY), rectangle(CAP)] },
    { polygons: filled > 0 ? [rectangle({ ...CHARGE, width: filled })] : [] },
    { polygons: charging ? [placed(BOLT_SHAPE, BOLT)] : [], invert: true },
  ])
}

const stateLabel = ({ onBattery, charging }) => {
  if (charging) return ' · charging'
  return onBattery ? '' : ' · plugged in'
}

export const batteryMenuItem = (reading) =>
  reading.percent === null
    ? null
    : {
        label: `Battery ${reading.percent}%${stateLabel(reading)}`,
        icon: batteryIcon(reading.percent, reading.charging),
        enabled: false,
      }
