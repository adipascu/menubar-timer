import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { batteryLabel } from './battery-label.js'

describe('batteryLabel', () => {
  it('shows only the charge on battery, whatever rating the last adapter left behind', () => {
    assert.equal(batteryLabel({ percent: 53, onBattery: true, charging: false, adapterWatts: 60 }), 'Battery 53%')
  })

  it('names the charger rating while charging', () => {
    assert.equal(
      batteryLabel({ percent: 53, onBattery: false, charging: true, adapterWatts: 60 }),
      'Battery 53% · charging · 60 W charger',
    )
  })

  it('names the charger rating while plugged in and holding', () => {
    assert.equal(
      batteryLabel({ percent: 80, onBattery: false, charging: false, adapterWatts: 96 }),
      'Battery 80% · plugged in · 96 W charger',
    )
  })

  it('leaves the rating out when the adapter does not report one', () => {
    assert.equal(
      batteryLabel({ percent: 80, onBattery: false, charging: true, adapterWatts: null }),
      'Battery 80% · charging',
    )
  })
})
