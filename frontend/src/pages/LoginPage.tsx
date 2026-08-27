import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import './LoginPage.css'

const OCCUPATIONS = [
  'Fisherman',
  'Fisheries Cooperative',
  'Aquaculture / Fish Farming',
  'Coastal Authority',
  'Disaster Management',
  'Maritime Operator',
  'Port Authority',
  'Researcher / Scientist',
  'Student',
  'Other',
] as const

type Occupation = (typeof OCCUPATIONS)[number]
type Step = 'phone' | 'otp' | 'profile'
type Profile = {
  phone: string
  name: string
  email?: string
  occupation: Occupation
}
type Session = {
  phone: string
  name?: string
  occupation?: Occupation
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 30
const USERS_KEY = 'orca.users'
const SESSION_KEY = 'orca.session'
const REMEMBER_KEY = 'orca.remember'

function readUsers(): Profile[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as Partial<Profile>[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((user): user is Profile => typeof user?.phone === 'string')
  } catch {
    return []
  }
}

function saveUsers(users: Profile[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readRememberedPhone() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    // Sessions from the earlier email/password build have no phone number.
    if (typeof parsed?.phone !== 'string') {
      clearSession()
      return null
    }
    return parsed as Session
  } catch {
    clearSession()
    return null
  }
}

function formatPhone(value: string) {
  return value.length === 10 ? `${value.slice(0, 5)} ${value.slice(5)}` : value
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState(readRememberedPhone)
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(''))
  const [sentOtp, setSentOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [occupation, setOccupation] = useState<Occupation | ''>('')
  const [remember, setRemember] = useState(() => Boolean(readRememberedPhone()))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [session, setSession] = useState<Session | null>(readSession)
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus()
  }, [step])

  function resetMessages() {
    setError('')
    setNotice('')
  }

  function persistSession(next: Session) {
    const payload = JSON.stringify(next)
    if (remember) {
      localStorage.setItem(SESSION_KEY, payload)
      localStorage.setItem(REMEMBER_KEY, next.phone)
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, payload)
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    }
    setSession(next)
  }

  async function sendOtp() {
    resetMessages()
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter the 10 digit mobile number registered with you.')
      return
    }
    setPending(true)
    await wait()
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setSentOtp(code)
    setOtp(Array(OTP_LENGTH).fill(''))
    setCooldown(RESEND_SECONDS)
    setStep('otp')
    setPending(false)
    setNotice(`OTP sent to +91 ${formatPhone(phone)}. Demo code: ${code}`)
  }

  async function verifyOtp() {
    resetMessages()
    const code = otp.join('')
    if (code.length < OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits of the OTP.`)
      return
    }
    if (code !== sentOtp) {
      setError('That OTP is incorrect. Check the code or resend it.')
      return
    }

    setPending(true)
    await wait()
    const existing = readUsers().find((user) => user.phone === phone)
    setPending(false)

    if (existing) {
      persistSession({
        phone: existing.phone,
        name: existing.name,
        occupation: existing.occupation,
      })
      return
    }

    setStep('profile')
    setNotice('Mobile number verified. Tell us a little about you.')
  }

  async function saveProfile() {
    resetMessages()
    if (!name.trim()) {
      setError('Enter your name.')
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address, or leave it blank.')
      return
    }
    if (!occupation) {
      setError('Select your occupation.')
      return
    }

    setPending(true)
    await wait()
    const profile: Profile = {
      phone,
      name: name.trim(),
      email: trimmedEmail || undefined,
      occupation,
    }
    saveUsers([...readUsers().filter((user) => user.phone !== phone), profile])
    persistSession({ phone, name: profile.name, occupation })
    setPending(false)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (step === 'phone') void sendOtp()
    else if (step === 'otp') void verifyOtp()
    else void saveProfile()
  }

  function changeNumber() {
    setStep('phone')
    setOtp(Array(OTP_LENGTH).fill(''))
    setSentOtp('')
    setCooldown(0)
    resetMessages()
  }

  function fillOtp(index: number, value: string) {
    const digits = value.replace(/\D/g, '')
    setOtp((current) => {
      const next = [...current]
      if (!digits) {
        next[index] = ''
        return next
      }
      for (let offset = 0; offset < digits.length && index + offset < OTP_LENGTH; offset += 1) {
        next[index + offset] = digits[offset]
      }
      return next
    })
    if (digits) {
      otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus()
    }
  }

  function onOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      event.preventDefault()
      otpRefs.current[index - 1]?.focus()
      setOtp((current) => {
        const next = [...current]
        next[index - 1] = ''
        return next
      })
    }
    if (event.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
  }

  function signOut() {
    clearSession()
    setSession(null)
    changeNumber()
    setName('')
    setEmail('')
    setOccupation('')
  }

  const submitLabel =
    step === 'phone' ? 'Send OTP' : step === 'otp' ? 'Verify OTP' : 'Create account'

  return (
    <div className="login">
      <div className="login-bg" aria-hidden="true">
        <div className="login-grid" />
        <div className="login-glow login-glow-a" />
        <div className="login-glow login-glow-b" />
        <svg className="login-currents" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path d="M-80 620 C 180 520, 320 740, 560 640 S 980 500, 1520 610" />
          <path d="M-40 710 C 260 600, 420 800, 680 690 S 1100 560, 1500 700" />
          <path d="M-60 430 C 240 360, 480 520, 760 430 S 1180 300, 1540 420" />
        </svg>
      </div>

      <div className="login-shell">
        <header className="login-topbar">
          <img className="login-emblem login-flag" src="/india-flag.svg" alt="Flag of India" />
          <div className="login-brand">
            <p className="login-mark">ORCA</p>
            <p className="login-tagline">Marine Ecosystem Intelligence</p>
          </div>
          <img
            className="login-emblem login-agency"
            src="/isro-logo.png"
            alt="Indian Space Research Organisation"
          />
        </header>

        <main className="login-main">
          <section className="login-intro">
            <p className="login-kicker">{session ? 'Session open' : 'Welcome to ORCA'}</p>
            <h1>
              {session
                ? 'Marine intelligence, analysis and decision support.'
                : 'Access marine intelligence, analysis and decision support.'}
            </h1>
            <span className="login-rule" />
            {!session ? (
              <ol className="login-steps">
                <li className={step === 'phone' ? 'is-on' : ''}>Mobile number</li>
                <li className={step === 'otp' ? 'is-on' : ''}>Verify OTP</li>
                <li className={step === 'profile' ? 'is-on' : ''}>Your details</li>
              </ol>
            ) : null}
          </section>

          {session ? (
            <section className="login-panel">
              <p className="login-label">Signed in</p>
              <p className="login-session-email">+91 {formatPhone(session.phone)}</p>
              {session.name ? <p className="login-session-role">{session.name}</p> : null}
              {session.occupation ? (
                <p className="login-session-role">{session.occupation}</p>
              ) : null}
              <button type="button" className="text-action accent" onClick={signOut}>
                Sign out
              </button>
            </section>
          ) : (
            <form id="orca-auth" className="login-panel" onSubmit={onSubmit} noValidate>
              {step === 'phone' ? (
                <>
                  <label className="login-field">
                    <span>Mobile number</span>
                    <span className="login-input-row">
                      <i className="login-prefix">+91</i>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(event) =>
                          setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        autoComplete="tel-national"
                        placeholder="98765 43210"
                      />
                    </span>
                  </label>
                  <p className="login-hint">
                    We send a one time password to this number. No password to remember.
                  </p>
                </>
              ) : null}

              {step === 'otp' ? (
                <>
                  <div className="login-field">
                    <span>Enter OTP</span>
                    <div className="login-otp">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(element) => {
                            otpRefs.current[index] = element
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={OTP_LENGTH}
                          value={digit}
                          onChange={(event) => fillOtp(index, event.target.value)}
                          onKeyDown={(event) => onOtpKeyDown(index, event)}
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          aria-label={`OTP digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="login-hint">
                    Sent to +91 {formatPhone(phone)}
                    <button type="button" className="text-action" onClick={changeNumber}>
                      Change number
                    </button>
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => void sendOtp()}
                      disabled={cooldown > 0}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </button>
                  </p>
                </>
              ) : null}

              {step === 'profile' ? (
                <>
                  <label className="login-field">
                    <span>Name</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      spellCheck={false}
                    />
                  </label>

                  <label className="login-field">
                    <span>Email (optional)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      spellCheck={false}
                    />
                  </label>

                  <fieldset className="login-field login-options">
                    <legend>Occupation</legend>
                    <div className="login-chips">
                      {OCCUPATIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={occupation === item ? 'login-chip is-on' : 'login-chip'}
                          onClick={() => setOccupation(item)}
                          aria-pressed={occupation === item}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : null}

              {error ? <p className="login-error">{error}</p> : null}
              {notice ? <p className="login-notice">{notice}</p> : null}

              <button className="sr-only" type="submit" disabled={pending}>
                {submitLabel}
              </button>
            </form>
          )}
        </main>

        <footer className="login-footer">
          {!session ? (
            <div className="login-actions">
              <div className="login-actions-group">
                <span>Fishermen · Authorities · Researchers · Operators</span>
              </div>

              <div className="login-actions-group">
                <button
                  type="button"
                  className={remember ? 'text-action is-on' : 'text-action'}
                  onClick={() => setRemember((value) => !value)}
                  aria-pressed={remember}
                >
                  Keep me signed in
                </button>
              </div>

              <button
                type="submit"
                form="orca-auth"
                className="text-action accent"
                disabled={pending}
              >
                {pending ? 'Please wait' : submitLabel}
              </button>
            </div>
          ) : (
            <div className="login-actions">
              <p className="login-foot-copy">Workspace access is ready for this session.</p>
            </div>
          )}

          <div className="login-meta">
            <p>
              Powered by Earth Observation · Oceanographic data · Geospatial intelligence ·
              Agentic AI
            </p>
            <div className="login-legal">
              <button
                type="button"
                className={legal === 'privacy' ? 'text-action is-on' : 'text-action'}
                onClick={() => setLegal((value) => (value === 'privacy' ? null : 'privacy'))}
              >
                Privacy
              </button>
              <span className="sep">|</span>
              <button
                type="button"
                className={legal === 'terms' ? 'text-action is-on' : 'text-action'}
                onClick={() => setLegal((value) => (value === 'terms' ? null : 'terms'))}
              >
                Terms
              </button>
            </div>
          </div>

          {legal ? (
            <p className="login-legal-copy">
              {legal === 'privacy'
                ? 'ORCA uses your mobile number only to verify access and open your workspace. Location and query history stay on-device until the live marine services are connected.'
                : 'Recommendations are decision support drawn from public marine and Earth Observation sources. They do not replace official advisories or navigation notices.'}
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

function wait(ms = 450) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
