import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { createCardSlot } from './card-slot.js'

const fakeWindow = () => {
  const window = {
    closeCalls: 0,
    destroyed: false,
    isDestroyed: () => window.destroyed,
    close: () => {
      window.closeCalls += 1
    },
  }
  return window
}

describe('close', () => {
  it('closes the window it holds and empties the slot', () => {
    const slot = createCardSlot()
    const window = fakeWindow()
    slot.open(window, { title: 'A tip' })
    slot.close()
    assert.equal(window.closeCalls, 1)
    assert.equal(slot.isEmpty(), true)
    assert.equal(slot.card(), null)
  })

  it('leaves an already destroyed window alone and still empties the slot', () => {
    const slot = createCardSlot()
    const window = fakeWindow()
    slot.open(window, { title: 'A tip' })
    window.destroyed = true
    slot.close()
    assert.equal(window.closeCalls, 0)
    assert.equal(slot.isEmpty(), true)
  })
})

describe('open', () => {
  it('closes the card it is already holding', () => {
    const slot = createCardSlot()
    const first = fakeWindow()
    const second = fakeWindow()
    slot.open(first, { title: 'A tip' })
    slot.open(second, { title: 'Switch to Client work' })
    assert.equal(first.closeCalls, 1)
    assert.equal(slot.window(), second)
  })
})

describe('closed', () => {
  it('keeps the card a replacement opened, since the closed window reports back later', () => {
    const slot = createCardSlot()
    const first = fakeWindow()
    const second = fakeWindow()
    slot.open(first, { title: 'A tip' })
    slot.close()
    slot.open(second, { title: 'Switch to Client work' })
    first.destroyed = true
    slot.closed(first)
    assert.equal(slot.window(), second)
    assert.deepEqual(slot.card(), { title: 'Switch to Client work' })
    slot.close()
    assert.equal(second.closeCalls, 1)
  })

  it('empties the slot when the window it holds reports closed', () => {
    const slot = createCardSlot()
    const window = fakeWindow()
    slot.open(window, { title: 'A tip' })
    slot.closed(window)
    assert.equal(slot.isEmpty(), true)
  })
})

describe('the closing report', () => {
  const recorded = () => {
    const closings = []
    const slot = createCardSlot((card, reason) => closings.push([card.title, reason]))
    return { slot, closings }
  }

  it('says once why each card went away, whichever way it did', () => {
    const { slot, closings } = recorded()
    const first = fakeWindow()
    const second = fakeWindow()
    const third = fakeWindow()
    slot.open(first, { title: 'First' })
    slot.open(second, { title: 'Second' })
    slot.close('got-it')
    slot.closed(second)
    slot.open(third, { title: 'Third' })
    slot.closed(third)
    slot.close('quit')
    assert.deepEqual(closings, [
      ['First', 'replaced'],
      ['Second', 'got-it'],
      ['Third', 'window-closed'],
    ])
  })
})

describe('window', () => {
  it('reads as empty once the window it holds is destroyed', () => {
    const slot = createCardSlot()
    const window = fakeWindow()
    slot.open(window, { title: 'A tip' })
    window.destroyed = true
    assert.equal(slot.window(), null)
    assert.equal(slot.isEmpty(), true)
  })
})
