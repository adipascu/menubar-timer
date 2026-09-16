import { nativeImage } from 'electron'

const SCALES = [1, 2]
const SUPERSAMPLE = 4
const BORDER = 1

export const rectangle = ({ x, y, width, height }) => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height],
]

export const outline = ({ x, y, width, height }) => [
  rectangle({ x, y, width, height: BORDER }),
  rectangle({ x, y: y + height - BORDER, width, height: BORDER }),
  rectangle({ x, y: y + BORDER, width: BORDER, height: height - 2 * BORDER }),
  rectangle({ x: x + width - BORDER, y: y + BORDER, width: BORDER, height: height - 2 * BORDER }),
]

const crossings = (polygon, atY) => {
  const found = []
  polygon.forEach(([x, y], index) => {
    const [nextX, nextY] = polygon[(index + 1) % polygon.length]
    if (y <= atY === nextY <= atY) return
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

const flatten = (coverage, size, icon, scale) => {
  const width = icon.width * scale
  const height = icon.height * scale
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

export const templateImage = (icon, shapes) => {
  const image = nativeImage.createEmpty()
  for (const scale of SCALES) {
    const grid = scale * SUPERSAMPLE
    const size = { width: icon.width * grid, height: icon.height * grid }
    const coverage = new Uint8Array(size.width * size.height)
    for (const { polygons, invert } of shapes) {
      const gridded = polygons.map((polygon) => polygon.map(([x, y]) => [x * grid, y * grid]))
      paint(coverage, size, gridded, invert)
    }
    image.addRepresentation({ scaleFactor: scale, ...flatten(coverage, size, icon, scale) })
  }
  image.setTemplateImage(true)
  return image
}
