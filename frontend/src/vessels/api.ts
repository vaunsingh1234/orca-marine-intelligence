import { API_BASE } from '../api/config'

export type Vessel = {
  id: number
  name: string
  vessel_type: string | null
  registration_number: string | null
  home_port: string | null
  created_at: string
}

export type VesselPayload = {
  name: string
  vessel_type?: string
  registration_number?: string
  home_port?: string
}

export class VesselApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'VesselApiError'
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
    throw new VesselApiError('Unable to reach ORCA. Make sure the backend is running.', 0)
  }
}

export async function listVessels(): Promise<Vessel[]> {
  const response = await request('/api/marine/')
  if (!response.ok) {
    throw new VesselApiError(
      detailMessage(await readBody(response)) || 'Could not load vessels.',
      response.status,
    )
  }
  return (await response.json()) as Vessel[]
}

export async function getVessel(vesselId: number): Promise<Vessel> {
  const response = await request(`/api/marine/${vesselId}`)
  if (response.status === 404) {
    throw new VesselApiError('Vessel not found.', 404)
  }
  if (!response.ok) {
    throw new VesselApiError(
      detailMessage(await readBody(response)) || 'Could not load vessel details.',
      response.status,
    )
  }
  return (await response.json()) as Vessel
}

export async function createVessel(payload: VesselPayload): Promise<Vessel> {
  const body: Record<string, string> = { name: payload.name }
  if (payload.vessel_type) body.vessel_type = payload.vessel_type
  if (payload.registration_number) body.registration_number = payload.registration_number
  if (payload.home_port) body.home_port = payload.home_port

  const response = await request('/api/marine/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (response.status === 409) {
    throw new VesselApiError(
      'A vessel with this registration number already exists.',
      409,
    )
  }
  if (!response.ok) {
    throw new VesselApiError(
      detailMessage(await readBody(response)) || 'Could not add this vessel.',
      response.status,
    )
  }
  return (await response.json()) as Vessel
}

export async function deleteVessel(vesselId: number): Promise<void> {
  const response = await request(`/api/marine/${vesselId}`, { method: 'DELETE' })
  if (response.status === 404) {
    throw new VesselApiError('Vessel not found.', 404)
  }
  if (!response.ok) {
    throw new VesselApiError(
      detailMessage(await readBody(response)) || 'Could not delete this vessel.',
      response.status,
    )
  }
}
