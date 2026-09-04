const PAD = 8
const BELL_EVERY_MS = 400
const BELL_MS = 50
const PHOSPHOR = '#39ff14'
const GROUND = '#020803'
const INK_ON_PHOSPHOR = '#03140a'
const HEX = '0123456789ABCDEF'
const SYMBOLS = '<>/\\|{}[]#$%&*+=?!;:'
const KANA = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ'

const mono = (px) => `600 ${px}px ui-monospace, Menlo, Monaco, monospace`
const pick = (items) => items[Math.floor(Math.random() * items.length)]
const between = (min, max) => min + Math.random() * (max - min)
const chance = (probability) => Math.random() < probability
const bellIsOn = (t) => t % BELL_EVERY_MS < BELL_MS

const randomGlyph = () => {
  const roll = Math.random()
  if (roll < 0.08) return pick(KANA)
  if (roll < 0.22) return pick(SYMBOLS)
  return pick(HEX)
}

const setup = (canvas, height) => {
  canvas.style.height = `${height}px`
  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, width, height }
}

const paintGround = ({ ctx, width, height }, inverted) => {
  ctx.fillStyle = inverted ? PHOSPHOR : GROUND
  ctx.fillRect(0, 0, width, height)
}

const glow = ({ ctx, width, height }) => {
  ctx.save()
  ctx.filter = 'blur(3px)'
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.8
  ctx.drawImage(ctx.canvas, 0, 0, width, height)
  ctx.restore()
}

const scanlines = ({ ctx, width, height }) => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
  for (let y = 1; y < height; y += 2) ctx.fillRect(0, y, width, 1)
}

const matrixRain = (canvas) => {
  const strip = setup(canvas, 28)
  const { ctx, width, height } = strip
  ctx.font = mono(9)
  ctx.textBaseline = 'middle'
  const advance = 8
  const rows = 3
  const rowHeight = height / rows
  const count = Math.max(0, Math.floor((width - 2 * PAD) / advance))
  const cells = Array.from({ length: count }, () =>
    Array.from({ length: rows }, () => ({ glyph: randomGlyph(), heat: 0 })),
  )
  const newDrop = (delay) => ({ head: -between(0, delay), lastRow: -1, speed: between(9, 18) })
  const drops = Array.from({ length: count }, () => newDrop(12))
  const heatColor = (heat) => {
    if (heat > 0.85) return '#e6ffe0'
    return `rgb(${Math.round(14 + 40 * heat)}, ${Math.round(88 + 167 * heat)}, ${Math.round(24 + 8 * heat)})`
  }

  return {
    ...strip,
    frame(t, dt, inverted) {
      drops.forEach((drop, col) => {
        drop.head += (drop.speed * dt) / 1000
        const reached = Math.floor(drop.head)
        for (let row = drop.lastRow + 1; row <= reached; row += 1) {
          if (row >= 0 && row < rows) cells[col][row] = { glyph: randomGlyph(), heat: 1 }
        }
        drop.lastRow = Math.max(drop.lastRow, reached)
        if (drop.head > rows + 2) Object.assign(drop, newDrop(6))
      })
      for (const column of cells) {
        for (const cell of column) {
          cell.heat *= 0.9
          if (chance(0.03)) cell.glyph = randomGlyph()
        }
      }
      paintGround(strip, inverted)
      cells.forEach((column, col) => {
        column.forEach((cell, row) => {
          if (cell.heat < 0.04) return
          ctx.fillStyle = inverted ? INK_ON_PHOSPHOR : heatColor(cell.heat)
          ctx.fillText(cell.glyph, PAD + col * advance, rowHeight * (row + 0.5) + 0.5)
        })
      })
    },
  }
}

const spectrum = (canvas) => {
  const strip = setup(canvas, 22)
  const { ctx, width, height } = strip
  const pitch = 7
  const bar = 5
  const segmentPitch = 3
  const segmentHeight = 2
  const bins = Math.max(0, Math.floor((width - 2 * PAD + (pitch - bar)) / pitch))
  const segmentCount = Math.floor((height - 4) / segmentPitch)
  const left = (width - (bins * pitch - (pitch - bar))) / 2
  const level = new Float32Array(bins)
  const target = new Float32Array(bins)
  const peak = new Float32Array(bins)
  let lastRetarget = -1000

  const segmentColor = (index) => {
    if (index >= segmentCount - 1) return '#ff3b2f'
    if (index >= segmentCount - 3) return '#ffd23b'
    return PHOSPHOR
  }

  return {
    ...strip,
    frame(t, dt, inverted) {
      if (t - lastRetarget >= 70) {
        lastRetarget = t
        for (let i = 0; i < bins; i += 1) {
          const shape = 0.35 + 0.28 * Math.sin(i * 0.45 + t / 260) + 0.18 * Math.sin(i * 1.7 - t / 140)
          target[i] = Math.min(1, Math.max(0.05, shape + between(-0.2, 0.3) + (chance(0.07) ? 0.6 : 0)))
        }
      }
      for (let i = 0; i < bins; i += 1) {
        if (inverted) {
          level[i] = 1
          peak[i] = 1
        } else {
          level[i] += (target[i] - level[i]) * (target[i] > level[i] ? 0.65 : 0.22)
          peak[i] = Math.max(peak[i] - 0.035, level[i])
        }
      }
      paintGround(strip, false)
      for (let i = 0; i < bins; i += 1) {
        const x = left + i * pitch
        const litCount = Math.round(level[i] * segmentCount)
        for (let s = 0; s < segmentCount; s += 1) {
          const y = height - 2 - (s + 1) * segmentPitch + (segmentPitch - segmentHeight)
          ctx.fillStyle = s < litCount ? segmentColor(s) : 'rgba(57, 255, 20, 0.09)'
          ctx.fillRect(x, y, bar, segmentHeight)
        }
        const peakY = height - 2 - Math.round(peak[i] * segmentCount) * segmentPitch
        ctx.fillStyle = '#e6ffe0'
        ctx.fillRect(x, Math.max(2, peakY), bar, 1)
      }
    },
  }
}

