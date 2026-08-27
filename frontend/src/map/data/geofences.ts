import { destinationPoint, oceanSide, ovalRing } from '../geo'
import type { Geofence, LatLng } from '../types'

/**
 * SAMPLE geofences in the water near the fisherman origin.
 * Replace with official harbour limits, MPAs and maritime boundaries later.
 */
export function geofenceData(origin: LatLng): Geofence[] {
  const ocean = oceanSide(origin)
  const harbour = destinationPoint(origin, 9, ocean.heading + (ocean.name === 'west' ? 28 : -28))
  const caution = destinationPoint(origin, 22, ocean.heading + (ocean.name === 'west' ? 20 : -20))
  const protectedWater = destinationPoint(origin, 16, ocean.heading + (ocean.name === 'west' ? -40 : 40))

  return [
    {
      id: 'restricted-harbour',
      kind: 'restricted',
      name: 'Restricted area',
      message: 'Fishing is not recommended in this harbour approach.',
      ring: ovalRing(harbour, 1.6, 1.4),
    },
    {
      id: 'caution-offshore',
      kind: 'caution',
      name: 'Caution area',
      message: 'Sea conditions may worsen here later in the day. Keep a short trip.',
      ring: ovalRing(caution, 2.4, 2.0),
    },
    {
      id: 'protected-waters',
      kind: 'protected',
      name: 'Protected waters',
      message: 'Ecologically sensitive waters. Avoid fishing inside this boundary.',
      ring: ovalRing(protectedWater, 2.0, 1.7),
    },
  ]
}
