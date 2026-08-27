export const OTP_LENGTH = 6
export const RESEND_SECONDS = 30

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const PHONE_RE = /^[6-9]\d{9}$/

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim())
}

export function isValidPhone(value: string) {
  return PHONE_RE.test(value.replace(/\D/g, ''))
}

export function isValidName(value: string) {
  const name = value.trim()
  return name.length >= 2 && /^[a-z][a-z\s.'-]*$/i.test(name)
}

export type PasswordCheck = {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  problem: string | null
}

export function checkPassword(password: string): PasswordCheck {
  const rules = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = rules.filter(Boolean).length as PasswordCheck['score']

  let problem: string | null = null
  if (password.length < 8) problem = 'Use at least 8 characters.'
  else if (!/[A-Za-z]/.test(password)) problem = 'Add at least one letter.'
  else if (!/\d/.test(password)) problem = 'Add at least one number.'

  const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong'] as const
  return { score, label: labels[score], problem }
}

export function generateOtp() {
  const bytes = new Uint32Array(1)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    bytes[0] = Math.floor(Math.random() * 0xffffffff)
  }
  return String(100000 + (bytes[0] % 900000))
}