const decodeMarquee = (canvas) => {
  const strip = setup(canvas, 18)
  const { ctx, width, height } = strip
  ctx.font = mono(11)
  ctx.textBaseline = 'middle'
  const TRACKING = 1.08
  const CRAWL_PX_PER_S = 55
  const FRONT_PERIOD_MS = 1400
  const FRONT_OVERSCAN = 40
  const FRONT_RADIUS = 22
  const CORRUPTION_CHANCE = 0.012
  const CORRUPTION_MIN_MS = 60
  const CORRUPTION_MAX_MS = 260
  const FIRST_GLITCH_AT_MS = 350
  const GLITCH_MIN_MS = 40
  const GLITCH_MAX_MS = 110
  const GLITCH_GAP_MIN_MS = 150
  const GLITCH_GAP_MAX_MS = 480
  const message = '>> INCOMING TRANSMISSION :: READ ME :: '
  const advance = ctx.measureText('0').width * TRACKING
  const messageWidth = message.length * advance
  const text = message.repeat(Math.ceil(width / messageWidth) + 1)
  const shoutStart = message.indexOf('READ ME')
  const shoutEnd = shoutStart + 'READ ME'.length
  const ROLE_COLORS = { shout: '#e6ffe0', plain: PHOSPHOR, dim: '#2f9a3a' }
  const roleOf = (index) => {
    const local = index % message.length
    if (local >= shoutStart && local < shoutEnd) return 'shout'
    return '>:'.includes(message[local]) ? 'dim' : 'plain'
  }
  const corruptionLeft = new Float32Array(text.length)
  const shown = [...text]
  const scrambled = new Array(text.length).fill(false)
  let glitch = null
  let nextGlitchAt = FIRST_GLITCH_AT_MS

  const drawText = (offset, inverted, color = null, dx = 0) => {
    const y = height / 2 + 0.5
    for (let i = 0; i < text.length; i += 1) {
      const x = PAD - offset + i * advance + dx
      if (x < -advance || x > width || text[i] === ' ') continue
      ctx.fillStyle = color ?? (inverted ? INK_ON_PHOSPHOR : scrambled[i] ? '#f4fff0' : ROLE_COLORS[roleOf(i)])
      ctx.fillText(shown[i], x, y)
    }
  }

  const newGlitch = (t) => ({
    slices: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
      const h = Math.round(between(2, height * 0.45))
      return { y: Math.round(between(0, height - h)), h, dx: Math.round(between(-14, 14)) }
    }),
    blocks: Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
      x: between(0, width - 24),
      y: between(0, height - 4),
      w: between(4, 24),
      h: between(2, 5),
    })),
    until: t + between(GLITCH_MIN_MS, GLITCH_MAX_MS),
  })

  const currentGlitch = (t) => {
    if (glitch && t >= glitch.until) glitch = null
    if (!glitch && t >= nextGlitchAt) {
      glitch = newGlitch(t)
      nextGlitchAt = glitch.until + between(GLITCH_GAP_MIN_MS, GLITCH_GAP_MAX_MS)
    }
    return glitch
  }

  const drawGlitch = (offset, inverted) => {
    for (const { y, h, dx } of glitch.slices) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, y, width, h)
      ctx.clip()
      ctx.fillStyle = inverted ? PHOSPHOR : GROUND
      ctx.fillRect(0, y, width, h)
      drawText(offset, inverted, 'rgba(255, 60, 120, 0.85)', dx - 3)
      drawText(offset, inverted, 'rgba(60, 235, 255, 0.85)', dx + 3)
      drawText(offset, inverted, null, dx)
      ctx.restore()
    }
    ctx.fillStyle = inverted ? INK_ON_PHOSPHOR : '#8dff6a'
    for (const block of glitch.blocks) ctx.fillRect(block.x, block.y, block.w, block.h)
  }

  return {
    ...strip,
    frame(t, dt, inverted) {
      const offset = ((t / 1000) * CRAWL_PX_PER_S) % messageWidth
      const front = ((t / FRONT_PERIOD_MS) % 1) * (width + 2 * FRONT_OVERSCAN) - FRONT_OVERSCAN
      for (let i = 0; i < text.length; i += 1) {
        const x = PAD - offset + i * advance
        if (corruptionLeft[i] > 0) corruptionLeft[i] -= dt
        else if (chance(CORRUPTION_CHANCE)) corruptionLeft[i] = between(CORRUPTION_MIN_MS, CORRUPTION_MAX_MS)
        scrambled[i] = text[i] !== ' ' && (corruptionLeft[i] > 0 || Math.abs(x - front) < FRONT_RADIUS)
        shown[i] = scrambled[i] ? randomGlyph() : text[i]
      }
      paintGround(strip, inverted)
      drawText(offset, inverted)
      if (currentGlitch(t)) drawGlitch(offset, inverted)
    },
  }
}

