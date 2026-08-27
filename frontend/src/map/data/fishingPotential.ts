import {
  destinationPoint,
  isOffshore,
  offsetKm,
  oceanSide,
  type OceanSide,
} from '../geo'
import type { HeatPoint, LatLng } from '../types'

/**
 * SAMPLE FISHING-POTENTIAL DATA.
 * Replace with INCOIS PFZ / ocean colour layers later.
 * Points are generated from the fisherman origin, always pushed into the sea.
 */
const KERNELS = [
  { bearingOffset: 0, km: 12, intensity: 0.95 },
  { bearingOffset: -22, km: 18, intensity: 0.82 },
  { bearingOffset: -12, km: 26, intensity: 0.9 },
  { bearingOffset: 18, km: 22, intensity: 0.55 },
  { bearingOffset: -32, km: 15, intensity: 0.42 },
] as const

const SPREAD_KM: [number, number, number][] = [
  [0, 0, 1],
  [1.4, 0.8, 0.92],
  [-1.1, 1.0, 0.88],
  [2.4, 0.4, 0.74],
  [-2.2, 0.6, 0.7],
  [0.6, 1.8, 0.8],
  [-0.5, 2.1, 0.76],
  [3.1, 1.2, 0.52],
  [-2.8, 1.4, 0.48],
  [1.8, 2.4, 0.6],
  [-1.6, 2.6, 0.58],
]

export function fishingPotentialData(origin: LatLng): HeatPoint[] {
  const ocean = oceanSide(origin)
  const points: HeatPoint[] = []

  for (const kernel of KERNELS) {
    const center = destinationPoint(origin, kernel.km, ocean.heading + kernel.bearingOffset)
    for (const [north, towardSea, scale] of SPREAD_KM) {
      const point = spreadPoint(center, north, towardSea, ocean)
      if (!isOffshore(point, origin, ocean)) continue
      points.push({
        lat: round4(point.lat),
        lng: round4(point.lng),
        intensity: Math.max(0.2, Math.min(1, kernel.intensity * scale)),
      })
    }
  }

  return points
}

function spreadPoint(center: LatLng, kmNorth: number, kmTowardSea: number, ocean: OceanSide) {
  const east = ocean.name === 'west' ? -kmTowardSea : kmTowardSea
  return offsetKm(center, kmNorth, east)
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000
}
