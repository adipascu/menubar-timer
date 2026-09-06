import { nativeImage } from 'electron'

const SCALES = [1, 2]
const SUPERSAMPLE = 4
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
const BORDER = 1

const rectangle = ({ x, y, width, height }) => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height],
]

const outline = ({ x, y, width, height }) => [
  rectangle({ x, y, width, height: BORDER }),
  rectangle({ x, y: y + height - BORDER, width, height: BORDER }),
  rectangle({ x, y: y + BORDER, width: BORDER, height: height - 2 * BORDER }),
  rectangle({ x: x + width - BORDER, y: y + BORDER, width: BORDER, height: height - 2 * BORDER }),
]

const placed = (shape, { x, y, width, height }) =>
  shape.map(([alongX, alongY]) => [x + alongX * width, y + alongY * height])

const crossings = (polygon, atY) => {
  const found = []
  polygon.forEach(([x, y], index) => {
    const [nextX, nextY] = polygon[(index + 1) % polygon.length]
    if ((y <= atY) === (nextY <= atY)) return
    found.push(x + ((atY - y) * (nextX - x)) / (nextY - y))
  })
  return found.sort((a, b) => a - b)
}

const paint = (coverage, size, polygons, invert) => {
  for (const polygon of polygons) {
    const ys = polygon.map(([, y]) => y)
    const top = Math.max(0, Math.floor(Math.min(...ys)))
    const bottom = Math.min(size.height, Math.ceil(Math.max(...ys)))
    for (let row = top; row < bottom; row += 1) {
      const edges = crossings(polygon, row + 0.5)
      for (let pair = 0; pair + 1 < edges.length; pair += 2) {
        const from = Math.max(0, Math.round(edges[pair]))
        const to = Math.min(size.width, Math.round(edges[pair + 1]))
        for (let column = from; column < to; column += 1) {
          const at = row * size.width + column
          coverage[at] = invert ? 1 - coverage[at] : 1
        }
      }
    }
  }
}

const flatten = (coverage, size, scale) => {
  const width = ICON.width * scale
  const height = ICON.height * scale
  const buffer = Buffer.alloc(width * height * 4)
  const samples = SUPERSAMPLE * SUPERSAMPLE
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      let covered = 0
      for (let subRow = 0; subRow < SUPERSAMPLE; subRow += 1) {
        const offset = (row * SUPERSAMPLE + subRow) * size.width + column * SUPERSAMPLE
        for (let subColumn = 0; subColumn < SUPERSAMPLE; subColumn += 1) {
          covered += coverage[offset + subColumn]
        }
      }
      buffer[(row * width + column) * 4 + 3] = Math.round((covered * 255) / samples)
    }
  }
  return { width, height, buffer }
}

const compose = (shapes) => {
  const image = nativeImage.createEmpty()
  for (const scale of SCALES) {
    const grid = scale * SUPERSAMPLE
    const size = { width: ICON.width * grid, height: ICON.height * grid }
    const coverage = new Uint8Array(size.width * size.height)
    for (const { polygons, invert } of shapes) {
      const gridded = polygons.map((polygon) => polygon.map(([x, y]) => [x * grid, y * grid]))
      paint(coverage, size, gridded, invert)
    }
    image.addRepresentation({ scaleFactor: scale, ...flatten(coverage, size, scale) })
  }
  image.setTemplateImage(true)
  return image
}

const batteryIcon = (percent, charging) => {
  const filled = Math.round((CHARGE.width * Math.min(100, Math.max(0, percent))) / 100)
  return compose([
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
