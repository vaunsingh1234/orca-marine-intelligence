import { useEffect, useState } from 'react'
import OceanScene from '../components/OceanScene'
import {
  AlertIcon,
  BoatIcon,
  BrandMark,
  CompassIcon,
  GlobeIcon,
  LogoutIcon,
  SendIcon,
  SparkIcon,
  WavesIcon,
} from '../components/Icons'
import { getProfession, type ProfessionId } from '../auth/professions'
import { formatPhone, type Session } from '../auth/store'
import { useMarineConditions } from '../marine/useMarineConditions'
import FishermanAnalysisPage from './FishermanAnalysisPage'
import FishermanHomePage from './FishermanHomePage'
import VesselManagementPage from './VesselManagementPage'
import LocationManagementPage from './LocationManagementPage'
import { listLocations, type LocationRecord } from '../locations/api'
import { fetchWeatherForLocation, WeatherApiError, type WeatherNow } from '../weather/api'
import './DashboardPage.css'

const PROMPTS: Record<ProfessionId, string[]> = {
  fisherman: [
    'Where are the best fishing zones near me today?',
    'Is it safe to go out tomorrow morning?',
    'Which harbour has the calmest approach tonight?',
  ],
  researcher: [
    'Show chlorophyll-a anomalies in the Arabian Sea',
    'Compare sea surface temperature trends since 2015',
    'Export a Bay of Bengal dataset for my study area',
  ],
  'coastal-authority': [
    'How much shoreline has eroded near Alibaug?',
    'Flag possible illegal fishing activity this week',
    'Where did water quality exceed limits?',
  ],
  'disaster-agency': [
    'Cyclone track probability for the next 72 hours',
    'Storm surge risk for the Puri coastline',
    'Which wards need evacuation support first?',
  ],
  'maritime-operator': [
    'Best fuel-efficient route from Kochi to Colombo',
    'Sea state along my route for the next 48 hours',
    'Current congestion and berth waiting at JNPT',
  ],
}

const ADVISORIES = [
  {
    icon: <AlertIcon />,
    tone: 'warn',
    title: 'Squall line expected after 18:00 IST',
    copy: 'Small craft along the Konkan coast should return before dusk.',
  },
  {
    icon: <WavesIcon />,
    tone: 'ok',
    title: 'Upwelling detected off Ratnagiri',
    copy: 'Cooler, nutrient-rich water — pelagic activity likely to rise.',
  },
  {
    icon: <GlobeIcon />,
    tone: 'info',
    title: 'New Sentinel-3 pass ingested',
    copy: 'Ocean colour composites refreshed 42 minutes ago.',
  },
]

type DashboardPageProps = {
  session: Session
  onSignOut: () => void
}

export default function DashboardPage({ session, onSignOut }: DashboardPageProps) {
  const [section, setSection] = useState<'home' | 'vessels' | 'locations'>('home')

  if (section === 'vessels') {
    return (
      <VesselManagementPage
        session={session}
        onSignOut={onSignOut}
        onBack={() => setSection('home')}
      />
    )
  }

  if (section === 'locations') {
    return (
      <LocationManagementPage
        session={session}
        onSignOut={onSignOut}
        onBack={() => setSection('home')}
      />
    )
  }

  if (session.profession === 'fisherman') {
    return (
      <FishermanFlow
        session={session}
        onSignOut={onSignOut}
        onOpenVessels={() => setSection('vessels')}
        onOpenLocations={() => setSection('locations')}
      />
    )
  }

  return (
    <ResearcherDashboard
      session={session}
      onSignOut={onSignOut}
      onOpenVessels={() => setSection('vessels')}
      onOpenLocations={() => setSection('locations')}
    />
  )
}

type WorkspaceProps = DashboardPageProps & {
  onOpenVessels: () => void
  onOpenLocations: () => void
}

function FishermanFlow({ session, onSignOut, onOpenVessels, onOpenLocations }: WorkspaceProps) {
  const marine = useMarineConditions()
  const [analysisQuery, setAnalysisQuery] = useState<string | null>(null)

  if (analysisQuery) {
    return (
      <FishermanAnalysisPage
        session={session}
        marine={marine}
        initialQuery={analysisQuery}
        onSignOut={onSignOut}
        onAskAgain={() => setAnalysisQuery(null)}
        onOpenVessels={onOpenVessels}
        onOpenLocations={onOpenLocations}
      />
    )
  }

  return (
    <FishermanHomePage
      session={session}
      marine={marine}
      onSignOut={onSignOut}
      onAnalyze={setAnalysisQuery}
      onOpenVessels={onOpenVessels}
      onOpenLocations={onOpenLocations}
    />
  )
}

