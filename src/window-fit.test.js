import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { contentHeightWithin, keptInside, openingBounds } from './window-fit.js'

const laptop = { x: 0, y: 25, width: 1440, height: 875 }
const secondScreen = { x: 1440, y: -200, width: 1920, height: 1055 }

describe('contentHeightWithin', () => {
  it('gives the content all the height it asks for when the screen has room', () => {
    assert.equal(contentHeightWithin(412.3, laptop, 28), 413)
  })

  it('stops at the screen height less the title bar so the window never runs off screen', () => {
    assert.equal(contentHeightWithin(2000, laptop, 28), 847)
  })
})

describe('keptInside', () => {
  it('leaves a window that already fits where it is', () => {
    const bounds = { x: 100, y: 200, width: 560, height: 400 }
    assert.deepEqual(keptInside(bounds, laptop), bounds)
  })

  it('pulls a window that grew past the bottom back up onto the screen', () => {
    assert.deepEqual(keptInside({ x: 100, y: 600, width: 560, height: 400 }, laptop), {
      x: 100,
      y: 500,
      width: 560,
      height: 400,
    })
  })

  it('pulls a window hanging off the left or the top back in', () => {
    assert.deepEqual(keptInside({ x: -50, y: 0, width: 560, height: 400 }, laptop), {
      x: 0,
      y: 25,
      width: 560,
      height: 400,
    })
  })

  it('pins a window taller than the screen to the top so its title bar stays reachable', () => {
    assert.equal(keptInside({ x: 0, y: 300, width: 560, height: 1200 }, laptop).y, 25)
  })
})

describe('openingBounds', () => {
  it('centres the window a little below the top of the screen it opens on', () => {
    assert.deepEqual(openingBounds({ width: 560, height: 400 }, secondScreen), {
      x: 2120,
      y: -110,
      width: 560,
      height: 400,
    })
  })

  it('opens higher when the window would otherwise reach past the bottom', () => {
    assert.equal(openingBounds({ width: 560, height: 860 }, laptop).y, 40)
  })
})