const scanLog = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  ctx.font = mono(10)
  ctx.textBaseline = 'middle'
  const LINE_MS = 130
  const lineHeight = 12
  const ip = () => `10.0.${Math.floor(between(0, 255))}.${Math.floor(between(1, 254))}`
  const port = () => pick([22, 53, 80, 443, 8080, 5432, 6379, 3000])
  const hex4 = () => Array.from({ length: 4 }, () => pick(HEX)).join('')
  const templates = [
    () => ['+', `${ip()}:${port()} open`],
    () => ['*', `syn ${hex4()} ack ${hex4()}`],
    () => ['!', `tip queued ${hex4()}`],
    () => ['+', `sha256 ${hex4()}${hex4()} ok`],
    () => ['-', `${ip()} timeout`],
    () => ['*', `handshake ${hex4()}`],
    () => ['+', `${ip()}:${port()} open`],
  ]
  const TAG_COLORS = { '+': PHOSPHOR, '*': '#4be3ff', '!': '#ffb02b', '-': '#5f8f5f' }
  const spinner = '|/-\\'
  const lines = Array.from({ length: 3 }, () => pick(templates)())
  let lastLineAt = 0
  let frames = 0

  return {
    ...strip,
    frame(t, dt, inverted) {
      frames += 1
      if (t - lastLineAt >= LINE_MS) {
        lastLineAt = t
        lines.push(pick(templates)())
        if (lines.length > 3) lines.shift()
      }
      const slide = lineHeight * (1 - (t - lastLineAt) / LINE_MS)
      paintGround(strip, inverted)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, width - 64, height)
      ctx.clip()
      lines.forEach(([tag, text], index) => {
        const fromBottom = lines.length - 1 - index
        const y = height - 7 - fromBottom * lineHeight + slide
        const blinkOff = tag === '!' && Math.floor(t / 100) % 2 === 1
        ctx.fillStyle = inverted ? INK_ON_PHOSPHOR : blinkOff ? '#7a4a00' : TAG_COLORS[tag]
        ctx.fillText(`[${tag}]`, PAD, y)
        ctx.fillStyle = inverted ? INK_ON_PHOSPHOR : '#8fe86d'
        ctx.fillText(text, PAD + 26, y)
      })
      ctx.restore()
      ctx.fillStyle = inverted ? INK_ON_PHOSPHOR : '#e6ffe0'
      ctx.textAlign = 'right'
      const counter = frames.toString(16).toUpperCase().padStart(4, '0').slice(-4)
      ctx.fillText(`0x${counter}`, width - PAD - 12, height / 2 + 0.5)
      ctx.fillText(spinner[Math.floor(t / 125) % 4], width - PAD, height / 2 + 0.5)
      ctx.textAlign = 'left'
    },
  }
}

const PALETTES = {
  hackerspace: { ground: GROUND, edge: '#0f3a17', halo: 'rgba(57, 255, 20, 0.3)', bell: PHOSPHOR, bellHalo: 'rgba(57, 255, 20, 0.85)' },
  arcade: { ground: '#0b0b2a', edge: '#2a2a6a', halo: 'rgba(124, 245, 255, 0.35)', bell: '#ffe14a', bellHalo: 'rgba(255, 225, 74, 0.85)' },
  markets: { ground: '#0a0f1a', edge: '#1d2a44', halo: 'rgba(255, 176, 0, 0.3)', bell: '#ffb000', bellHalo: 'rgba(255, 176, 0, 0.85)' },
  cardio: { ground: '#140a0a', edge: '#4a1616', halo: 'rgba(255, 90, 60, 0.35)', bell: '#ff5a3c', bellHalo: 'rgba(255, 90, 60, 0.85)' },
  breathe: { ground: '#0e1a1c', edge: '#245a5e', halo: 'rgba(159, 232, 222, 0.3)', bell: '#9fe8de', bellHalo: 'rgba(159, 232, 222, 0.8)' },
  bloom: { ground: '#2a1a26', edge: '#6a3a5a', halo: 'rgba(255, 194, 214, 0.35)', bell: '#ffc2d6', bellHalo: 'rgba(255, 194, 214, 0.85)' },
  lofi: { ground: '#141824', edge: '#3a3f5a', halo: 'rgba(201, 184, 255, 0.3)', bell: '#c9b8ff', bellHalo: 'rgba(201, 184, 255, 0.8)' },
}

