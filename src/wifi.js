import { parseBinaryPlist } from './binary-plist.js'
import { run } from './shell.js'

const archivedValue = (archive, key) => {
  const objects = archive.$objects
  const root = objects[archive.$top.root.uid]
  const index = root['NS.keys'].findIndex((ref) => objects[ref.uid] === key)
  return index === -1 ? null : objects[root['NS.objects'][index].uid]
}

const cachedScanSsid = (airport) => {
  const hex = airport.match(/CachedScanRecord : <data> 0x([0-9a-f]+)/)?.[1]
  if (!hex) return null
  try {
    return archivedValue(parseBinaryPlist(Buffer.from(hex, 'hex')), 'SSID_STR') || null
  } catch {
    return null
  }
}

export const readSsid = async (iface) => {
  const airport = await run('scutil', [], `show State:/Network/Interface/${iface}/AirPort\n`)
  const visible = airport.match(/^\s*SSID_STR : (.*)$/m)?.[1]?.trim()
  return visible || cachedScanSsid(airport)
}
