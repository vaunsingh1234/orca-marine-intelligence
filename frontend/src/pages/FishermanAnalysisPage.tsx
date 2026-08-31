import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import OceanScene from '../components/OceanScene'
import FishermanNav from '../components/FishermanNav'
import {
  AlertIcon,
  BoatIcon,
  CheckIcon,
  CompassIcon,
  FishIcon,
  PinIcon,
  SendIcon,
  SparkIcon,
  WavesIcon,
  WindIcon,
} from '../components/Icons'
import type { Session } from '../auth/store'
import { askOrca } from '../chat/api'
import { ChatApiError, type ChatResponse, type ChatTurn } from '../chat/types'
import { buildMapScene } from '../map/scene'
import DecisionMap from '../map/DecisionMap'
import type { MarineConditions } from '../marine/useMarineConditions'
import './FishermanHomePage.css'
import './FishermanAnalysisPage.css'

type FishermanAnalysisPageProps = {
  session: Session
  marine: MarineConditions
  initialQuery: string
  onSignOut: () => void
  onAskAgain: () => void
  onOpenVessels: () => void
  onOpenLocations: () => void
}

export default function FishermanAnalysisPage({
  session,
  marine,
  initialQuery,
  onSignOut,
  onAskAgain,
  onOpenVessels,
  onOpenLocations,
}: FishermanAnalysisPageProps) {
  const [question, setQuestion] = useState(initialQuery)
  const [followUp, setFollowUp] = useState('')
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [result, setResult] = useState<ChatResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [mapFocus, setMapFocus] = useState<'route' | 'zone' | null>(null)
  const mapRef = useRef<HTMLElement | null>(null)
  const requestRef = useRef(0)
  const historyRef = useRef<ChatTurn[]>([])
  const resultRef = useRef<ChatResponse | null>(null)
  const marineRef = useRef(marine)

  historyRef.current = history
  resultRef.current = result
  marineRef.current = marine

  const mapScene = useMemo(() => buildMapScene(marine.coordinates), [marine.coordinates])
  const weatherPending =
    marine.weatherStatus === 'loading' ||
    marine.locationStatus === 'locating' ||
    (marine.locationStatus === 'ready' && marine.weatherStatus === 'idle')
  const sst = marine.weather?.seaSurfaceC
  const wind = marine.weather?.windKmh
  const waves = marine.weather?.waveHeightM
  const verdictClass = result?.verdict ?? 'caution'
  const analyzing = status === 'loading'

  useEffect(() => {
    const id = ++requestRef.current
    const controller = new AbortController()
    let cancelled = false
    setStatus('loading')
    setError('')

    async function run() {
      const deadline = Date.now() + 2500
      while (!cancelled && Date.now() < deadline) {
        const current = marineRef.current
        const waiting =
          current.weatherStatus === 'loading' ||
          current.locationStatus === 'locating' ||
          (current.locationStatus === 'ready' && current.weatherStatus === 'idle')
        if (!waiting) break
        await new Promise((resolve) => window.setTimeout(resolve, 200))
      }
      if (cancelled || id !== requestRef.current) return

      const current = marineRef.current
      try {
        const payload = await askOrca(
          question,
          historyRef.current,
          {
            place_label: current.placeLabel,
            latitude: current.coordinates?.latitude ?? null,
            longitude: current.coordinates?.longitude ?? null,
            temperature_c: current.weather?.temperatureC ?? null,
            condition: current.weather?.condition ?? null,
            wind_kmh: current.weather?.windKmh ?? null,
            wave_height_m: current.weather?.waveHeightM ?? null,
            sea_surface_c: current.weather?.seaSurfaceC ?? null,
            weather_available: current.weatherStatus === 'ready' && Boolean(current.weather),
          },
          controller.signal,
        )
        if (id !== requestRef.current) return
        setResult(payload)
        setStatus('ready')
      } catch (cause) {
        if (id !== requestRef.current || controller.signal.aborted) return
        setResult(null)
        setStatus('error')
        setError(
          cause instanceof ChatApiError
            ? cause.message
            : "ORCA couldn't retrieve the latest marine information right now. Please try again.",
        )
      }
    }

    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [question])

  function showMap(focus: 'route' | 'zone') {
    setMapFocus(focus)
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function onFollowUp(event: FormEvent) {
    event.preventDefault()
    const next = followUp.trim()
    if (!next || analyzing) return
    const previous = resultRef.current
    const turns: ChatTurn[] = [
      ...historyRef.current,
      { role: 'user', content: question },
    ]
    if (previous?.answer) {
      turns.push({
        role: 'assistant',
        content: `${previous.headline}. ${previous.answer}`,
      })
    }
    setHistory(turns.slice(-8))
    setFollowUp('')
    setQuestion(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showConditions = Boolean(result?.show_conditions)
  const showActions = Boolean(result?.show_actions)
  const showMapPanel = Boolean(result?.show_map)
  const showPotential = Boolean(result?.show_potential)

  return (
    <div className="fh fa">
      <OceanScene />

      <div className="fh-layer fa-layer">
        <FishermanNav
          session={session}
          marine={marine}
          onSignOut={onSignOut}
          onBrandClick={onAskAgain}
          onOpenVessels={onOpenVessels}
          onOpenLocations={onOpenLocations}
        />

        <main className="fa-main">
          <section className="fa-question fa-enter">
            <p className="fa-kicker">Ask ORCA about the ocean</p>
            <h1>“{question}”</h1>
          </section>

          <div className={`fa-split${showConditions || analyzing ? '' : ' fa-split-solo'}`}>
            <section className={`fa-decision fa-enter fa-enter-2 fa-verdict-${verdictClass}`}>
              {analyzing ? (
                <>
                  <p className="fa-verdict">
                    <span className="fa-dot" aria-hidden="true" />
                    ORCA is analyzing marine intelligence…
                  </p>
                  <h2>Why?</h2>
                  <p className="fa-why">
                    Reading your question{weatherPending ? ' and local sea conditions' : ''}. The
                    answer appears as soon as ORCA finishes.
                  </p>
                </>
              ) : status === 'error' ? (
                <>
                  <p className="fa-verdict">
                    <span className="fa-dot" aria-hidden="true" />
                    ORCA could not finish that analysis
                  </p>
                  <h2>Try again</h2>
                  <p className="fa-why">{error}</p>
                </>
              ) : result ? (
                <>
                  <p className="fa-verdict">
                    <span className="fa-dot" aria-hidden="true" />
                    {result.headline}
                  </p>
                  <h2>{result.kind === 'decision' ? 'Why?' : 'Answer'}</h2>
                  <p className="fa-why">{result.answer}</p>
                  {result.bullets.length > 0 ? (
                    <ul className="fa-checks">
                      {result.bullets.map((item) => (
                        <li key={item}>
                          <CheckIcon width={16} height={16} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </section>

            {showConditions || analyzing ? (
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
                  value={analyzing ? '—' : result?.potential ?? '—'}
                  hint={analyzing ? 'Loading' : result?.used_live_data ? 'Estimate' : 'Not applicable'}
                  delay={6}
                />
              </aside>
            ) : null}
          </div>

          {result?.data_note ? (
            <p className="fa-honesty fa-enter fa-enter-7">{result.data_note}</p>
          ) : analyzing ? (
            <p className="fa-honesty fa-enter fa-enter-7">
              Reading local weather when available. Numbers are never invented.
            </p>
          ) : null}

          {showActions && result ? (
            <section className="fa-panel fa-enter fa-enter-8">
              <h2>What should I do?</h2>
              <div className="fa-actions-grid">
                <ActionItem icon={<SparkIcon width={18} height={18} />} label="Recommended fishing time">
                  {result.time_window ?? '—'}
                </ActionItem>
                <ActionItem icon={<PinIcon width={18} height={18} />} label="Recommended zone">
                  {result.zone ?? '—'}
                </ActionItem>
                <ActionItem icon={<CompassIcon width={18} height={18} />} label="Route">
                  {result.route ?? '—'}
                </ActionItem>
                <ActionItem icon={<AlertIcon width={18} height={18} />} label="Avoid">
                  {result.avoid ?? '—'}
                </ActionItem>
              </div>
            </section>
          ) : null}

          {showPotential && result ? (
            <section className="fa-panel fa-enter fa-enter-9">
              <h2>Fishing potential</h2>
              <p className={`fa-potential fa-potential-${(result.potential ?? 'moderate').toLowerCase()}`}>
                {result.potential ?? '—'}
              </p>
              <p className="fa-copy">{result.potential_reason ?? 'Estimated from available marine conditions.'}</p>
            </section>
          ) : null}

          {showMapPanel ? (
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
          ) : null}

          {(showMapPanel || result?.hazard) && result ? (
            <section className="fa-panel fa-enter fa-enter-11">
              <h2>{result.hazard ? 'Marine alert' : 'Hazards'}</h2>
              {result.hazard ? (
                <div className="fa-alert">
                  <AlertIcon width={18} height={18} />
                  <div>
                    <strong>{result.hazard.title}</strong>
                    <p>Recommended action: {result.hazard.action}</p>
                  </div>
                </div>
              ) : (
                <p className="fa-clear">
                  <CheckIcon width={16} height={16} />
                  No major marine hazards called out for this question.
                </p>
              )}
              {showMapPanel && mapScene.geofenceAlert ? (
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
              ) : null}
            </section>
          ) : null}

          {showMapPanel ? (
            <div className="fa-cta fa-enter fa-enter-12">
              <button type="button" className="btn btn-primary" onClick={() => showMap('route')}>
                <CompassIcon width={18} height={18} />
                View Safe Route
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => showMap('zone')}>
                <BoatIcon width={18} height={18} />
                View Fishing Zone
              </button>
            </div>
          ) : null}

          <section className="fa-follow fa-enter fa-enter-13">
            <p className="fh-ask-label">Ask ORCA another question</p>
            <form className="fh-ask" onSubmit={onFollowUp}>
              <input
                value={followUp}
                onChange={(event) => setFollowUp(event.target.value)}
                placeholder="Ask anything about the ocean…"
                aria-label="Ask ORCA another question"
                autoComplete="off"
                spellCheck={false}
                disabled={analyzing}
              />
              <button
                type="submit"
                className="btn btn-primary fh-send"
                disabled={analyzing || !followUp.trim()}
              >
                <SendIcon width={18} height={18} />
                Analyze
              </button>
            </form>
          </section>
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
