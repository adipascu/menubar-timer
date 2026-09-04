import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from './log.js'

export const BEACON_PRESETS = [
  { id: 'hackerspace', name: 'Hackerspace' },
  { id: 'arcade', name: 'Arcade' },
  { id: 'bloom', name: 'Bloom' },
  { id: 'breathe', name: 'Breathe' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'lofi', name: 'Lo-fi' },
  { id: 'markets', name: 'Markets' },
]

const DEFAULT_PRESET = BEACON_PRESETS[0].id

const isPreset = (id) => BEACON_PRESETS.some((preset) => preset.id === id)

export const createBeaconPreset = (onChange = () => {}) => {
  const file = join(app.getPath('userData'), 'beacon.json')

  const read = () => {
    if (!existsSync(file)) return DEFAULT_PRESET
    try {
      const { preset } = JSON.parse(readFileSync(file, 'utf8'))
      return isPreset(preset) ? preset : DEFAULT_PRESET
    } catch {
      return DEFAULT_PRESET
    }
  }

  let current = read()

  return {
    get: () => current,
    set: (id) => {
      if (!isPreset(id) || id === current) return
      current = id
      writeFileSync(file, JSON.stringify({ preset: id }))
      log(`beacon preset set to ${id}`)
      onChange(id)
    },
  }
}
