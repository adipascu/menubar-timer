import { nameProblem, ssidFromAirport } from './network-name.js'
import { run } from './shell.js'

export const readSsid = async (iface) => {
  const airport = await run('scutil', [], `show State:/Network/Interface/${iface}/AirPort\n`)
  return { ssid: ssidFromAirport(airport), nameProblem: nameProblem(airport) }
}
