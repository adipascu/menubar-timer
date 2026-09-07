import { nativeImage } from 'electron'

const SIZE = 10
const SCALES = [1, 2]
const cache = new Map()

const channels = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))

const coverage = (x, y, radius) => {
  const distance = Math.hypot(x + 0.5 - radius, y + 0.5 - radius)
  return Math.min(1, Math.max(0, radius - distance + 0.5))
}

const representation = ([red, green, blue], scale) => {
  const side = SIZE * scale
  const radius = side / 2
  const buffer = Buffer.alloc(side * side * 4)
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const alpha = coverage(x, y, radius)
      const at = (y * side + x) * 4
      buffer[at] = Math.round(blue * alpha)
      buffer[at + 1] = Math.round(green * alpha)
      buffer[at + 2] = Math.round(red * alpha)
      buffer[at + 3] = Math.round(255 * alpha)
    }
  }
  return { scaleFactor: scale, width: side, height: side, buffer }
}

export const swatchImage = (hex) => {
  if (!cache.has(hex)) {
    const image = nativeImage.createEmpty()
    for (const scale of SCALES) image.addRepresentation(representation(channels(hex), scale))
    cache.set(hex, image)
  }
  return cache.get(hex)
}
