import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { pickerLabel, storedLabels, withLabel } from './task-labels.js'

describe('storedLabels', () => {
  it('reads one label per category', () => {
    assert.deepEqual(storedLabels({ labels: { work: 'Billing page', side: 'Landing copy' } }, 'work'), {
      work: 'Billing page',
      side: 'Landing copy',
    })
  })

  it('gives the single label an earlier release kept to the active category', () => {
    assert.deepEqual(storedLabels({ label: 'MNJ, LD.be, UMP' }, 'process'), { process: 'MNJ, LD.be, UMP' })
  })

  it('starts empty when there is no file or the earlier label was blank', () => {
    assert.deepEqual(storedLabels(null, 'work'), {})
    assert.deepEqual(storedLabels({ label: '  ' }, 'work'), {})
  })

  it('drops blank and malformed entries', () => {
    assert.deepEqual(storedLabels({ labels: { work: ' Billing ', side: '', odd: 7 } }, 'work'), { work: 'Billing' })
  })
})

describe('withLabel', () => {
  it('sets the label of one category and leaves the others alone', () => {
    const before = { work: 'Billing page', side: 'Landing copy' }
    assert.deepEqual(withLabel(before, 'side', ' Pricing table '), { work: 'Billing page', side: 'Pricing table' })
    assert.deepEqual(before, { work: 'Billing page', side: 'Landing copy' })
  })

  it('forgets the label of a category that is cleared', () => {
    assert.deepEqual(withLabel({ work: 'Billing page', side: 'Landing copy' }, 'side', ''), { work: 'Billing page' })
  })
})

describe('pickerLabel', () => {
  it('shows what you are working on next to the category', () => {
    assert.equal(pickerLabel('latindance.be', 'Festival page'), 'latindance.be · Festival page')
  })

  it('shows the bare name when nothing is set', () => {
    assert.equal(pickerLabel('Freelance', ''), 'Freelance')
  })
})
