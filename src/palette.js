import ansiStyles from 'ansi-styles'

const BLACK_INK = { hex: '#000000', style: ansiStyles.black }
const WHITE_INK = { hex: '#ffffff', style: ansiStyles.white }

const chip = (key, label, hex, background, ink) => ({
  key,
  label,
  hex,
  ink: ink.hex,
  paint: (text) => `${background.open}${ink.style.open} ${text} ${ink.style.close}${background.close}`,
})

export const PALETTE = [
  chip('red', 'Red', '#cd0000', ansiStyles.bgRed, WHITE_INK),
  chip('green', 'Green', '#00cd00', ansiStyles.bgGreen, BLACK_INK),
  chip('yellow', 'Yellow', '#cdcd00', ansiStyles.bgYellow, BLACK_INK),
  chip('blue', 'Blue', '#0000ee', ansiStyles.bgBlue, WHITE_INK),
  chip('magenta', 'Magenta', '#cd00cd', ansiStyles.bgMagenta, WHITE_INK),
  chip('cyan', 'Cyan', '#00cdcd', ansiStyles.bgCyan, BLACK_INK),
  chip('gray', 'Gray', '#7f7f7f', ansiStyles.bgBlack, WHITE_INK),
]

export const swatchOf = (key) => PALETTE.find((entry) => entry.key === key) ?? PALETTE[0]

export const swatchList = () => PALETTE.map(({ key, label, hex, ink }) => ({ key, label, hex, ink }))
