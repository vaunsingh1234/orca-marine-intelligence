import { useEffect, useRef, useState, type FormEvent } from 'react'
import OceanScene from '../components/OceanScene'
import FishermanNav from '../components/FishermanNav'
import { MicIcon, SendIcon, ShieldIcon } from '../components/Icons'
import type { Session } from '../auth/store'
import type { MarineConditions } from '../marine/useMarineConditions'
import './FishermanHomePage.css'

const SUGGESTIONS = [
  {
    question: 'Can I go fishing tomorrow?',
    detail: 'Check weather, sea conditions and safety.',
  },
  {
    question: 'Where are the best fishing zones?',
    detail: 'Find nearby areas with stronger activity.',
  },
  {
    question: 'Is it safe to go to sea today?',
    detail: 'See hazards, wind and sea conditions.',
  },
  {
    question: 'What will the weather be like this weekend?',
    detail: 'Get a short marine weather outlook.',
  },
] as const

type FishermanHomePageProps = {
  session: Session
  marine: MarineConditions
  onSignOut: () => void
  onAnalyze: (query: string) => void
}

export default function FishermanHomePage({
  session,
  marine,
  onSignOut,
  onAnalyze,
}: FishermanHomePageProps) {
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => new Date())
  const inputRef = useRef<HTMLInputElement | null>(null)

  const firstName = session.name.trim().split(/\s+/).filter(Boolean)[0]
  const greeting = firstName
    ? `${periodGreeting(now)}, ${firstName}! 👋`
    : `${periodGreeting(now)}! 👋`

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function onAsk(event: FormEvent) {
    event.preventDefault()
    const next = query.trim()
    if (!next) return
    onAnalyze(next)
  }

  function fillQuestion(question: string) {
    setQuery(question)
    setNotice('')
    inputRef.current?.focus()
  }

  function listen() {
    const Speech = speechEngine()
    if (!Speech) {
      setNotice('Voice input is not available on this device. Type your question instead.')
      inputRef.current?.focus()
      return
    }

    const recognition = new Speech()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    setListening(true)
    setNotice('')
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript?.trim()
      if (spoken) setQuery(spoken)
    }
    recognition.onerror = () => {
      setNotice('Could not hear that. Try again or type your question.')
    }
    recognition.onend = () => setListening(false)
    recognition.start()
  }

  return (
    <div className="fh">
      <OceanScene />

      <div className="fh-layer">
        <FishermanNav session={session} marine={marine} onSignOut={onSignOut} />

        <main className="fh-main">
          <section className="fh-hero">
            <p className="fh-hello">{greeting}</p>
            <h1>
              How can <span>ORCA</span> help you today?
            </h1>
            <p className="fh-lede">
              Ask anything about the ocean, weather, fishing zones, safety and more.
            </p>
          </section>

          <section className="fh-ask-wrap">
            <p className="fh-ask-label">Ask ORCA about the ocean</p>
            <form className="fh-ask" onSubmit={onAsk}>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask anything about the ocean…"
                aria-label="Ask ORCA about the ocean"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className={listening ? 'fh-mic is-on' : 'fh-mic'}
                onClick={listen}
                aria-label={listening ? 'Listening' : 'Speak your question'}
              >
                <MicIcon />
              </button>
              <button type="submit" className="btn btn-primary fh-send" disabled={!query.trim()}>
                <SendIcon width={18} height={18} />
                Analyze
              </button>
            </form>
            <p className="fh-trust">
              <ShieldIcon width={14} height={14} />
              ORCA combines marine data, weather intelligence and geospatial information to
              provide decision support.
            </p>
            {notice ? <p className="fh-notice">{notice}</p> : null}
          </section>

          <section className="fh-suggest">
            <p className="fh-suggest-label">Try asking something like…</p>
            <div className="fh-suggest-grid">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item.question}
                  type="button"
                  className="fh-suggest-card"
                  onClick={() => fillQuestion(item.question)}
                >
                  <strong>{item.question}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function periodGreeting(date: Date) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

type SpeechEngine = {
  lang: string
  interimResults: boolean
  start: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function speechEngine(): (new () => SpeechEngine) | undefined {
  const host = window as unknown as {
    SpeechRecognition?: new () => SpeechEngine
    webkitSpeechRecognition?: new () => SpeechEngine
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition
}
