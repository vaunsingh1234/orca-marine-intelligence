import { destinationPoint, haversineKm, oceanSide, ovalRing, polygonCentroid } from '../geo'
import { DEFAULT_BOAT_PROFILE, type BoatProfile, type LatLng, type PfzZone } from '../types'

/**
 * SAMPLE PFZ polygons generated offshore from the fisherman origin.
 * Replace with INCOIS Potential Fishing Zone geometries when connected.
 */
const ZONE_SPECS = [
  {
    id: 'pfz-a',
    name: 'Potential fishing zone',
    potential: 'High' as const,
    status: 'Favourable',
    km: 12,
    bearingOffset: 0,
    kmNorth: 2.4,
    kmEast: 2.1,
  },
  {
    id: 'pfz-b',
    name: 'Potential fishing zone',
    potential: 'Moderate-High' as const,
    status: 'Favourable',
    km: 18,
    bearingOffset: -22,
    kmNorth: 2.8,
    kmEast: 2.4,
  },
  {
    id: 'pfz-c',
    name: 'Potential fishing zone',
    potential: 'High' as const,
    status: 'Favourable',
    km: 27,
    bearingOffset: -12,
    kmNorth: 3.0,
    kmEast: 2.6,
  },
] as const

export function pfzData(origin: LatLng): PfzZone[] {
  const ocean = oceanSide(origin)
  return ZONE_SPECS.map((spec) => {
    const center = destinationPoint(origin, spec.km, ocean.heading + spec.bearingOffset)
    return {
      id: spec.id,
      name: spec.name,
      potential: spec.potential,
      status: spec.status,
      validity: 'Prototype morning window',
      ring: ovalRing(center, spec.kmNorth, spec.kmEast),
    }
  })
}

export function pickRecommendedZone(zones: PfzZone[], origin: LatLng, boat: BoatProfile = DEFAULT_BOAT_PROFILE) {
  const ranked = zones
    .map((zone) => ({
      zone,
      distanceKm: haversineKm(origin, polygonCentroid(zone.ring)),
    }))
    .filter((item) => item.distanceKm <= boat.rangeKm)
    .sort((a, b) => potentialRank(b.zone.potential) - potentialRank(a.zone.potential) || a.distanceKm - b.distanceKm)

  return ranked[0]?.zone ?? zones[0]
}

function potentialRank(value: PfzZone['potential']) {
  if (value === 'High') return 3
  if (value === 'Moderate-High') return 2
  if (value === 'Moderate') return 1
  return 0
}
