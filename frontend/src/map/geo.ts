import type { Geofence, GeofenceAlert, LatLng } from './types'

const EARTH_KM = 6371

export function toRad(degrees: number) {
  return (degrees * Math.PI) / 180
}

export function haversineKm(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearingDegrees(from: LatLng, to: LatLng) {
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat))
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng))
  return (Math.atan2(y, x) * 180) / Math.PI
}

export function cardinalFromBearing(bearing: number) {
  const headings = [
    'North',
    'Northeast',
    'East',
    'Southeast',
    'South',
    'Southwest',
    'West',
    'Northwest',
  ] as const
  const index = Math.round(((bearing % 360) + 360) % 360 / 45) % 8
  return headings[index]
}

export function compassAbbrev(bearing: number) {
  const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
  const index = Math.round((((bearing % 360) + 360) % 360) / 45) % 8
  return headings[index]
}

export function destinationPoint(from: LatLng, distanceKm: number, bearingDeg: number): LatLng {
  const angular = distanceKm / EARTH_KM
  const bearing = toRad(bearingDeg)
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI }
}

export function offsetKm(from: LatLng, kmNorth: number, kmEast: number): LatLng {
  return {
    lat: from.lat + kmNorth / 111.32,
    lng: from.lng + kmEast / (111.32 * Math.cos(toRad(from.lat))),
  }
}

export type OceanSide = {
  heading: number
  name: 'west' | 'east'
}

/** Arabian Sea is west of India's west coast; Bay of Bengal is east of the east coast. */
export function oceanSide(origin: LatLng): OceanSide {
  if (origin.lng < 80) return { heading: 270, name: 'west' }
  return { heading: 90, name: 'east' }
}

export function isOffshore(point: LatLng, origin: LatLng, ocean: OceanSide) {
  const gate = destinationPoint(origin, 8, ocean.heading)
  if (ocean.name === 'west') return point.lng <= gate.lng
  return point.lng >= gate.lng
}

export function ovalRing(center: LatLng, kmNorth: number, kmEast: number, steps = 14): number[][] {
  const ring: number[][] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2
    const point = offsetKm(center, kmNorth * Math.sin(t), kmEast * Math.cos(t))
    ring.push([point.lng, point.lat])
  }
  return ring
}

export function roundKm(value: number) {
  return Math.round(value * 10) / 10
}

export function polygonCentroid(ring: number[][]): LatLng {
  let lat = 0
  let lng = 0
  const points = ring[0]?.[0] === ring[ring.length - 1]?.[0] && ring[0]?.[1] === ring[ring.length - 1]?.[1]
    ? ring.slice(0, -1)
    : ring
  for (const pair of points) {
    lng += pair[0]
    lat += pair[1]
  }
  const n = Math.max(points.length, 1)
  return { lat: lat / n, lng: lng / n }
}

export function pointInRing(point: LatLng, ring: number[][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function distanceToSegmentKm(point: LatLng, a: LatLng, b: LatLng) {
  const kmPerLat = 111.32
  const kmPerLng = 111.32 * Math.cos(toRad((a.lat + b.lat) / 2))
  const px = (point.lng - a.lng) * kmPerLng
  const py = (point.lat - a.lat) * kmPerLat
  const bx = (b.lng - a.lng) * kmPerLng
  const by = (b.lat - a.lat) * kmPerLat
  const length = bx * bx + by * by
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / length))
  const nearest = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) }
  return haversineKm(point, nearest)
}

export function distanceToPolygonKm(point: LatLng, ring: number[][]) {
  if (pointInRing(point, ring)) return 0
  let min = Number.POSITIVE_INFINITY
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = { lat: ring[i][1], lng: ring[i][0] }
    const b = { lat: ring[i + 1][1], lng: ring[i + 1][0] }
    min = Math.min(min, distanceToSegmentKm(point, a, b))
  }
  return min
}

const NEARBY_KM = 12

export function nearestGeofence(point: LatLng, fences: Geofence[]): GeofenceAlert | null {
  let best: GeofenceAlert | null = null
  for (const fence of fences) {
    const distanceKm = roundKm(distanceToPolygonKm(point, fence.ring))
    const candidate: GeofenceAlert = {
      name: fence.name,
      kind: fence.kind,
      message: fence.message,
      distanceKm,
      inside: distanceKm === 0,
    }
    if (!best) {
      best = candidate
      continue
    }
    const preferRestricted = candidate.kind === 'restricted' && best.kind !== 'restricted' && candidate.distanceKm <= NEARBY_KM
    if (preferRestricted || candidate.distanceKm < best.distanceKm) best = candidate
  }
  if (!best || best.distanceKm > NEARBY_KM) return null
  return best
}

export function ringToLeaflet(ring: number[][]): [number, number][] {
  return ring.map((pair) => [pair[1], pair[0]])
}
