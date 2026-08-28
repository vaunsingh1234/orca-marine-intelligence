import { API_BASE } from '../api/config'

export type WeatherNow = {
  latitude: number
  longitude: number
  temperature_c: number
  condition: string
  weather_code: number
  wind_kmh: number | null
  wind_direction_deg: number | null
  wind_direction: string | null
  precipitation_mm: number | null
  location_id: number | null
  vessel_name: string | null
  location_name: string | null
}

export class WeatherApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'WeatherApiError'
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

async function request(path: string): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`)
  } catch {
    throw new WeatherApiError('Unable to reach ORCA. Make sure the backend is running.', 0)
  }
}

export async function fetchWeatherByCoordinates(
  latitude: number,
  longitude: number,
): Promise<WeatherNow> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  })
  const response = await request(`/api/weather?${params.toString()}`)
  if (!response.ok) {
    throw new WeatherApiError(
      detailMessage(await readBody(response)) || 'Weather is unavailable for these coordinates.',
      response.status,
    )
  }
  return (await response.json()) as WeatherNow
}

export async function fetchWeatherForLocation(locationId: number): Promise<WeatherNow> {
  const response = await request(`/api/weather/location/${locationId}`)
  if (response.status === 404) {
    throw new WeatherApiError('Location not found.', 404)
  }
  if (!response.ok) {
    throw new WeatherApiError(
      detailMessage(await readBody(response)) || 'Weather is unavailable for this location.',
      response.status,
    )
  }
  return (await response.json()) as WeatherNow
}