const clear = ({ ctx, width, height }, color) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
}

const flash = (canvas, on) => canvas.classList.toggle('bell', on)
const sans = (px) => `600 ${px}px -apple-system, BlinkMacSystemFont, sans-serif`
const label = (ctx, text, x, y, color, align = 'left') => {
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.textAlign = 'left'
}

const INVADER = ['00100100', '00111100', '01111110', '11011011', '11111111', '01011010', '10000001', '01000010']
const INVADER_ALT = ['00100100', '10111101', '11111111', '11011011', '11111111', '00111100', '01000010', '10000001']

const invaders = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const px = 2
  const columns = Math.max(3, Math.min(8, Math.floor((width - 110) / 24)))
  const fleet = Array.from({ length: columns }, () => ({ alive: true }))
  let step = 0
  let direction = 1
  let offset = 0
  let bullet = null
  let lastStep = 0
  let lastShot = 0
  const draw = (bitmap, x, y, color) => {
    ctx.fillStyle = color
    bitmap.forEach((row, ry) => {
      ;[...row].forEach((bit, rx) => {
        if (bit === '1') ctx.fillRect(x + rx * px, y + ry * px, px, px)
      })
    })
  }
  return {
    frame(t, dt) {
      if (t - lastStep >= 420) {
        lastStep = t
        step += 1
        offset += direction * 4
        if (Math.abs(offset) >= 16) direction = -direction
      }
      const cannonX = PAD + (columns * 24 - 8) * (0.5 + 0.5 * Math.sin(t / 900))
      if (!bullet && t - lastShot > 900) {
        bullet = { x: cannonX + 3, y: height - 6 }
        lastShot = t
      }
      if (bullet) {
        bullet.y -= dt * 0.08
        const column = Math.round((bullet.x - PAD - 8 - offset) / 24)
        if (bullet.y < 19 && fleet[column]?.alive) {
          fleet[column].alive = false
          bullet = null
          if (fleet.every((invader) => !invader.alive)) fleet.forEach((invader) => (invader.alive = true))
        } else if (bullet.y < 0) bullet = null
      }
      clear(strip, PALETTES.arcade.ground)
      fleet.forEach((invader, column) => {
        if (invader.alive) draw(step % 2 ? INVADER : INVADER_ALT, PAD + column * 24 + offset, 3, '#7cf5ff')
      })
      if (bullet) {
        ctx.fillStyle = '#ffe14a'
        ctx.fillRect(bullet.x, bullet.y, px, 4)
      }
      ctx.fillStyle = '#ff4fd8'
      ctx.fillRect(cannonX, height - 5, 8, 3)
      ctx.fillRect(cannonX + 3, height - 7, 2, 2)
      const coin = Math.floor(t / 500) % 2 === 0
      ctx.font = mono(9)
      label(ctx, 'INSERT COIN', width - PAD, height / 2, coin ? '#ffe14a' : '#3a3a7a', 'right')
      flash(canvas, Math.floor(t / 500) % 6 === 0)
    },
  }
}

const sideScroller = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const groundY = height - 6
  const hills = Array.from({ length: 12 }, (_, i) => ({ x: i * 40, h: between(4, 10) }))
  const obstacle = { x: width + 40 }
  const hero = { x: 30 }
  let distance = 0
  let score = 0
  let jumping = false
  let jumpStart = 0
  return {
    frame(t, dt) {
      const speed = dt * 0.09
      distance += speed
      for (const hill of hills) {
        hill.x -= speed * 0.4
        if (hill.x < -40) {
          hill.x += hills.length * 40
          hill.h = between(4, 10)
        }
      }
      obstacle.x -= speed
      if (obstacle.x < -10) {
        obstacle.x = width + between(60, 220)
        score += 1
      }
      const gap = obstacle.x - hero.x
      if (!jumping && gap > 0 && gap < 36) {
        jumping = true
        jumpStart = t
      }
      let lift = 0
      if (jumping) {
        const phase = (t - jumpStart) / 520
        if (phase >= 1) jumping = false
        else lift = Math.sin(phase * Math.PI) * 12
      }
      clear(strip, PALETTES.arcade.ground)
      ctx.fillStyle = '#1e1e5a'
      for (const hill of hills) ctx.fillRect(hill.x, groundY - hill.h, 40, hill.h)
      ctx.fillStyle = '#4a4aa8'
      ctx.fillRect(0, groundY, width, 2)
      ctx.fillStyle = '#5ee36b'
      ctx.fillRect(obstacle.x, groundY - 8, 6, 8)
      ctx.fillRect(obstacle.x - 2, groundY - 5, 2, 2)
      ctx.fillRect(obstacle.x + 6, groundY - 6, 2, 2)
      const y = groundY - 10 - lift
      ctx.fillStyle = '#ffe14a'
      ctx.fillRect(hero.x, y, 6, 6)
      ctx.fillRect(hero.x + 1, y + 6, 2, 4)
      ctx.fillRect(hero.x + 4, y + 6 + (Math.floor(t / 120) % 2) * 2, 2, 2)
      ctx.font = mono(9)
      label(ctx, String(score * 100 + Math.floor(distance / 10)).padStart(6, '0'), width - PAD, 8, '#e8e8ff', 'right')
      flash(canvas, jumping)
    },
  }
}

