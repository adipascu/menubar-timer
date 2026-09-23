const TOP_GAP = 90

const clamped = (value, lowest, highest) => Math.max(lowest, Math.min(value, highest))

export const contentHeightWithin = (wanted, { height }, frameHeight) =>
  Math.min(Math.ceil(wanted), height - frameHeight)

export const keptInside = ({ x, y, width, height }, area) => ({
  x: clamped(x, area.x, area.x + area.width - width),
  y: clamped(y, area.y, area.y + area.height - height),
  width,
  height,
})

export const openingBounds = ({ width, height }, area) =>
  keptInside({ x: Math.round(area.x + (area.width - width) / 2), y: area.y + TOP_GAP, width, height }, area)
