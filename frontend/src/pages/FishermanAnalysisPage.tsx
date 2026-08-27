import { useMemo, useRef, useState, type ReactNode } from 'react'
import OceanScene from '../components/OceanScene'
import FishermanNav from '../components/FishermanNav'
import {
  AlertIcon,
  BoatIcon,
  CheckIcon,
  CompassIcon,
  FishIcon,
  MicIcon,
  PinIcon,
  SparkIcon,
  WavesIcon,
  WindIcon,
} from '../components/Icons'
import type { Session } from '../auth/store'
import { advise } from '../marine/advise'
import { buildMapScene } from '../map/scene'
import DecisionMap from '../map/DecisionMap'
import type { MarineConditions } from '../marine/useMarineConditions'
import './FishermanHomePage.css'
import './FishermanAnalysisPage.css'

type FishermanAnalysisPageProps = {
  session: Session
  marine: MarineConditions
  query: string
  onSignOut: () => void
  onAskAgain: () => void
}

export default function FishermanAnalysisPage({
  session,
  marine,
  query,
  onSignOut,
  onAskAgain,
}: FishermanAnalysisPageProps) {
  const [mapFocus, setMapFocus] = useState<'route' | 'zone' | null>(null)
  const mapRef = useRef<HTMLElement | null>(null)
  const advice = useMemo(
    () => advise(marine.weather, marine.placeLabel),
    [marine.weather, marine.placeLabel],
  )
  const mapScene = useMemo(() => buildMapScene(marine.coordinates), [marine.coordinates])

  const weatherLive = marine.weatherStatus === 'ready' && Boolean(marine.weather)
  const weatherPending =
    marine.weatherStatus === 'loading' ||
    marine.locationStatus === 'locating' ||
    (marine.locationStatus === 'ready' && marine.weatherStatus === 'idle')
  const sst = marine.weather?.seaSurfaceC
  const wind = marine.weather?.windKmh
  const waves = marine.weather?.waveHeightM
  const verdictClass = weatherPending ? 'caution' : advice.verdict

  function showMap(focus: 'route' | 'zone') {
    setMapFocus(focus)
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="fh fa">
      <OceanScene />

      <div className="fh-layer fa-layer">
        <FishermanNav
          session={session}
          marine={marine}
          onSignOut={onSignOut}
          onBrandClick={onAskAgain}
        />

        <main className="fa-main">
          <section className="fa-question fa-enter">
            <p className="fa-kicker">Ask ORCA about the ocean</p>
            <h1>“{query}”</h1>
          </section>

          <div className="fa-split">
            <section className={`fa-decision fa-enter fa-enter-2 fa-verdict-${verdictClass}`}>
              {weatherPending ? (
                <>
                  <p className="fa-verdict">
                    <span className="fa-dot" aria-hidden="true" />
                    Checking local conditions…
                  </p>
                  <h2>Why?</h2>
                  <p className="fa-why">
                    ORCA is reading weather and sea state for your waters. The yes / no answer
                    appears as soon as that feed returns.
                  </p>
                </>
              ) : (
                <>
                  <p className="fa-verdict">
                    <span className="fa-dot" aria-hidden="true" />
                    {advice.headline}
                  </p>
                  <h2>Why?</h2>
                  <p className="fa-why">{advice.why}</p>
                  <ul className="fa-checks">
                    {advice.checks.map((item) => (
                      <li key={item}>
                        <CheckIcon width={16} height={16} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <aside className="fa-metrics">
              <MetricCard
                icon={<SparkIcon width={16} height={16} />}
                label="Sea surface temperature"
                value={typeof sst === 'number' ? `${sst}°C` : '—'}
                hint={metricHint(sst, weatherPending)}
                delay={3}
              />
              <MetricCard
                icon={<WindIcon width={16} height={16} />}
                label="Wind speed"
                value={typeof wind === 'number' ? `${wind} km/h` : '—'}
                hint={metricHint(wind, weatherPending)}
                delay={4}
              />
              <MetricCard
                icon={<WavesIcon width={16} height={16} />}
                label="Wave height"
                value={typeof waves === 'number' ? `${waves} m` : '—'}
                hint={metricHint(waves, weatherPending)}
                delay={5}
              />
              <MetricCard
                icon={<FishIcon width={16} height={16} />}
                label="Fishing activity"
                value={weatherPending ? '—' : advice.potential}
                hint={weatherPending ? 'Loading' : 'Estimate'}
                delay={6}
              />
            </aside>
          </div>

          <p className="fa-honesty fa-enter fa-enter-7">
            {honestyCopy(weatherLive, weatherPending, marine.placeLabel)}
          </p>

          <section className="fa-panel fa-enter fa-enter-8">
            <h2>What should I do?</h2>
            <div className="fa-actions-grid">
              <ActionItem icon={<SparkIcon width={18} height={18} />} label="Recommended fishing time">
                {advice.timeWindow}
              </ActionItem>
              <ActionItem icon={<PinIcon width={18} height={18} />} label="Recommended zone">
                {advice.zone}
              </ActionItem>
              <ActionItem icon={<CompassIcon width={18} height={18} />} label="Route">
                {advice.route}
              </ActionItem>
              <ActionItem icon={<AlertIcon width={18} height={18} />} label="Avoid">
                {advice.avoid}
              </ActionItem>
            </div>
          </section>

          <section className="fa-panel fa-enter fa-enter-9">
            <h2>Fishing potential</h2>
            <p className={`fa-potential fa-potential-${weatherPending ? 'moderate' : advice.potential.toLowerCase()}`}>
              {weatherPending ? '—' : advice.potential}
            </p>
            <p className="fa-copy">
              {weatherPending
                ? 'Fishing potential is estimated after local conditions are in.'
                : advice.potentialReason}
            </p>
          </section>

          <section ref={mapRef} className="fa-panel fa-map-panel fa-enter fa-enter-10">
            <div className="fa-map-head">
              <h2>Decision map</h2>
              <p>Real geographic map · SAMPLE FISHING-POTENTIAL DATA</p>
            </div>
            <DecisionMap
              coordinates={marine.coordinates}
              focus={mapFocus}
              onLocate={() => void marine.requestLocation()}
            />
          </section>

          <section className="fa-panel fa-enter fa-enter-11">
            <h2>{advice.hazard ? 'Marine alert' : 'Hazards'}</h2>
            {advice.hazard ? (
              <div className="fa-alert">
                <AlertIcon width={18} height={18} />
                <div>
                  <strong>{advice.hazard.title}</strong>
                  <p>Recommended action: {advice.hazard.action}</p>
                </div>
              </div>
            ) : (
              <p className="fa-clear">
                <CheckIcon width={16} height={16} />
                No major marine hazards detected in this weather feed.
              </p>
            )}
            {mapScene.geofenceAlert ? (
              <div className={`fa-alert fa-alert-${mapScene.geofenceAlert.kind}`}>
                <AlertIcon width={18} height={18} />
                <div>
                  <strong>
                    {mapScene.geofenceAlert.inside
                      ? mapScene.geofenceAlert.name
                      : `${mapScene.geofenceAlert.name} nearby`}
                  </strong>
                  <p>
                    {mapScene.geofenceAlert.inside
                      ? mapScene.geofenceAlert.message
                      : `Distance: ${mapScene.geofenceAlert.distanceKm} km. ${mapScene.geofenceAlert.message}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="fa-geo">
                No restricted area nearby in the prototype geofence layer. These boundaries are sample
                data, not official maritime limits.
              </p>
            )}
          </section>

          <div className="fa-cta fa-enter fa-enter-12">
            <button type="button" className="btn btn-primary" onClick={() => showMap('route')}>
              <CompassIcon width={18} height={18} />
              View Safe Route
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => showMap('zone')}>
              <BoatIcon width={18} height={18} />
              View Fishing Zone
            </button>
            <button type="button" className="btn btn-ghost" onClick={onAskAgain}>
              <MicIcon width={18} height={18} />
              Ask ORCA Another Question
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

function metricHint(value: number | undefined, pending: boolean) {
  if (typeof value === 'number') return 'Live'
  if (pending) return 'Loading'
  return 'Not available'
}

function honestyCopy(live: boolean, pending: boolean, placeLabel: string | null) {
  if (pending) return 'Reading local weather. Numbers appear when the feed returns — nothing here is invented.'
  if (live) {
    return `Live weather${placeLabel ? ` for ${placeLabel}` : ''}. Times, zones and the map are prototype decision aids — not a guarantee of where fish are.`
  }
  return 'SAMPLE DATA — PROTOTYPE. Allow location so ORCA can use live weather. Times and zones below are not live.'
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  delay,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  delay: number
}) {
  return (
    <article className={`fa-metric fa-enter fa-enter-${delay}`}>
      <p className="fa-metric-label">
        {icon}
        {label}
      </p>
      <p className="fa-metric-value">{value}</p>
      <p className="fa-metric-hint">{hint}</p>
    </article>
  )
}

function ActionItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="fa-action-item">
      <span className="fa-action-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{children}</strong>
      </div>
    </div>
  )
}
