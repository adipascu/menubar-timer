import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { archived, proportional, redistributed, restored, shareTotal } from './shares.js'

const category = (id, share, extra = {}) => ({ id, name: id, color: 'gray', share, ...extra })

const mine = [
  category('latindance', 40),
  category('hourly', 30),
  category('belgabot', 10),
  category('process', 10),
  category('mynextjob', 10),
]

const shares = (categories) => Object.fromEntries(categories.map(({ id, share }) => [id, share]))

describe('proportional', () => {
  it('splits a total in proportion to the weights and lands on it exactly', () => {
    assert.deepEqual(proportional([50, 30, 20], 100), [50, 30, 20])
    assert.equal(
      proportional([7, 5, 3], 100).reduce((total, share) => total + share, 0),
      100,
    )
  })

  it('hands the rounding leftovers to the largest remainders, earliest first on a tie', () => {
    assert.deepEqual(proportional([1, 1, 1], 100), [34, 33, 33])
    assert.deepEqual(proportional([40, 30, 10, 10], 100), [45, 33, 11, 11])
  })

  it('splits evenly when nothing has a share to be proportional to', () => {
    assert.deepEqual(proportional([0, 0, 0], 100), [34, 33, 33])
  })

  it('hands nothing out when there is nobody to hand it to', () => {
    assert.deepEqual(proportional([], 100), [])
  })
})

describe('archived', () => {
  it('drops the category to zero and spreads its share over the others in proportion', () => {
    const after = archived(mine, 'mynextjob')
    assert.deepEqual(shares(after), { latindance: 45, hourly: 33, belgabot: 11, process: 11, mynextjob: 0 })
    assert.equal(shareTotal(after), 100)
  })

  it('remembers the share it had so a restore can give it back', () => {
    const gone = archived(mine, 'mynextjob').find(({ id }) => id === 'mynextjob')
    assert.equal(gone.archived, true)
    assert.equal(gone.archivedShare, 10)
  })

  it('keeps a total below 100 where it was, leaving the unassigned part unassigned', () => {
    const partial = [category('a', 30), category('b', 30), category('c', 30)]
    assert.equal(shareTotal(archived(partial, 'c')), 90)
  })

  it('hands the share to the others evenly when all of them sat at zero', () => {
    const after = archived([category('only', 100), category('idle', 0), category('spare', 0)], 'only')
    assert.deepEqual(shares(after), { only: 0, idle: 50, spare: 50 })
  })

  it('leaves an already archived category and the others alone', () => {
    const once = archived(mine, 'mynextjob')
    assert.deepEqual(archived(once, 'mynextjob'), once)
  })
})

describe('restored', () => {
  it('brings the old share back even when that takes the total over 100', () => {
    const back = restored(archived(mine, 'mynextjob'), 'mynextjob')
    const revived = back.find(({ id }) => id === 'mynextjob')
    assert.equal(revived.share, 10)
    assert.equal(revived.archived, false)
    assert.equal('archivedShare' in revived, false)
    assert.equal(shareTotal(back), 110)
  })

  it('restores at zero when no old share was kept', () => {
    const back = restored([category('old', 0, { archived: true })], 'old')
    assert.equal(back[0].share, 0)
  })

  it('leaves categories that are not archived alone', () => {
    assert.deepEqual(restored(mine, 'hourly'), mine)
  })
})

describe('redistributed', () => {
  it('scales an over 100 split back to 100 in proportion to each share', () => {
    const over = restored(archived(mine, 'mynextjob'), 'mynextjob')
    const fixed = redistributed(over)
    assert.equal(shareTotal(fixed), 100)
    assert.deepEqual(shares(fixed), { latindance: 41, hourly: 30, belgabot: 10, process: 10, mynextjob: 9 })
  })

  it('never hands a share to an archived category', () => {
    const fixed = redistributed([
      category('a', 80),
      category('b', 40),
      category('c', 0, { archived: true, archivedShare: 5 }),
    ])
    assert.deepEqual(shares(fixed), { a: 67, b: 33, c: 0 })
  })
})
