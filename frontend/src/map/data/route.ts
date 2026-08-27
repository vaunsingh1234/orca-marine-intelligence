import { destinationPoint, oceanSide } from '../geo'
import type { LatLng, MarineRoute } from '../types'

/**
 * Prototype marine route from the fisherman to the recommended zone.
 * Always steps into the sea first so the line does not cross land.
 * Replace with a real marine routing service when available.
 */
export function routeData(user: LatLng | null, origin: LatLng, target: LatLng): MarineRoute {
  const ocean = oceanSide(origin)
  const start = user ?? origin
  const seaGate = destinationPoint(start, 8, ocean.heading)
  const mid = destinationPoint(start, 12, ocean.heading)
  const approach = destinationPoint(target, 3, ocean.heading + 180)

  const coordinates: [number, number][] = [
    [start.lat, start.lng],
    [seaGate.lat, seaGate.lng],
    [mid.lat, mid.lng],
    [approach.lat, approach.lng],
    [target.lat, target.lng],
  ]

  return { coordinates, startsFromUser: Boolean(user) }
}
