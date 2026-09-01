import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

const REFRESH_MS = 30 * 1000

const run = (command, args) =>
  new Promise((resolve) => {
    execFile(command, args, { timeout: 5000 }, (error, stdout) => resolve(error ? '' : stdout))
  })

const normalizeMac = (raw) =>
  raw
    .toLowerCase()
    .split(':')
    .map((octet) => octet.padStart(2, '0'))
    .join(':')

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

  return { id: normalizeMac(mac), domain }
}

export const createChargerPlaces = (onChange = () => {}) => {
  const file = join(app.getPath('userData'), 'charger-places.json')
  let current = null
  let timer = null

  const places = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [])
  const save = (list) => writeFileSync(file, JSON.stringify(list, null, 2))

  const isMarked = () => current !== null && places().some((place) => place.id === current.id)

  const refresh = async () => {
    const next = await readFingerprint()
    const changed = next?.id !== current?.id
    current = next
    if (changed) {
      log(
        `network ${next ? `${next.domain ?? next.id}` : 'unknown'}, ` +
          `charger ${next === null ? 'unknown' : isMarked() ? 'available' : 'not marked'}`,
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
    networkLabel: () => (current ? current.domain ?? current.id : null),
    isMarked,
    shouldAlert: () => places().length === 0 || isMarked(),
    toggleHere: () => {
      if (!current) return
      const rest = places().filter((place) => place.id !== current.id)
      save(isMarked() ? rest : [...rest, current])
      log(`charger ${isMarked() ? 'marked' : 'unmarked'} at ${current.domain ?? current.id}`)
      onChange()
    },
  }
}
