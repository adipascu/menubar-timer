import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { chargerHere, markedHere, withChargerToggled } from './charger-rules.js'

const home = { id: 'aa:bb', ssid: 'Home' }
const cafe = { id: 'cc:dd', ssid: 'Cafe' }

describe('chargerHere', () => {
  it('counts on a charger at a network nobody has marked yet', () => {
    assert.equal(chargerHere([], 'ee:ff'), true)
  })

  it('does not count on one with no network at all, where nothing could be unticked', () => {
    assert.equal(chargerHere([], null), false)
  })

  it('keeps a place marked by an earlier release as having a charger', () => {
    assert.equal(chargerHere([home], home.id), true)
  })

  it('believes a network marked as having no charger', () => {
    assert.equal(chargerHere([{ ...cafe, charger: false }], cafe.id), false)
  })
})

describe('markedHere', () => {
  it('tells an explicit answer apart from the default', () => {
    assert.equal(markedHere([], cafe.id), undefined)
    assert.equal(markedHere([{ ...cafe, charger: false }], cafe.id), false)
    assert.equal(markedHere([{ ...home, charger: true }], home.id), true)
  })
})

describe('withChargerToggled', () => {
  it('records no charger at a network that was only assumed to have one', () => {
    assert.deepEqual(withChargerToggled([home], cafe), [home, { ...cafe, charger: false }])
  })

  it('flips an explicit answer back and keeps one entry per network', () => {
    const once = withChargerToggled([], cafe)
    assert.deepEqual(withChargerToggled(once, cafe), [{ ...cafe, charger: true }])
  })

  it('updates the name stored for a network when it is toggled again', () => {
    const renamed = { ...cafe, ssid: 'Cafe 5G' }
    assert.deepEqual(withChargerToggled([{ ...cafe, charger: false }], renamed), [{ ...renamed, charger: true }])
  })
})
