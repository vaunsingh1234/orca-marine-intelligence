import type { Coordinates } from '../marine/place'
import { fishingPotentialData } from './data/fishingPotential'
import { geofenceData } from './data/geofences'
import { pfzData, pickRecommendedZone } from './data/pfz'
import { routeData } from './data/route'
import {
  bearingDegrees,
  compassAbbrev,
  haversineKm,
  nearestGeofence,
  polygonCentroid,
  roundKm,
} from './geo'
import { DEFAULT_BOAT_PROFILE, MUMBAI_PROTOTYPE_FALLBACK, type LatLng } from './types'

export function asLatLng(coords: Coordinates | null): LatLng | null {
  if (!coords) return null
  return { lat: coords.latitude, lng: coords.longitude }
}

export function buildMapScene(coords: Coordinates | null) {
  const user = asLatLng(coords)
  const usingLocationFallback = !user
  const origin = user ?? MUMBAI_PROTOTYPE_FALLBACK
  const heatPoints = fishingPotentialData(origin)
  const pfzZones = pfzData(origin)
  const recommendedZone = pickRecommendedZone(pfzZones, origin, DEFAULT_BOAT_PROFILE)
  const recommendedCenter = polygonCentroid(recommendedZone.ring)
  const geofences = geofenceData(origin)
  const route = routeData(user, origin, recommendedCenter)
  const geofenceAlert = user ? nearestGeofence(user, geofences) : null

  return {
    user,
    usingLocationFallback,
    origin,
    heatPoints,
    pfzZones,
    recommendedZone,
    geofences,
    route,
    recommendedMeta: {
      distanceKm: roundKm(haversineKm(origin, recommendedCenter)),
      direction: compassAbbrev(bearingDegrees(origin, recommendedCenter)),
      measuredFromUser: Boolean(user),
    },
    geofenceAlert,
    center: origin,
  }
}

export type MapScene = ReturnType<typeof buildMapScene>
