import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chargerHere, markedHere, withChargerToggled } from './charger-rules.js'
import { log } from './log.js'
import { run } from './shell.js'
import { readSsid } from './wifi.js'

const REFRESH_MS = 30 * 1000

const normalizeMac = (raw) =>
  raw
    .toLowerCase()
    .split(':')
    .map((octet) => octet.padStart(2, '0'))
    .join(':')

const name = (place) => place.ssid ?? place.domain ?? null

const label = (place) => name(place) ?? `an unnamed network (${place.id})`

const readFingerprint = async () => {
  const route = await run('route', ['-n', 'get', 'default'])
  const gateway = route.match(/gateway: ([\d.]+)/)?.[1]
  const iface = route.match(/interface: (\w+)/)?.[1]
  if (!gateway || !iface) return null

  const arp = await run('arp', ['-n', gateway])
  const mac = arp.match(/ at ([0-9a-f:]+) on /i)?.[1]
  if (!mac) return null

  const packet = await run('ipconfig', ['getpacket', iface])
  const domain = packet.match(/domain_name \(string\): (\S+)/)?.[1] ?? null
  const { ssid, nameProblem } = await readSsid(iface)

  return { id: normalizeMac(mac), ssid, domain, nameProblem }
}

export const createChargerPlaces = (onChange = () => {}) => {
  const file = join(app.getPath('userData'), 'charger-places.json')
  let current = null
  let timer = null

  const places = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [])
  const save = (list) => writeFileSync(file, JSON.stringify(list, null, 2))

  const isMarked = () => chargerHere(places(), current?.id ?? null)

  const describe = () => {
    if (current === null) return 'no charger assumed without a network'
    if (!places().some(({ id }) => id === current.id)) return 'charger assumed, network not marked'
    return markedHere(places(), current.id) === false ? 'no charger here' : 'charger available'
  }

  const refresh = async () => {
    const next = await readFingerprint()
    const changed = next?.id !== current?.id
    current = next
    if (changed) {
      log(
        `network ${next ? label(next) : 'unknown'}, ${describe()}` +
          (next?.nameProblem ? `, name unreadable: ${next.nameProblem}` : ''),
      )
      onChange()
    }
  }

  return {
    start: () => {
      refresh()
      timer = setInterval(refresh, REFRESH_MS)
    },
    stop: () => clearInterval(timer),
    onNetwork: () => current !== null,
    networkName: () => (current ? name(current) : null),
    isMarked,
    shouldAlert: isMarked,
    toggleHere: () => {
      if (!current) return
      const { nameProblem, ...network } = current
      save(withChargerToggled(places(), network))
      log(`${isMarked() ? 'charger marked available' : 'marked no charger'} at ${label(current)}`)
      onChange()
    },
  }
}
