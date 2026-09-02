import { execFile } from 'node:child_process'
import { log } from './log.js'

const LOUD_VOLUME = 50
const COMMAND_TIMEOUT_MS = 5000

const output = (command, args) =>
  new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS }, (error, stdout) => resolve(error ? '' : stdout))
  })

const audioIsPlaying = async () => /Resources:.*\baudio-out\b/.test(await output('pmset', ['-g', 'assertions']))

const outputVolume = async () => {
  const settings = await output('osascript', ['-e', 'get volume settings'])
  if (/output muted:true/.test(settings)) return 0
  const volume = settings.match(/output volume:(\d+)/)
  return volume ? Number(volume[1]) : null
}

export const musicIsLoud = async () => {
  const [playing, volume] = await Promise.all([audioIsPlaying(), outputVolume()])
  const loud = playing && (volume === null || volume >= LOUD_VOLUME)
  log(`audio ${playing ? 'playing' : 'silent'}, output volume ${volume ?? 'unknown'}, spectrum ${loud ? 'on' : 'off'}`)
  return loud
}
