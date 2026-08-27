export type Coordinates = {
  latitude: number
  longitude: number
}

export type PlaceLabel = {
  locality: string
  region?: string
}

export function formatPlace(place: PlaceLabel) {
  return place.region && place.region !== place.locality
    ? `${place.locality}, ${place.region}`
    : place.locality
}

export function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000
}
