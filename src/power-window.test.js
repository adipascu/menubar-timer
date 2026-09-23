import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { createWindow, WINDOW_SAMPLES } from './power-window.js'

const filled = (watts, count = WINDOW_SAMPLES) => {
  const window = createWindow()
  for (let sample = 0; sample < count; sample += 1) window.push(watts)
  return window
}

const holding = (samples) => {
  const window = createWindow()
  for (const watts of samples) window.push(watts)
  return window
}

describe('a window of readings', () => {
  it('is not full until it has the whole five minutes', () => {
    assert.equal(filled(12, WINDOW_SAMPLES - 1).full(), false)
    assert.equal(filled(12).full(), true)
  })

  it('keeps only the most recent five minutes', () => {
    const window = holding([...Array(WINDOW_SAMPLES).fill(1), 40, 40, 40, 40, 40, 40])
    assert.equal(window.size(), WINDOW_SAMPLES)
    assert.equal(window.sustained(), 40)
  })

  it('reads the median, so one spike does not carry it', () => {
    assert.equal(holding([3, 3, 3, 3, 3, 3, 3, 3, 3, 90]).sustained(), 3)
  })

  it('reads a load that arrived halfway as the load, not the average', () => {
    assert.equal(holding([0, 0, 0, 0, 0, 30, 30, 30, 30, 30]).sustained(), 30)
  })

  it('rounds to a tenth of a watt', () => {
    assert.equal(filled(14.678).sustained(), 14.7)
  })

  it('empties on clear, so a window that sat through sleep is not read as five minutes', () => {
    const window = filled(30)
    window.clear()
    assert.equal(window.size(), 0)
    assert.equal(window.full(), false)
  })

  it('counts up from empty again after being cleared', () => {
    const window = filled(30)
    window.clear()
    window.push(8)
    assert.equal(window.size(), 1)
    assert.equal(window.sustained(), 8)
  })
})
