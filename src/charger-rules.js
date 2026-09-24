export const markedHere = (places, id) => places.find((place) => place.id === id)?.charger

export const chargerHere = (places, id) => id !== null && markedHere(places, id) !== false

export const withChargerToggled = (places, network) => [
  ...places.filter((place) => place.id !== network.id),
  { ...network, charger: !chargerHere(places, network.id) },
]
