import { useState } from 'react'
import OceanScene from '../components/OceanScene'
import {
  AlertIcon,
  BrandMark,
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

const METRICS = [
  { label: 'Sea surface temp', value: '28.6', unit: '°C', trend: '+0.4 vs 7-day' },
  { label: 'Significant wave height', value: '1.4', unit: 'm', trend: 'Calm to moderate' },
  { label: 'Wind speed', value: '18', unit: 'km/h', trend: 'South-westerly' },
  { label: 'Chlorophyll-a', value: '0.82', unit: 'mg/m³', trend: 'Bloom forming' },
]

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
  if (session.profession === 'fisherman') {
    return <FishermanFlow session={session} onSignOut={onSignOut} />
  }

  return <ResearcherDashboard session={session} onSignOut={onSignOut} />
}

function FishermanFlow({ session, onSignOut }: DashboardPageProps) {
  const marine = useMarineConditions()
  const [analysisQuery, setAnalysisQuery] = useState<string | null>(null)

  if (analysisQuery) {
    return (
      <FishermanAnalysisPage
        key={analysisQuery}
        session={session}
        marine={marine}
        query={analysisQuery}
        onSignOut={onSignOut}
        onAskAgain={() => setAnalysisQuery(null)}
      />
    )
  }

  return (
    <FishermanHomePage
      session={session}
      marine={marine}
      onSignOut={onSignOut}
      onAnalyze={setAnalysisQuery}
    />
  )
}

function ResearcherDashboard({ session, onSignOut }: DashboardPageProps) {
  const [query, setQuery] = useState('')
  const profession = getProfession(session.profession)
  const prompts = PROMPTS[session.profession] ?? PROMPTS.researcher
  const firstName = session.name.split(' ')[0]

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
              Data services are not connected in this prototype — figures below are illustrative.
            </p>
          </section>

          <section className="dash-side">
            <div className="dash-metrics">
              {METRICS.map((metric) => (
                <article className="dash-metric" key={metric.label}>
                  <p className="dash-metric-label">{metric.label}</p>
                  <p className="dash-metric-value">
                    {metric.value}
                    <span>{metric.unit}</span>
                  </p>
                  <p className="dash-metric-trend">{metric.trend}</p>
                </article>
              ))}
            </div>

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