const TICKER_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOG', 'META', 'BTC', 'ETH', 'SPY', 'QQQ', 'AMD']

const tape = (canvas) => {
  const strip = setup(canvas, 22)
  const { ctx, width, height } = strip
  const quotes = TICKER_SYMBOLS.map((symbol) => ({ symbol, price: between(20, 900), change: between(-3, 3) }))
  const quoteText = (quote) => `${quote.price.toFixed(2)} ${quote.change >= 0 ? '▲' : '▼'}${Math.abs(quote.change).toFixed(2)}%`
  let offset = width
  let lastTick = 0
  let hot = -1
  let hotUntil = 0
  return {
    frame(t, dt) {
      offset += dt * 0.045
      if (t - lastTick > 700) {
        lastTick = t
        const quote = pick(quotes)
        const move = between(-1.2, 1.2)
        quote.change = Math.max(-9, Math.min(9, quote.change + move))
        quote.price = Math.max(1, quote.price * (1 + move / 100))
        if (Math.abs(move) > 0.9) {
          hot = quotes.indexOf(quote)
          hotUntil = t + 600
        }
      }
      clear(strip, PALETTES.markets.ground)
      ctx.font = mono(10)
      ctx.textBaseline = 'middle'
      const widths = quotes.map((quote) => ctx.measureText(`${quote.symbol} ${quoteText(quote)}`).width + 22)
      const total = widths.reduce((sum, w) => sum + w, 0)
      let x = width - (offset % total)
      for (let pass = 0; pass < 2; pass += 1) {
        quotes.forEach((quote, i) => {
          if (x + widths[i] > 0 && x < width) {
            const lit = i === hot && t < hotUntil
            ctx.fillStyle = lit ? '#ffb000' : '#d8dee9'
            ctx.fillText(quote.symbol, x, height / 2)
            ctx.fillStyle = lit ? '#ffb000' : quote.change >= 0 ? '#2fd36b' : '#ff4d4d'
            ctx.fillText(quoteText(quote), x + ctx.measureText(`${quote.symbol} `).width, height / 2)
          }
          x += widths[i]
        })
      }
      flash(canvas, hot >= 0 && t < hotUntil)
    },
  }
}

const candles = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const pitch = 6
  const count = Math.floor((width - 2 * PAD) / pitch)
  let price = 100
  const bar = (open, close) => ({ open, close, high: Math.max(open, close) + between(0, 1.5), low: Math.min(open, close) - between(0, 1.5) })
  const bars = Array.from({ length: count }, () => {
    const open = price
    price += between(-2, 2)
    return bar(open, price)
  })
  let lastBar = 0
  let bigUntil = 0
  return {
    frame(t) {
      if (t - lastBar > 320) {
        lastBar = t
        const open = price
        const move = chance(0.12) ? between(-6, 6) : between(-2, 2)
        price = Math.max(20, price + move)
        bars.push(bar(open, price))
        bars.shift()
        if (Math.abs(move) > 4) bigUntil = t + 500
      }
      const min = Math.min(...bars.map((b) => b.low))
      const max = Math.max(...bars.map((b) => b.high))
      const y = (value) => height - 3 - ((value - min) / (max - min || 1)) * (height - 6)
      clear(strip, PALETTES.markets.ground)
      ctx.lineWidth = 1
      ctx.strokeStyle = PALETTES.markets.edge
      for (let gy = 4; gy < height; gy += 6) {
        ctx.beginPath()
        ctx.moveTo(0, gy + 0.5)
        ctx.lineTo(width, gy + 0.5)
        ctx.stroke()
      }
      const slide = ((t - lastBar) / 320) * pitch
      bars.forEach((candle, i) => {
        const x = PAD + i * pitch - slide
        const color = candle.close >= candle.open ? '#2fd36b' : '#ff4d4d'
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(x + 2.5, y(candle.high))
        ctx.lineTo(x + 2.5, y(candle.low))
        ctx.stroke()
        const top = y(Math.max(candle.open, candle.close))
        ctx.fillRect(x + 1, top, 3, Math.max(1, y(Math.min(candle.open, candle.close)) - top))
      })
      ctx.strokeStyle = '#ffb000'
      ctx.beginPath()
      bars.forEach((_, i) => {
        const window = bars.slice(Math.max(0, i - 7), i + 1)
        const average = window.reduce((sum, b) => sum + b.close, 0) / window.length
        const x = PAD + i * pitch + 2.5 - slide
        i ? ctx.lineTo(x, y(average)) : ctx.moveTo(x, y(average))
      })
      ctx.stroke()
      flash(canvas, t < bigUntil)
    },
  }
}

