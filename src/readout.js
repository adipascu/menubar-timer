import { nativeImage } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SCALES = [1, 2]
const WIDEST_NUMBER = '00.0'
const WIDEST_READING = `${WIDEST_NUMBER} W`
const GLYPH_FILES = { '.': 'dot', ' ': 'space' }

const loadImage = (...path) => nativeImage.createFromPath(join(here, ...path))

const pixels = (image, scale) => {
  const { width, height } = image.getSize()
  return { buffer: image.toBitmap({ scaleFactor: scale }), width: width * scale, height: height * scale }
}

const blit = (canvas, canvasWidth, source, x, y) => {
  const rowBytes = source.width * 4
  for (let row = 0; row < source.height; row += 1) {
    const from = row * rowBytes
    source.buffer.copy(canvas, ((y + row) * canvasWidth + x) * 4, from, from + rowBytes)
  }
}

const composeImage = (slot, placements) => {
  const image = nativeImage.createEmpty()
  for (const scale of SCALES) {
    const width = slot.width * scale
    const height = slot.height * scale
    const canvas = Buffer.alloc(width * height * 4)
    for (const { image: part, x, y } of placements) {
      blit(canvas, width, pixels(part, scale), x * scale, y * scale)
    }
    image.addRepresentation({ scaleFactor: scale, width, height, buffer: canvas })
  }
  return image
}

const readingText = (watts) => {
  const fixed = watts.toFixed(1)
  return `${fixed.length > WIDEST_NUMBER.length ? watts.toFixed(0) : fixed} W`
}

export const createReadout = () => {
  const glyphs = Object.fromEntries(
    [...'0123456789. W'].map((char) => [char, loadImage('glyphs', `${GLYPH_FILES[char] ?? char}.png`)]),
  )
  const flame = loadImage('flame.png')
  const flameSize = flame.getSize()
  const advance = (char) => glyphs[char].getSize().width
  const textWidth = (text) => [...text].reduce((total, char) => total + advance(char), 0)
  const cellHeight = glyphs['0'].getSize().height
  const slot = { width: textWidth(WIDEST_READING), height: Math.max(cellHeight, flameSize.height) }
  const centeredY = (height) => Math.floor((slot.height - height) / 2)
  const readingY = centeredY(cellHeight)

  const composeReading = (watts) => {
    const text = readingText(watts)
    const placements = []
    let x = slot.width - textWidth(text)
    for (const char of text) {
      placements.push({ image: glyphs[char], x, y: readingY })
      x += advance(char)
    }
    const image = composeImage(slot, placements)
    image.setTemplateImage(true)
    return image
  }

  return {
    flame: composeImage(slot, [
      { image: flame, x: Math.floor((slot.width - flameSize.width) / 2), y: centeredY(flameSize.height) },
    ]),
    reading: (watts) => (watts === null ? nativeImage.createEmpty() : composeReading(watts)),
  }
}
