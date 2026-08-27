import type { Coordinates } from './place'

export type WeatherNow = {
  temperatureC: number
  condition: string
  weatherCode: number
  windKmh?: number
  waveHeightM?: number
  seaSurfaceC?: number
}

type ForecastResponse = {
  current?: {
    temperature_2m?: number
    weather_code?: number
    wind_speed_10m?: number
  }
}

type MarineResponse = {
  current?: {
    wave_height?: number
    sea_surface_temperature?: number
  }
}

export async function fetchWeather(coords: Coordinates, signal?: AbortSignal): Promise<WeatherNow> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(coords.latitude))
  url.searchParams.set('longitude', String(coords.longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Weather request failed.')

  const data = (await response.json()) as ForecastResponse
  const temperature = data.current?.temperature_2m
  const weatherCode = data.current?.weather_code
  if (typeof temperature !== 'number' || typeof weatherCode !== 'number') {
    throw new Error('Weather response was incomplete.')
  }

  const wind = data.current?.wind_speed_10m
  const sea = await fetchSeaState(coords, signal)

  return {
    temperatureC: Math.round(temperature),
    condition: conditionFromCode(weatherCode),
    weatherCode,
    windKmh: typeof wind === 'number' ? Math.round(wind) : undefined,
    waveHeightM: sea?.waveHeightM,
    seaSurfaceC: sea?.seaSurfaceC,
  }
}

async function fetchSeaState(coords: Coordinates, signal?: AbortSignal) {
  try {
    const url = new URL('https://marine-api.open-meteo.com/v1/marine')
    url.searchParams.set('latitude', String(coords.latitude))
    url.searchParams.set('longitude', String(coords.longitude))
    url.searchParams.set('current', 'wave_height,sea_surface_temperature')
    url.searchParams.set('timezone', 'auto')
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    const data = (await response.json()) as MarineResponse
    const wave = data.current?.wave_height
    const sst = data.current?.sea_surface_temperature
    return {
      waveHeightM: typeof wave === 'number' ? Math.round(wave * 10) / 10 : undefined,
      seaSurfaceC: typeof sst === 'number' ? Math.round(sst * 10) / 10 : undefined,
    }
  } catch {
    return null
  }
}

function conditionFromCode(code: number) {
  if (code === 0) return 'Clear'
  if (code === 1 || code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code === 61 || code === 80) return 'Light rain'
  if ((code >= 63 && code <= 67) || code === 81 || code === 82) return 'Rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow'
  if (code >= 95) return 'Thunderstorm'
  return 'Cloudy'
}
