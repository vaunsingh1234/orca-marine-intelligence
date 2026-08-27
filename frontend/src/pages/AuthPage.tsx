import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import OceanScene from '../components/OceanScene'
import RoleSelect from '../components/RoleSelect'
import {
  BrandMark,
  CheckIcon,
  ChevronLeftIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../components/Icons'
import { usesEmail, type ProfessionId } from '../auth/professions'
import {
  createUser,
  findByEmail,
  findByIdentifier,
  findByPhone,
  maskEmail,
  maskPhone,
  readRememberedIdentifier,
  resetPassword,
  saveSession,
  toSession,
  verifyPassword,
  type Session,
  type StoredUser,
} from '../auth/store'
import {
  checkPassword,
  generateOtp,
  isValidEmail,
  isValidName,
  isValidPhone,
  OTP_LENGTH,
  RESEND_SECONDS,
} from '../auth/validate'
import './AuthPage.css'

type View = 'signin' | 'register' | 'forgot'
type RegisterStep = 'details' | 'verify' | 'password'
type ForgotStep = 'identify' | 'verify' | 'reset'

type AuthPageProps = {
  onAuthenticated: (session: Session) => void
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [view, setView] = useState<View>('signin')
  const [registerStep, setRegisterStep] = useState<RegisterStep>('details')
  const [forgotStep, setForgotStep] = useState<ForgotStep>('identify')

  const [identifier, setIdentifier] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(readRememberedIdentifier()))

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [profession, setProfession] = useState<ProfessionId | ''>('')

  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(''))
  const [sentCode, setSentCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const [resetTarget, setResetTarget] = useState<StoredUser | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [needsRegister, setNeedsRegister] = useState(false)

  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  const emailRequired = profession ? usesEmail(profession) : false
  const verifyChannel: 'sms' | 'email' =
    view === 'register' ? (emailRequired ? 'email' : 'sms') : resetTarget?.email ? 'email' : 'sms'
  const verifyTarget =
    view === 'register'
      ? emailRequired
        ? maskEmail(email.trim().toLowerCase())
        : maskPhone(phone)
      : resetTarget?.email
        ? maskEmail(resetTarget.email)
        : maskPhone(resetTarget?.phone || '')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const otpVisible =
    (view === 'register' && registerStep === 'verify') || (view === 'forgot' && forgotStep === 'verify')

  useEffect(() => {
    if (otpVisible) otpRefs.current[0]?.focus()
  }, [otpVisible])

  function clearMessages() {
    setError('')
    setNotice('')
    setNeedsRegister(false)
  }

  function resetCodeState() {
    setOtp(Array(OTP_LENGTH).fill(''))
    setSentCode('')
    setCooldown(0)
  }

  function goTo(next: View) {
    clearMessages()
    resetCodeState()
    setPassword('')
    setConfirm('')
    setShowPassword(false)
    setRegisterStep('details')
    setForgotStep('identify')
    setResetTarget(null)
    setView(next)
  }

  function issueCode(channel: 'sms' | 'email', target: string) {
    const code = generateOtp()
    setSentCode(code)
    setOtp(Array(OTP_LENGTH).fill(''))
    setCooldown(RESEND_SECONDS)
    setNotice(
      channel === 'sms'
        ? `Verification code sent by SMS to ${target}.`
        : `Verification code sent to ${target}.`,
    )
    return code
  }

  async function handleSignIn() {
    clearMessages()
    const value = identifier.trim()
    if (!value) {
      setError('Enter your mobile number or email address.')
      return
    }
    const looksLikeEmail = value.includes('@')
    if (looksLikeEmail ? !isValidEmail(value) : !isValidPhone(value)) {
      setError(
        looksLikeEmail
          ? 'That email address does not look right.'
          : 'Enter a valid 10-digit mobile number, or use your email address.',
      )
      return
    }
    if (!signInPassword) {
      setError('Enter your password.')
      return
    }

    setPending(true)
    await wait()
    const user = findByIdentifier(value)
    if (!user) {
      setPending(false)
      setNeedsRegister(true)
      setError('You are not a registered member. Please register first to use ORCA.')
      return
    }
    const ok = await verifyPassword(user, signInPassword)
    setPending(false)
    if (!ok) {
      setError('Incorrect password. Try again or reset it using “Forgot password”.')
      return
    }

    const session = toSession(user)
    saveSession(session, remember)
    onAuthenticated(session)
  }

  async function handleRegisterDetails() {
    clearMessages()
    if (!isValidName(name)) {
      setError('Enter your full name as it should appear on ORCA.')
      return
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    if (findByPhone(phone)) {
      setNeedsRegister(false)
      setError('This mobile number is already registered. Sign in instead.')
      return
    }
    if (!profession) {
      setError('Select your profession or role.')
      return
    }
    if (emailRequired) {
      if (!isValidEmail(email)) {
        setError('Enter a valid email address — your verification code goes there.')
        return
      }
      if (findByEmail(email)) {
        setError('This email address is already registered. Sign in instead.')
        return
      }
    }

    setPending(true)
    await wait()
    issueCode(
      emailRequired ? 'email' : 'sms',
      emailRequired ? maskEmail(email.trim().toLowerCase()) : maskPhone(phone),
    )
    setRegisterStep('verify')
    setPending(false)
  }

  async function handleVerifyCode(next: 'password' | 'reset') {
    clearMessages()
    const code = otp.join('')
    if (code.length < OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits of the verification code.`)
      return
    }
    if (code !== sentCode) {
      setError('That code is not correct. Check it again or request a new one.')
      return
    }

    setPending(true)
    await wait()
    setPending(false)
    setPassword('')
    setConfirm('')
    if (next === 'password') {
      setRegisterStep('password')
      setNotice(
        verifyChannel === 'sms'
          ? 'Mobile number verified. Now choose a password.'
          : 'Email verified. Now choose a password.',
      )
    } else {
      setForgotStep('reset')
      setNotice('Identity confirmed. Set a new password.')
    }
  }

  async function handleCreateAccount() {
    clearMessages()
    const strength = checkPassword(password)
    if (strength.problem) {
      setError(strength.problem)
      return
    }
    if (password !== confirm) {
      setError('Both passwords must match.')
      return
    }
    if (!agreed) {
      setError('Please accept the advisory terms to continue.')
      return
    }
    if (!profession) {
      setError('Select your profession or role.')
      return
    }

    setPending(true)
    await wait()
    const user = await createUser({
      name,
      phone,
      email: emailRequired ? email : undefined,
      profession,
      password,
    })
    const session = toSession(user)
    saveSession(session, true)
    setPending(false)
    onAuthenticated(session)
  }

  async function handleForgotIdentify() {
    clearMessages()
    const value = identifier.trim()
    if (!value) {
      setError('Enter the mobile number or email you registered with.')
      return
    }
    const looksLikeEmail = value.includes('@')
    if (looksLikeEmail ? !isValidEmail(value) : !isValidPhone(value)) {
      setError('Enter a valid 10-digit mobile number or email address.')
      return
    }

    setPending(true)
    await wait()
    const user = findByIdentifier(value)
    setPending(false)
    if (!user) {
      setNeedsRegister(true)
      setError('You are not a registered member. Please register first to use ORCA.')
      return
    }

    setResetTarget(user)
    issueCode(user.email ? 'email' : 'sms', user.email ? maskEmail(user.email) : maskPhone(user.phone))
    setForgotStep('verify')
  }

  async function handleResetPassword() {
    clearMessages()
    if (!resetTarget) {
      setForgotStep('identify')
      return
    }
    const strength = checkPassword(password)
    if (strength.problem) {
      setError(strength.problem)
      return
    }
    if (password !== confirm) {
      setError('Both passwords must match.')
      return
    }

    setPending(true)
    await wait()
    await resetPassword(resetTarget.id, password)
    setPending(false)

    const signInWith = resetTarget.email || resetTarget.phone
    goTo('signin')
    setIdentifier(signInWith)
    setSignInPassword('')
    setNotice('Password updated. Sign in with your new password.')
  }

  async function handleResend() {
    if (cooldown > 0) return
    clearMessages()
    setPending(true)
    await wait(250)
    if (view === 'register') {
      issueCode(
        emailRequired ? 'email' : 'sms',
        emailRequired ? maskEmail(email.trim().toLowerCase()) : maskPhone(phone),
      )
    } else if (resetTarget) {
      issueCode(
        resetTarget.email ? 'email' : 'sms',
        resetTarget.email ? maskEmail(resetTarget.email) : maskPhone(resetTarget.phone),
      )
    }
    setPending(false)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    if (view === 'signin') void handleSignIn()
    else if (view === 'register') {
      if (registerStep === 'details') void handleRegisterDetails()
      else if (registerStep === 'verify') void handleVerifyCode('password')
      else void handleCreateAccount()
    } else {
      if (forgotStep === 'identify') void handleForgotIdentify()
      else if (forgotStep === 'verify') void handleVerifyCode('reset')
      else void handleResetPassword()
    }
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
    if (digits) otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus()
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

  function selectProfession(id: ProfessionId) {
    setProfession(id)
    setError('')
    if (!usesEmail(id)) setEmail('')
  }

  function back() {
    clearMessages()
    if (view === 'register' && registerStep === 'verify') {
      resetCodeState()
      setRegisterStep('details')
      return
    }
    if (view === 'register' && registerStep === 'password') {
      setRegisterStep('verify')
      return
    }
    if (view === 'forgot' && forgotStep === 'verify') {
      resetCodeState()
      setForgotStep('identify')
      return
    }
    if (view === 'forgot' && forgotStep === 'reset') {
      setForgotStep('verify')
      return
    }
    goTo('signin')
  }

  const copy = cardCopy(view, registerStep, forgotStep, verifyChannel, verifyTarget)
  const showBack = view !== 'signin'
  const registerStepIndex = registerStep === 'details' ? 0 : registerStep === 'verify' ? 1 : 2

  return (
    <div className="auth">
      <OceanScene />

      <div className="auth-layer">
        <header className="auth-top">
          <div className="brand">
            <BrandMark className="brand-mark" />
            <div>
              <p className="brand-name">ORCA</p>
              <p className="brand-sub">Marine Intelligence</p>
            </div>
          </div>
        </header>

        <main className="auth-stage">
          {/* One fixed-size shell for every view, so switching only swaps the inner content. */}
          <section className="auth-card">
            <div className="auth-card-edge" />

            <header className="auth-card-head">
              {showBack ? (
                <button type="button" className="auth-back" onClick={back} aria-label="Go back">
                  <ChevronLeftIcon />
                </button>
              ) : null}
              <BrandMark className="auth-card-mark" width={42} height={42} />
              <h2>{copy.title}</h2>
              <p>{copy.subtitle}</p>
            </header>

            {view === 'register' ? (
              <ol className="auth-steps" aria-label="Registration progress">
                {['Details', 'Verify', 'Password'].map((label, index) => (
                  <li
                    key={label}
                    className={
                      index === registerStepIndex ? 'is-on' : index < registerStepIndex ? 'is-done' : ''
                    }
                  >
                    <i>
                      {index < registerStepIndex ? <CheckIcon width={13} height={13} /> : index + 1}
                    </i>
                    {label}
                  </li>
                ))}
              </ol>
            ) : null}

            <form id="orca-auth" key={view} className="auth-form" onSubmit={onSubmit} noValidate>
              {view === 'signin' ? (
                <>
                  <Field
                    id="signin-identifier"
                    label="Mobile number or email"
                    icon={identifier.includes('@') ? <MailIcon /> : <PhoneIcon />}
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder="Enter mobile number or email"
                    autoComplete="username"
                  />
                  <Field
                    id="signin-password"
                    label="Password"
                    icon={<LockIcon />}
                    type={showPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={setSignInPassword}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    trailing={
                      <RevealButton shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                    }
                  />

                  <div className="auth-row">
                    <label className="auth-check">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                      />
                      <span className="auth-box" aria-hidden="true" />
                      Remember me
                    </label>
                    <button type="button" className="link-btn" onClick={() => goTo('forgot')}>
                      Forgot password?
                    </button>
                  </div>
                </>
              ) : null}

              {view === 'register' && registerStep === 'details' ? (
                <div className="auth-grid">
                  <Field
                    id="register-name"
                    label="Full name"
                    icon={<UserIcon />}
                    value={name}
                    onChange={setName}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                  <Field
                    id="register-phone"
                    label="Mobile number"
                    icon={<PhoneIcon />}
                    prefix="+91"
                    value={phone}
                    onChange={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter mobile number"
                    inputMode="numeric"
                    autoComplete="tel-national"
                  />
                  <div className={emailRequired ? undefined : 'auth-span'}>
                    <RoleSelect
                      id="register-role"
                      label="Profession / Role"
                      value={profession}
                      onChange={selectProfession}
                    />
                  </div>
                  {emailRequired ? (
                    <Field
                      id="register-email"
                      label="Email address"
                      icon={<MailIcon />}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="Enter email address"
                      autoComplete="email"
                      hint="Your verification code is sent to this address."
                    />
                  ) : null}
                </div>
              ) : null}

              {otpVisible ? (
                <>
                  <div className="auth-field">
                    <span className="auth-label">
                      {verifyChannel === 'sms' ? 'One-time password' : 'Email verification code'}
                    </span>
                    <div className="auth-otp">
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
                          aria-label={`Digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="auth-row">
                    <span className="auth-muted">Sent to {verifyTarget}</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => void handleResend()}
                      disabled={cooldown > 0 || pending}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>

                  {sentCode ? (
                    <p className="auth-demo">
                      <span>Prototype mode — no SMS/email gateway connected.</span>
                      <strong>{sentCode}</strong>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setOtp(sentCode.split(''))}
                      >
                        Autofill
                      </button>
                    </p>
                  ) : null}
                </>
              ) : null}

              {(view === 'register' && registerStep === 'password') ||
              (view === 'forgot' && forgotStep === 'reset') ? (
                <>
                  <div className="auth-grid">
                    <div className="auth-col">
                      <Field
                        id="new-password"
                        label={view === 'register' ? 'Create password' : 'New password'}
                        icon={<LockIcon />}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={setPassword}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        trailing={
                          <RevealButton
                            shown={showPassword}
                            onToggle={() => setShowPassword((v) => !v)}
                          />
                        }
                      />
                      <PasswordMeter password={password} />
                    </div>
                    <div className="auth-col">
                      <Field
                        id="confirm-password"
                        label="Confirm password"
                        icon={<LockIcon />}
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={setConfirm}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {view === 'register' ? (
                    <label className="auth-check auth-check-block">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                      />
                      <span className="auth-box" aria-hidden="true" />
                      ORCA guidance is decision support, not an official advisory. I understand.
                    </label>
                  ) : null}
                </>
              ) : null}

              {view === 'forgot' && forgotStep === 'identify' ? (
                <Field
                  id="forgot-identifier"
                  label="Registered mobile number or email"
                  icon={identifier.includes('@') ? <MailIcon /> : <PhoneIcon />}
                  value={identifier}
                  onChange={setIdentifier}
                  placeholder="Enter mobile number or email"
                  autoComplete="username"
                  hint="Fishermen receive an OTP by SMS. Everyone else gets a code by email."
                />
              ) : null}
            </form>

            <div className="auth-actions">
              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                  {needsRegister ? (
                    <button type="button" className="link-btn" onClick={() => goTo('register')}>
                      Register now
                    </button>
                  ) : null}
                </p>
              ) : null}
              {notice && !error ? <p className="auth-notice">{notice}</p> : null}

              <button
                className="btn btn-primary auth-submit"
                type="submit"
                form="orca-auth"
                disabled={pending}
              >
                {pending ? 'Please wait…' : copy.cta}
              </button>

              {view === 'signin' ? (
                <>
                  <div className="auth-divider">
                    <span>or continue with</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      clearMessages()
                      setNotice(
                        'Google sign-in activates once the ORCA identity service is connected. Use your mobile number or email for now.',
                      )
                    }}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                </>
              ) : null}
            </div>

            <footer className="auth-card-foot">
              {view === 'signin' ? (
                <p>
                  New to ORCA?{' '}
                  <button type="button" className="link-btn" onClick={() => goTo('register')}>
                    Create an account
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{' '}
                  <button type="button" className="link-btn" onClick={() => goTo('signin')}>
                    Sign in
                  </button>
                </p>
              )}
            </footer>
          </section>
        </main>
      </div>
    </div>
  )
}

