const chargerRating = (adapterWatts) => (adapterWatts ? ` · ${adapterWatts} W charger` : '')

const stateLabel = ({ onBattery, charging, adapterWatts }) => {
  if (onBattery) return ''
  return `${charging ? ' · charging' : ' · plugged in'}${chargerRating(adapterWatts)}`
}

export const batteryLabel = (reading) => `Battery ${reading.percent}%${stateLabel(reading)}`