function ResearcherDashboard({ session, onSignOut, onOpenVessels, onOpenLocations }: WorkspaceProps) {
  const [query, setQuery] = useState('')
  const profession = getProfession(session.profession)
  const prompts = PROMPTS[session.profession] ?? PROMPTS.researcher
  const firstName = session.name.split(' ')[0]
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [locationsStatus, setLocationsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [locationTick, setLocationTick] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [weatherError, setWeatherError] = useState('')
  const [weatherTick, setWeatherTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadLocations() {
      setLocationsStatus('loading')
      try {
        const rows = await listLocations()
        if (cancelled) return
        setLocations(rows)
        setLocationsStatus('ready')
        setSelectedId((current) =>
          current != null && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null,
        )
      } catch {
        if (cancelled) return
        setLocations([])
        setSelectedId(null)
        setLocationsStatus('error')
      }
    }
    void loadLocations()
    return () => {
      cancelled = true
    }
  }, [locationTick])

  useEffect(() => {
    if (selectedId == null) {
      setWeather(null)
      setWeatherStatus('idle')
      return
    }
    const locationId = selectedId
    let cancelled = false
    async function loadWeather() {
      setWeatherStatus('loading')
      setWeatherError('')
      try {
        const now = await fetchWeatherForLocation(locationId)
        if (cancelled) return
        setWeather(now)
        setWeatherStatus('ready')
      } catch (caught) {
        if (cancelled) return
        setWeather(null)
        setWeatherStatus('error')
        setWeatherError(
          caught instanceof WeatherApiError ? caught.message : 'Weather is unavailable right now.',
        )
      }
    }
    void loadWeather()
    return () => {
      cancelled = true
    }
  }, [selectedId, weatherTick])

  const selected = locations.find((row) => row.id === selectedId)

  return (
    <div className="dash">
      <OceanScene />

      <div className="dash-layer">
        <header className="dash-top">
          <div className="brand">
            <BrandMark className="brand-mark" width={34} height={34} />
            <div>
              <p className="brand-name">ORCA</p>
              <p className="brand-sub">Marine Intelligence</p>
            </div>
          </div>

          <div className="dash-user">
            <div className="dash-user-meta">
              <strong>{session.name}</strong>
              <small>
                {profession.label} · {session.email || formatPhone(session.phone)}
              </small>
            </div>
            <span className="dash-avatar" aria-hidden="true">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <button type="button" className="dash-signout" onClick={onOpenVessels}>
              <BoatIcon width={18} height={18} />
              Vessels
            </button>
            <button type="button" className="dash-signout" onClick={onOpenLocations}>
              <CompassIcon width={18} height={18} />
              Locations
            </button>
            <button type="button" className="dash-signout" onClick={onSignOut}>
              <LogoutIcon width={18} height={18} />
              Sign out
            </button>
          </div>
        </header>

        <main className="dash-main">
          <section className="dash-hero">
            <p className="dash-kicker">
              <SparkIcon width={15} height={15} />
              Agentic marine copilot
            </p>
            <h1>
              Good to see you, <span>{firstName}</span>.
            </h1>
            <p className="dash-lede">
              Ask anything about the ocean around you. ORCA reasons over Earth Observation,
              oceanographic and geospatial data, then explains the evidence behind every answer.
            </p>

            <form
              className="dash-ask"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Is it safe to sail out of Mumbai tomorrow?"
                aria-label="Ask ORCA"
              />
              <button type="submit" className="btn btn-primary dash-ask-send" disabled={!query.trim()}>
                <SendIcon width={18} height={18} />
                Ask
              </button>
            </form>

            <div className="dash-prompts">
              {prompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setQuery(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>

            <p className="dash-disclaimer">
              Weather is live from the selected saved location. Advisories below remain illustrative.
            </p>
          </section>

          <section className="dash-side">
            <LiveWeatherPanel
              locations={locations}
              locationsStatus={locationsStatus}
              selectedId={selectedId}
              selected={selected}
              weather={weather}
              weatherStatus={weatherStatus}
              weatherError={weatherError}
              onSelect={setSelectedId}
              onOpenLocations={onOpenLocations}
              onRetryLocations={() => setLocationTick((tick) => tick + 1)}
              onRetryWeather={() => setWeatherTick((tick) => tick + 1)}
            />

            <div className="dash-panel">
              <h2>Live advisories</h2>
              <ul>
                {ADVISORIES.map((item) => (
                  <li key={item.title} data-tone={item.tone}>
                    <span className="dash-advisory-icon">{item.icon}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.copy}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

type LiveWeatherPanelProps = {
  locations: LocationRecord[]
  locationsStatus: 'loading' | 'ready' | 'error'
  selectedId: number | null
  selected: LocationRecord | undefined
  weather: WeatherNow | null
  weatherStatus: 'idle' | 'loading' | 'ready' | 'error'
  weatherError: string
  onSelect: (id: number) => void
  onOpenLocations: () => void
  onRetryLocations: () => void
  onRetryWeather: () => void
}

function locationOptionLabel(row: LocationRecord): string {
  const place = row.location_name?.trim() || 'Unnamed location'
  return `${place} · ${row.vessel_name}`
}

function formatMetric(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

function LiveWeatherPanel({
  locations,
  locationsStatus,
  selectedId,
  selected,
  weather,
  weatherStatus,
  weatherError,
  onSelect,
  onOpenLocations,
  onRetryLocations,
  onRetryWeather,
}: LiveWeatherPanelProps) {
  const place = selected?.location_name?.trim() || weather?.location_name?.trim() || 'Saved location'
  const coords =
    selected != null
      ? `${selected.latitude.toFixed(3)}°, ${selected.longitude.toFixed(3)}°`
      : weather != null
        ? `${weather.latitude.toFixed(3)}°, ${weather.longitude.toFixed(3)}°`
        : ''

  const metrics = [
    {
      label: 'Temperature',
      value: formatMetric(weather?.temperature_c, 0),
      unit: '°C',
      trend: weather?.condition ?? 'Current air temperature',
    },
    {
      label: 'Condition',
      value: weather?.condition ?? '—',
      unit: '',
      trend: coords ? `At ${coords}` : 'Open-Meteo current conditions',
    },
    {
      label: 'Wind speed',
      value: formatMetric(weather?.wind_kmh, 0),
      unit: 'km/h',
      trend: weather?.wind_direction
        ? `${weather.wind_direction}${weather.wind_direction_deg != null ? ` · ${Math.round(weather.wind_direction_deg)}°` : ''}`
        : 'Surface wind',
    },
    {
      label: 'Wind direction',
      value: weather?.wind_direction ?? '—',
      unit: weather?.wind_direction_deg != null ? `${Math.round(weather.wind_direction_deg)}°` : '',
      trend: 'Compass from Open-Meteo',
    },
    {
      label: 'Rain',
      value: formatMetric(weather?.precipitation_mm, 1),
      unit: 'mm',
      trend: 'Current precipitation',
    },
  ]

  return (
    <div className="dash-weather">
      <div className="dash-weather-head">
        <div>
          <p className="dash-weather-kicker">Live weather</p>
          <h2>{place}</h2>
        </div>
      </div>

      {locationsStatus === 'loading' ? (
        <p className="dash-weather-status">Loading saved locations…</p>
      ) : locationsStatus === 'error' ? (
        <div className="dash-weather-status">
          <p>Could not load saved locations.</p>
          <button type="button" className="dash-weather-action" onClick={onRetryLocations}>
            Retry
          </button>
        </div>
      ) : locations.length === 0 ? (
        <div className="dash-weather-status">
          <p>Save a location first to see live weather here.</p>
          <button type="button" className="dash-weather-action" onClick={onOpenLocations}>
            Add a location
          </button>
        </div>
      ) : (
        <>
          <label className="dash-weather-picker">
            <span>Saved location</span>
            <select
              value={selectedId ?? ''}
              onChange={(event) => onSelect(Number(event.target.value))}
              aria-label="Saved location"
            >
              {locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {locationOptionLabel(row)}
                </option>
              ))}
            </select>
          </label>

          {weatherStatus === 'loading' || weatherStatus === 'idle' ? (
            <p className="dash-weather-status">Fetching live weather…</p>
          ) : weatherStatus === 'error' ? (
            <div className="dash-weather-status">
              <p>{weatherError || 'Weather is unavailable right now.'}</p>
              <button type="button" className="dash-weather-action" onClick={onRetryWeather}>
                Retry
              </button>
            </div>
          ) : (
            <div className="dash-metrics">
              {metrics.map((metric) => (
                <article className="dash-metric" key={metric.label}>
                  <p className="dash-metric-label">{metric.label}</p>
                  <p className={`dash-metric-value${metric.unit ? '' : ' is-text'}`}>
                    {metric.value}
                    {metric.unit ? <span>{metric.unit}</span> : null}
                  </p>
                  <p className="dash-metric-trend">{metric.trend}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