type FieldProps = {
  id: string
  label: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric'
  prefix?: string
  trailing?: ReactNode
  hint?: string
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  prefix,
  trailing,
  hint,
}: FieldProps) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input">
        <span className="auth-input-icon">{icon}</span>
        {prefix ? <span className="auth-input-prefix">{prefix}</span> : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          spellCheck={false}
        />
        {trailing}
      </div>
      {hint ? <p className="auth-hint">{hint}</p> : null}
    </div>
  )
}

function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="auth-reveal"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function PasswordMeter({ password }: { password: string }) {
  if (!password) return null
  const { score, label } = checkPassword(password)
  return (
    <div className="auth-meter" data-score={score}>
      <div className="auth-meter-track">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={index < score ? 'is-on' : ''} />
        ))}
      </div>
      <span className="auth-meter-label">{label}</span>
    </div>
  )
}

function cardCopy(
  view: View,
  registerStep: RegisterStep,
  forgotStep: ForgotStep,
  channel: 'sms' | 'email',
  target: string,
) {
  if (view === 'signin') {
    return {
      title: 'Welcome back',
      subtitle: 'Sign in to continue your ORCA workspace',
      cta: 'Sign In',
    }
  }

  if (view === 'register') {
    if (registerStep === 'details') {
      return {
        title: 'Create your account',
        subtitle: 'Register once — ORCA adapts intelligence to your role.',
        cta: 'Continue',
      }
    }
    if (registerStep === 'verify') {
      return {
        title: channel === 'sms' ? 'Verify your number' : 'Verify your email',
        subtitle: `Enter the ${OTP_LENGTH}-digit code sent to ${target}`,
        cta: 'Verify code',
      }
    }
    return {
      title: 'Secure your account',
      subtitle: 'Choose a password you will use to sign in',
      cta: 'Create account',
    }
  }

  if (forgotStep === 'identify') {
    return {
      title: 'Forgot password',
      subtitle: 'We will send a verification code to your registered contact',
      cta: 'Send code',
    }
  }
  if (forgotStep === 'verify') {
    return {
      title: 'Confirm it is you',
      subtitle: `Enter the ${OTP_LENGTH}-digit code sent to ${target}`,
      cta: 'Verify code',
    }
  }
  return {
    title: 'Set a new password',
    subtitle: 'Then sign in with your updated credentials',
    cta: 'Update password',
  }
}

function wait(ms = 420) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
