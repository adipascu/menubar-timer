import { parseBinaryPlist } from './binary-plist.js'

const archivedValue = (archive, key) => {
  const objects = archive.$objects
  const root = objects[archive.$top.root.uid]
  const index = root['NS.keys'].findIndex((ref) => objects[ref.uid] === key)
  return index === -1 ? null : objects[root['NS.objects'][index].uid]
}

const asText = (value) => (value === null ? '' : value.toString('utf8'))

const scanRecordName = (airport) => {
  const hex = airport.match(/CachedScanRecord : <data> 0x([0-9a-f]+)/)?.[1]
  if (!hex) return null
  try {
    const archive = parseBinaryPlist(Buffer.from(hex, 'hex'))
    const spelled = asText(archivedValue(archive, 'SSID_STR')).trim()
    const raw = asText(archivedValue(archive, 'SSID')).replaceAll('\0', '').trim()
    return spelled || raw || null
  } catch {
    return null
  }
}

export const ssidFromAirport = (airport) =>
  airport.match(/^\s*SSID_STR : (.*)$/m)?.[1]?.trim() || scanRecordName(airport)

const isWifi = (airport) => /^\s*SSID_STR : /m.test(airport)

export const nameProblem = (airport) => {
  if (!isWifi(airport) || ssidFromAirport(airport)) return null
  return /CachedScanRecord : <data> 0x[0-9a-f]+/.test(airport) ? 'scan record has no name' : 'no scan record'
}