const heartbeat = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const period = 800
  const sampleMs = 1000 / 120
  const samples = new Float32Array(width)
  let cursor = 0
  let clock = 0
  const pulse = (phase) => {
    if (phase < 40) return -0.15 * Math.sin((phase / 40) * Math.PI)
    if (phase < 100) return Math.sin(((phase - 40) / 60) * Math.PI)
    if (phase < 140) return -0.35 * Math.sin(((phase - 100) / 40) * Math.PI)
    if (phase >= 200 && phase < 320) return 0.2 * Math.sin(((phase - 200) / 120) * Math.PI)
    return 0
  }
  return {
    frame(t) {
      if (t - clock > width * sampleMs) clock = t - width * sampleMs
      while (clock < t) {
        samples[cursor] = pulse(clock % period)
        cursor = (cursor + 1) % width
        clock += sampleMs
      }
      clear(strip, PALETTES.cardio.ground)
      ctx.lineWidth = 1
      ctx.strokeStyle = '#3a1414'
      for (let gx = 0; gx < width; gx += 12) {
        ctx.beginPath()
        ctx.moveTo(gx + 0.5, 0)
        ctx.lineTo(gx + 0.5, height)
        ctx.stroke()
      }
      ctx.strokeStyle = '#ff5a3c'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = 0; x < width - 56; x += 1) {
        const y = height * 0.6 - samples[(cursor + x) % width] * (height * 0.45)
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.stroke()
      ctx.font = mono(10)
      label(ctx, `${Math.round(60000 / period)} bpm`, width - PAD, height / 2, '#ffd6cc', 'right')
      flash(canvas, Math.floor(t / period) % 4 === 0 && t % period < 120)
    },
  }
}

