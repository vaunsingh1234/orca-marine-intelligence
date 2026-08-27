import { useCallback, useEffect, useRef, useState } from 'react'
import { reverseGeocode } from './geocode'
import { formatPlace, roundCoordinate, type Coordinates, type PlaceLabel } from './place'
import { fetchWeather, type WeatherNow } from './weather'

export type LocationStatus = 'idle' | 'need-permission' | 'locating' | 'denied' | 'unavailable' | 'ready'
export type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error'

const WEATHER_TTL_MS = 10 * 60 * 1000
const CACHE_KEY = 'orca.marine.session.v1'

type SessionCache = {
  latitude: number
  longitude: number
  place: PlaceLabel
  weather?: WeatherNow
  weatherAt?: number
}

export function useMarineConditions() {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [place, setPlace] = useState<PlaceLabel | null>(null)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('idle')
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const coordsRef = useRef<Coordinates | null>(null)
  const weatherAbort = useRef<AbortController | null>(null)

  const loadWeather = useCallback(async (coords: Coordinates, cached?: SessionCache) => {
    const fresh =
      cached?.weather &&
      cached.weatherAt &&
      Date.now() - cached.weatherAt < WEATHER_TTL_MS &&
      sameArea(cached, coords)

    if (fresh && cached.weather) {
      setWeather(cached.weather)
      setWeatherStatus('ready')
      return
    }

    weatherAbort.current?.abort()
    const controller = new AbortController()
    weatherAbort.current = controller
    setWeather(null)
    setWeatherStatus('loading')

    try {
      const now = await fetchWeather(coords, controller.signal)
      if (controller.signal.aborted) return
      setWeather(now)
      setWeatherStatus('ready')
      const previous = readCache()
      writeCache({
        latitude: roundCoordinate(coords.latitude),
        longitude: roundCoordinate(coords.longitude),
        place: cached?.place ?? previous?.place ?? { locality: 'Location detected' },
        weather: now,
        weatherAt: Date.now(),
      })
    } catch {
      if (controller.signal.aborted) return
      setWeather(null)
      setWeatherStatus('error')
    }
  }, [])

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      setCoordinates(null)
      setPlace(null)
      setWeather(null)
      setWeatherStatus('idle')
      return
    }

    setLocationStatus('locating')
    setCoordinates(null)
    setPlace(null)
    setWeather(null)
    setWeatherStatus('idle')

    try {
      const position = await currentPosition()
      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      coordsRef.current = coords
      setCoordinates(coords)

      const cached = readCache()
      let resolved: PlaceLabel
      try {
        resolved =
          cached && sameArea(cached, coords) ? cached.place : await reverseGeocode(coords)
      } catch {
        resolved = { locality: 'Location detected' }
      }

      setPlace(resolved)
      setLocationStatus('ready')
      writeCache({
        latitude: roundCoordinate(coords.latitude),
        longitude: roundCoordinate(coords.longitude),
        place: resolved,
        weather: cached && sameArea(cached, coords) ? cached.weather : undefined,
        weatherAt: cached && sameArea(cached, coords) ? cached.weatherAt : undefined,
      })
      await loadWeather(coords, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        place: resolved,
        weather: cached && sameArea(cached, coords) ? cached.weather : undefined,
        weatherAt: cached && sameArea(cached, coords) ? cached.weatherAt : undefined,
      })
    } catch (error) {
      const denied = isDenied(error)
      coordsRef.current = null
      setCoordinates(null)
      setPlace(null)
      setWeather(null)
      setWeatherStatus('idle')
      setLocationStatus(denied ? 'denied' : 'unavailable')
    }
  }, [loadWeather])

  const retryWeather = useCallback(() => {
    const coords = coordsRef.current
    if (!coords || !place) return
    void loadWeather(coords, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      place,
    })
  }, [loadWeather, place])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const permission = await geolocationPermission()
      if (cancelled) return
      if (permission === 'granted') {
        await requestLocation()
        return
      }
      if (permission === 'denied') {
        setLocationStatus('denied')
        return
      }
      setLocationStatus('need-permission')
    }

    void boot()
    return () => {
      cancelled = true
      weatherAbort.current?.abort()
    }
  }, [requestLocation])

  return {
    locationStatus,
    place,
    placeLabel: place ? formatPlace(place) : null,
    coordinates,
    weatherStatus,
    weather,
    requestLocation,
    retryWeather,
  }
}

export type MarineConditions = ReturnType<typeof useMarineConditions>

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 5 * 60 * 1000,
    })
  })
}

async function geolocationPermission(): Promise<PermissionState | 'unknown'> {
  if (!navigator.permissions?.query) return 'unknown'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'unknown'
  }
}

function isDenied(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 1)
}

function sameArea(cached: SessionCache, coords: Coordinates) {
  return (
    roundCoordinate(cached.latitude) === roundCoordinate(coords.latitude) &&
    roundCoordinate(cached.longitude) === roundCoordinate(coords.longitude)
  )
}

function readCache(): SessionCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionCache
    if (typeof parsed?.latitude !== 'number' || typeof parsed.longitude !== 'number') return null
    if (!parsed.place?.locality) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(value: SessionCache) {
  try {
    const previous = readCache()
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...previous,
        ...value,
      }),
    )
  } catch {
    // Session storage may be blocked; in-memory state is enough for this visit.
  }
}
