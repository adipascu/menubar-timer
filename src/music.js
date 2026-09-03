import { session } from 'electron'
import { log } from './log.js'
import { run } from './shell.js'

const LOUD_VOLUME = 50

const audioIsPlaying = async () => /Resources:.*\baudio-out\b/.test(await run('pmset', ['-g', 'assertions']))

const outputVolume = async () => {
  const settings = await run('osascript', ['-e', 'get volume settings'])
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

export const shareSystemAudio = () =>
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    callback(request.audioRequested && !request.videoRequested ? { audio: 'loopback' } : {})
  })