const splits = (canvas) => {
  const strip = setup(canvas, 24)
  const { ctx, width, height } = strip
  const laneY = height - 6
  const split = (km) => {
    const pace = Math.round(240 + between(-25, 25))
    return `${km} km ${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')}`
  }
  const log = [split(2), split(1)]
  let distance = 2000
  let lastKm = 2000
  let flashUntil = 0
  return {
    frame(t, dt) {
      distance += dt * 0.2
      if (distance - lastKm >= 1000) {
        lastKm += 1000
        log.unshift(split(lastKm / 1000))
        if (log.length > 3) log.pop()
        flashUntil = t + 600
      }
      clear(strip, PALETTES.cardio.ground)
      ctx.lineWidth = 1
      ctx.strokeStyle = PALETTES.cardio.edge
      ctx.setLineDash([6, 6])
      ctx.lineDashOffset = -((t / 8) % 12)
      ctx.beginPath()
      ctx.moveTo(0, laneY + 0.5)
      ctx.lineTo(width, laneY + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
      const bob = Math.abs(Math.sin(t / 110)) * 2
      ctx.fillStyle = '#ff5a3c'
      ctx.beginPath()
      ctx.arc(88, laneY - 6 - bob, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(87, laneY - 3 - bob, 2, 3)
      ctx.font = mono(9)
      label(ctx, `${(distance / 1000).toFixed(2)} km`, PAD, 7, '#ffd6cc')
      log.forEach((entry, i) => label(ctx, entry, width - PAD - i * 74, 7, i === 0 && t < flashUntil ? '#ff5a3c' : '#a8756b', 'right'))
      flash(canvas, t < flashUntil)
    },
  }
}

const ring = (canvas) => {
  const strip = setup(canvas, 28)
  const { ctx, width, height } = strip
  const cycle = [['in', 4000], ['hold', 4000], ['out', 4000]]
  const total = cycle.reduce((sum, [, ms]) => sum + ms, 0)
  return {
    frame(t) {
      let phase = t % total
      let stage = 0
      while (phase >= cycle[stage][1]) {
        phase -= cycle[stage][1]
        stage += 1
      }
      const progress = phase / cycle[stage][1]
      const size = stage === 0 ? progress : stage === 1 ? 1 : 1 - progress
      const eased = 0.5 - 0.5 * Math.cos(size * Math.PI)
      clear(strip, PALETTES.breathe.ground)
      const cx = 20
      const cy = height / 2
      const radius = 4 + eased * 8
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius + 4)
      gradient.addColorStop(0, 'rgba(159, 232, 222, 0.9)')
      gradient.addColorStop(1, 'rgba(159, 232, 222, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#9fe8de'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.font = sans(11)
      label(ctx, `breathe ${cycle[stage][0]}`, 44, cy, '#cdeee9')
      const barX = 136
      const barW = width - barX - PAD
      ctx.fillStyle = PALETTES.breathe.edge
      ctx.fillRect(barX, cy - 1, barW, 2)
      ctx.fillStyle = '#9fe8de'
      ctx.fillRect(barX, cy - 1, barW * progress, 2)
      flash(canvas, stage === 0 && progress < 0.15)
    },
  }
}

const waves = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const layers = [
    { amp: 4, len: 90, speed: 0.0008, color: 'rgba(120, 220, 210, 0.35)' },
    { amp: 3, len: 60, speed: -0.0012, color: 'rgba(120, 220, 210, 0.5)' },
    { amp: 2, len: 40, speed: 0.0016, color: 'rgba(200, 245, 240, 0.7)' },
  ]
  return {
    frame(t) {
      clear(strip, PALETTES.breathe.ground)
      ctx.lineWidth = 1.2
      for (const layer of layers) {
        ctx.strokeStyle = layer.color
        ctx.beginPath()
        for (let x = 0; x <= width; x += 2) {
          const y = height / 2 + Math.sin((x / layer.len) * Math.PI * 2 + t * layer.speed) * layer.amp
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        ctx.stroke()
      }
      const glowOn = t % 6000 < 400
      ctx.fillStyle = '#9fe8de'
      ctx.beginPath()
      ctx.arc(width - 24, height / 2 + Math.sin(t / 700) * 3, glowOn ? 3 : 2, 0, Math.PI * 2)
      ctx.fill()
      flash(canvas, glowOn)
    },
  }
}

const PETAL_COLORS = ['#ffc2d6', '#ffd9a8', '#e9c3ff', '#ffe9ef', '#ffb3c8']

const petals = (canvas) => {
  const strip = setup(canvas, 28)
  const { ctx, width, height } = strip
  const newPetal = (fromAbove) => ({
    x: between(0, width),
    y: fromAbove ? between(-12, -2) : between(0, height),
    size: between(2.5, 4.5),
    drift: between(-0.01, 0.01),
    fall: between(0.008, 0.018),
    spin: between(-0.004, 0.004),
    angle: between(0, Math.PI * 2),
    color: pick(PETAL_COLORS),
  })
  const flock = Array.from({ length: 22 }, () => newPetal(false))
  return {
    frame(t, dt) {
      clear(strip, PALETTES.bloom.ground)
      const pulse = t % 4000 < 500
      for (const petal of flock) {
        petal.x += (petal.drift + Math.sin(t / 900 + petal.y) * 0.01) * dt
        petal.y += petal.fall * dt
        petal.angle += petal.spin * dt
        if (petal.y > height + 6 || petal.x < -8 || petal.x > width + 8) Object.assign(petal, newPetal(true))
        ctx.save()
        ctx.translate(petal.x, petal.y)
        ctx.rotate(petal.angle)
        ctx.fillStyle = petal.color
        ctx.globalAlpha = pulse ? 1 : 0.85
        ctx.beginPath()
        ctx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      flash(canvas, pulse)
    },
  }
}

const bokeh = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const orbs = Array.from({ length: 14 }, () => ({
    x: between(0, width),
    y: between(0, height),
    r: between(4, 11),
    vx: between(-0.006, 0.006),
    color: pick(['255, 194, 214', '255, 217, 168', '233, 195, 255', '255, 233, 239']),
    phase: between(0, Math.PI * 2),
  }))
  return {
    frame(t, dt) {
      clear(strip, PALETTES.bloom.ground)
      const pulse = t % 5000 < 600
      for (const orb of orbs) {
        orb.x += orb.vx * dt
        if (orb.x < -orb.r) orb.x = width + orb.r
        if (orb.x > width + orb.r) orb.x = -orb.r
        const alpha = 0.25 + 0.2 * Math.sin(t / 1300 + orb.phase) + (pulse ? 0.2 : 0)
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
        gradient.addColorStop(0, `rgba(${orb.color}, ${alpha})`)
        gradient.addColorStop(0.7, `rgba(${orb.color}, ${alpha * 0.6})`)
        gradient.addColorStop(1, `rgba(${orb.color}, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
        ctx.fill()
      }
      flash(canvas, pulse)
    },
  }
}

const rain = (canvas) => {
  const strip = setup(canvas, 28)
  const { ctx, width, height } = strip
  const lights = Array.from({ length: 10 }, () => ({
    x: between(0, width),
    y: between(6, height - 4),
    r: between(2, 5),
    color: pick(['255, 200, 120', '201, 184, 255', '120, 200, 255']),
  }))
  const drops = Array.from({ length: 40 }, () => ({ x: between(0, width), y: between(0, height), len: between(4, 9), speed: between(0.05, 0.11) }))
  let lightning = -10000
  return {
    frame(t, dt) {
      if (t - lightning > 5000 && chance(0.01)) lightning = t
      const bolt = t - lightning < 160
      clear(strip, bolt ? '#2a2f44' : PALETTES.lofi.ground)
      for (const light of lights) {
        const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r * 2)
        gradient.addColorStop(0, `rgba(${light.color}, 0.55)`)
        gradient.addColorStop(1, `rgba(${light.color}, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(light.x, light.y, light.r * 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(201, 184, 255, 0.6)'
      ctx.lineWidth = 1
      for (const drop of drops) {
        drop.y += drop.speed * dt
        drop.x -= drop.speed * dt * 0.15
        if (drop.y > height) {
          drop.y = -drop.len
          drop.x = between(0, width + 10)
        }
        ctx.beginPath()
        ctx.moveTo(drop.x, drop.y)
        ctx.lineTo(drop.x - 1, drop.y + drop.len)
        ctx.stroke()
      }
      flash(canvas, bolt)
    },
  }
}

const cassette = (canvas) => {
  const strip = setup(canvas, 26)
  const { ctx, width, height } = strip
  const bars = 10
  const level = new Float32Array(bars)
  let peakUntil = 0
  let lastPeak = -10000
  const reel = (cx, cy, angle) => {
    ctx.strokeStyle = '#c9b8ff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 3; i += 1) {
      const a = angle + (i * Math.PI * 2) / 3
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2)
      ctx.lineTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5)
      ctx.stroke()
    }
  }
  return {
    frame(t) {
      clear(strip, PALETTES.lofi.ground)
      ctx.fillStyle = '#1f2436'
      ctx.fillRect(PAD, 3, 52, height - 6)
      reel(PAD + 14, height / 2, t / 400)
      reel(PAD + 38, height / 2, t / 400)
      ctx.font = mono(9)
      label(ctx, 'lo-fi beats to think to', PAD + 62, height / 2, '#c9b8ff')
      let peak = 0
      for (let i = 0; i < bars; i += 1) {
        const target = Math.min(1, 0.3 + 0.5 * Math.abs(Math.sin(t / (260 + i * 37) + i)) + (chance(0.03) ? 0.3 : 0))
        level[i] += (target - level[i]) * (target > level[i] ? 0.5 : 0.15)
        peak = Math.max(peak, level[i])
        const x = width - PAD - (bars - i) * 7
        const h = level[i] * (height - 8)
        ctx.fillStyle = level[i] > 0.85 ? '#ff7ab8' : '#c9b8ff'
        ctx.fillRect(x, height - 4 - h, 5, h)
      }
      if (peak > 0.9 && t - lastPeak > 2000) {
        peakUntil = t + 200
        lastPeak = t
      }
      flash(canvas, t < peakUntil)
    },
  }
}

const plain = (inner) => (canvas) => ({ name: inner.name, ...inner(canvas) })

const hacker = (inner) => (canvas) => {
  const runner = inner(canvas)
  return {
    name: inner.name,
    frame(t, dt) {
      const inverted = bellIsOn(t)
      runner.frame(t, dt, inverted)
      if (!inverted) glow(runner)
      scanlines(runner)
      flash(canvas, inverted)
    },
  }
}

const PRESETS = {
  hackerspace: { ...PALETTES.hackerspace, ambient: [matrixRain, decodeMarquee, scanLog].map(hacker), loud: hacker(spectrum) },
  arcade: { ...PALETTES.arcade, ambient: [invaders, sideScroller].map(plain) },
  bloom: { ...PALETTES.bloom, ambient: [petals, bokeh].map(plain) },
  breathe: { ...PALETTES.breathe, ambient: [ring, waves].map(plain) },
  cardio: { ...PALETTES.cardio, ambient: [heartbeat, splits].map(plain) },
  lofi: { ...PALETTES.lofi, ambient: [rain, cassette].map(plain) },
  markets: { ...PALETTES.markets, ambient: [tape, candles].map(plain) },
}

const PALETTE = ['ground', 'edge', 'halo', 'bell', 'bellHalo']
const cssName = (key) => `--beacon-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`

window.BEACONS = {
  ids: Object.keys(PRESETS),
  start(canvas, id, loudMusic) {
    const presetId = Object.hasOwn(PRESETS, id) ? id : 'hackerspace'
    const preset = PRESETS[presetId]
    for (const key of PALETTE) canvas.style.setProperty(cssName(key), preset[key])
    canvas.classList.remove('bell')
    const factory = loudMusic && preset.loud ? preset.loud : pick(preset.ambient)
    const runner = factory(canvas)
    canvas.dataset.preset = presetId
    canvas.dataset.animation = runner.name
    return runner
  },
}
