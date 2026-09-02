import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBinaryPlist } from '../src/binary-plist.js'

const VALUES =
  '62706c6973743030dd0102030405060708090a0b0c0d0e0f10111213161718191a1d1e57756e69636f646555736d616c6c55726174696f547768656e566d656469756d566e65737465645464617461526e6f53796573556c61726765546c697374546e616d65586e656761746976656700570069201100460069002026151007233fe00000000000003341c824159000000011012cd114155372656680034548656c6c6f08091200011170a21b1c10015374776f5854696d657242617213ffffffffffffffff08232b31373c434a4f52565c61666f7e80899295989c9ea4a5a6abaeb0b4bd0000000000000101000000000000001f000000000000000000000000000000c6'

const KEYED_ARCHIVE =
  '62706c6973743030d40102030405061516582476657273696f6e58246f626a65637473592461726368697665725424746f7012000186a0a607081112131455246e756c6cd2090a0b0e574e532e6b6579735a4e532e6f626a65637473a20c0d80028004a20f108003800558535349445f53545255485342584c574348414e4e454c10245f100f4e534b657965644172636869766572d1171854726f6f74800108111a232d32373e4449515c5f616366686a7379818395989d000000000000010100000000000000190000000000000000000000000000009f'

const plist = (hex) => parseBinaryPlist(Buffer.from(hex, 'hex'))

test('reads every value type plutil writes', () => {
  const { data, when, ...rest } = plist(VALUES)
  assert.deepEqual(rest, {
    name: 'TimerBar',
    unicode: 'Wi‑Fi ☕',
    small: 7,
    medium: 300,
    large: 70000,
    negative: -1,
    ratio: 0.5,
    yes: true,
    no: false,
    list: [1, 'two'],
    nested: { ref: { uid: 3 } },
  })
  assert.equal(data.toString(), 'Hello')
  assert.equal(when.toISOString(), '2026-09-02T10:00:00.000Z')
})

test('resolves keyed archive references the way the Wi-Fi scan record needs', () => {
  const archive = plist(KEYED_ARCHIVE)
  const objects = archive.$objects
  const root = objects[archive.$top.root.uid]
  const entries = root['NS.keys'].map((key, index) => [objects[key.uid], objects[root['NS.objects'][index].uid]])
  assert.deepEqual(Object.fromEntries(entries), { SSID_STR: 'HSBXL', CHANNEL: 36 })
})

test('rejects anything that is not a binary plist', () => {
  assert.throws(() => parseBinaryPlist(Buffer.from('<?xml version="1.0"?>')), /not a binary plist/)
})
