export type LatLng = {
  lat: number
  lng: number
}

export type HeatPoint = {
  lat: number
  lng: number
  intensity: number
}

export type ZonePotential = 'High' | 'Moderate-High' | 'Moderate' | 'Low'

export type PfzZone = {
  id: string
  name: string
  potential: ZonePotential
  status: string
  validity?: string
  /** GeoJSON ring [lng, lat][] */
  ring: number[][]
}

export type BoatProfile = {
  class: 'small' | 'medium' | 'large'
  rangeKm: number
}

/** Used later with weather and sea state to pick a nearer or farther zone. */
export const DEFAULT_BOAT_PROFILE: BoatProfile = {
  class: 'small',
  rangeKm: 30,
}

/** Explicit prototype fallback when geolocation is unavailable. Not a live user position. */
export const MUMBAI_PROTOTYPE_FALLBACK: LatLng = {
  lat: 19.076,
  lng: 72.8777,
}

export type GeofenceKind = 'restricted' | 'caution' | 'protected'

export type Geofence = {
  id: string
  kind: GeofenceKind
  name: string
  message: string
  ring: number[][]
}

export type MarineRoute = {
  /** Leaflet [lat, lng][] */
  coordinates: [number, number][]
  startsFromUser: boolean
}

export type GeofenceAlert = {
  name: string
  kind: GeofenceKind
  message: string
  distanceKm: number
  inside: boolean
}
