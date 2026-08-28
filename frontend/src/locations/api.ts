import { API_BASE } from '../api/config'

export type LocationRecord = {
  id: number
  vessel_name: string
  latitude: number
  longitude: number
  location_name: string | null
  created_at: string
}

export type LocationPayload = {
  vessel_name: string
  latitude: number
  longitude: number
  location_name?: string
}

export class LocationApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'LocationApiError'
    this.status = status
  }
}

function detailMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object') {
    const first = detail[0] as { msg?: unknown }
    if (typeof first.msg === 'string') return first.msg
  }
  return ''
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new LocationApiError('Unable to reach ORCA. Make sure the backend is running.', 0)
  }
}

export async function listLocations(): Promise<LocationRecord[]> {
  const response = await request('/api/location/')
  if (!response.ok) {
    throw new LocationApiError(
      detailMessage(await readBody(response)) || 'Could not load locations.',
      response.status,
    )
  }
  return (await response.json()) as LocationRecord[]
}

export async function getLocation(locationId: number): Promise<LocationRecord> {
  const response = await request(`/api/location/${locationId}`)
  if (response.status === 404) {
    throw new LocationApiError('Location not found.', 404)
  }
  if (!response.ok) {
    throw new LocationApiError(
      detailMessage(await readBody(response)) || 'Could not load location details.',
      response.status,
    )
  }
  return (await response.json()) as LocationRecord
}

export async function createLocation(payload: LocationPayload): Promise<LocationRecord> {
  const body: Record<string, string | number> = {
    vessel_name: payload.vessel_name,
    latitude: payload.latitude,
    longitude: payload.longitude,
  }
  if (payload.location_name) body.location_name = payload.location_name

  const response = await request('/api/location/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new LocationApiError(
      detailMessage(await readBody(response)) || 'Could not save this location.',
      response.status,
    )
  }
  return (await response.json()) as LocationRecord
}

export async function deleteLocation(locationId: number): Promise<void> {
  const response = await request(`/api/location/${locationId}`, { method: 'DELETE' })
  if (response.status === 404) {
    throw new LocationApiError('Location not found.', 404)
  }
  if (!response.ok) {
    throw new LocationApiError(
      detailMessage(await readBody(response)) || 'Could not delete this location.',
      response.status,
    )
  }
}
