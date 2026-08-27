import { useState, type FormEvent } from 'react'
import './LoginPage.css'

const ROLES = [
  'Researcher',
  'Fisherman',
  'Coastal Authority',
  'Disaster Management',
  'Maritime Operator',
] as const

type Mode = 'signin' | 'signup' | 'forgot'
type Session = { email: string; name?: string; role?: string }

const USERS_KEY = 'orca.users'
const SESSION_KEY = 'orca.session'
const REMEMBER_KEY = 'orca.remember'

function readUsers(): Array<{
  name: string
  email: string
  password: string
  role: string
}> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUsers(
  users: Array<{ name: string; email: string; password: string; role: string }>,
) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(readRememberedEmail)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('Fisherman')
  const [remember, setRemember] = useState(() => Boolean(readRememberedEmail()))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [session, setSession] = useState<Session | null>(readSession)
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null)

  function persistSession(next: Session) {
    const payload = JSON.stringify(next)
    if (remember) {
      localStorage.setItem(SESSION_KEY, payload)
      localStorage.setItem(REMEMBER_KEY, next.email)
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, payload)
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    }
    setSession(next)
  }

  function resetMessages() {
    setError('')
    setNotice('')
  }

  function switchMode(next: Mode) {
    setMode(next)
    setPassword('')
    setShowPassword(false)
    resetMessages()
    setLegal(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    resetMessages()

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (mode === 'forgot') {
      setPending(true)
      await wait()
      setPending(false)
      setNotice(`Reset instructions will be sent to ${trimmedEmail}.`)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Enter your name.')
        return
      }
      const users = readUsers()
      if (users.some((user) => user.email === trimmedEmail)) {
        setError('An account with this email already exists.')
        return
      }
      setPending(true)
      await wait()
      const profile = {
        name: name.trim(),
        email: trimmedEmail,
        password,
        role,
      }
      saveUsers([...users, profile])
      persistSession({ email: trimmedEmail, name: profile.name, role })
      setPending(false)
      return
    }

    const users = readUsers()
    const match = users.find((user) => user.email === trimmedEmail)

    if (match && match.password !== password) {
      setError('Email or password is incorrect.')
      return
    }

    setPending(true)
    await wait()
    persistSession({
      email: trimmedEmail,
      name: match?.name,
      role: match?.role,
    })
    setPending(false)
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setPassword('')
    setMode('signin')
    resetMessages()
  }

  function continueWithGoogle() {
    resetMessages()
    setNotice('Google sign-in will be connected in a later build.')
  }

  const submitLabel =
    mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send link' : 'Sign in'

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
        <header className="login-brand">
          <p className="login-mark">ORCA</p>
          <p className="login-tagline">Marine Ecosystem Intelligence</p>
        </header>

        <main className="login-main">
          <section className="login-intro">
            <p className="login-kicker">
              {session ? 'Session open' : 'Welcome to ORCA'}
            </p>
            <h1>
              {session
                ? 'Marine intelligence, analysis and decision support.'
                : 'Access marine intelligence, analysis and decision support.'}
            </h1>
            <span className="login-rule" />
          </section>

          {session ? (
            <section className="login-panel">
              <p className="login-label">Signed in</p>
              <p className="login-session-email">{session.email}</p>
              {session.role ? (
                <p className="login-session-role">{session.role}</p>
              ) : null}
              <button type="button" className="text-action accent" onClick={signOut}>
                Sign out
              </button>
            </section>
          ) : (
            <form id="orca-auth" className="login-panel" onSubmit={onSubmit} noValidate>
              {mode === 'signup' ? (
                <label className="login-field">
                  <span>Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    spellCheck={false}
                  />
                </label>
              ) : null}

              <label className="login-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  spellCheck={false}
                />
              </label>

              {mode !== 'forgot' ? (
                <label className="login-field">
                  <span>Password</span>
                  <span className="login-input-row">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => setShowPassword((open) => !open)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
              ) : null}

              {mode === 'signup' ? (
                <label className="login-field">
                  <span>Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
                    {ROLES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="login-roles">
                  <span>Your workspace adapts to your role.</span>
                  Researcher · Fisherman · Coastal Authority · Disaster Management ·
                  Maritime Operator
                  <i className="login-dot" />
                </p>
              )}

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
                <button type="button" className="text-action" onClick={continueWithGoogle}>
                  Continue with Google
                </button>
                <span className="sep">|</span>
                {mode === 'signup' ? (
                  <button type="button" className="text-action" onClick={() => switchMode('signin')}>
                    Sign in
                  </button>
                ) : (
                  <button type="button" className="text-action" onClick={() => switchMode('signup')}>
                    Create account
                  </button>
                )}
              </div>

              <div className="login-actions-group">
                {mode !== 'forgot' ? (
                  <>
                    <button
                      type="button"
                      className={remember ? 'text-action is-on' : 'text-action'}
                      onClick={() => setRemember((value) => !value)}
                      aria-pressed={remember}
                    >
                      Remember me
                    </button>
                    <span className="sep">|</span>
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </>
                ) : (
                  <button type="button" className="text-action" onClick={() => switchMode('signin')}>
                    Back to sign in
                  </button>
                )}
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
                ? 'ORCA uses account details only to open your workspace. Location and query history stay on-device until the live marine services are connected.'
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
