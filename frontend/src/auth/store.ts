import type { ProfessionId } from './professions'

export type StoredUser = {
  id: string
  name: string
  phone: string
  email?: string
  profession: ProfessionId
  salt: string
  passwordHash: string
  createdAt: string
}

export type Session = {
  userId: string
  name: string
  phone: string
  email?: string
  profession: ProfessionId
  signedInAt: string
}

export type NewUser = {
  name: string
  phone: string
  email?: string
  profession: ProfessionId
  password: string
}

const USERS_KEY = 'orca.users.v1'
const SESSION_KEY = 'orca.session.v1'
const REMEMBER_KEY = 'orca.remember.v1'
const PROFESSION_KEY = 'orca.profession.v1'

const PROFESSION_IDS: ProfessionId[] = [
  'fisherman',
  'researcher',
  'coastal-authority',
  'disaster-agency',
  'maritime-operator',
]

export type AuthAccount = {
  id: number
  full_name: string
  email: string | null
  phone_number: string | null
}

function randomId() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Demo-only digest. Real deployments must hash server side with a slow KDF;
 * this only keeps plaintext passwords out of localStorage during the prototype.
 */
function weakDigest(input: string) {
  let a = 0x811c9dc5
  let b = 0x1000193
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    a = ((a ^ code) * 0x01000193) >>> 0
    b = (b + code * (index + 7)) >>> 0
  }
  return `w${a.toString(16)}${b.toString(16)}`
}

async function digest(input: string) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return weakDigest(input)
  try {
    const buffer = await subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return weakDigest(input)
  }
}

function hashPassword(password: string, salt: string) {
  return digest(`orca:${salt}:${password}`)
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(-10)
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function listUsers(): StoredUser[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (user): user is StoredUser =>
        Boolean(user) &&
        typeof (user as StoredUser).phone === 'string' &&
        typeof (user as StoredUser).passwordHash === 'string',
    )
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function findByPhone(phone: string) {
  const digits = normalizePhone(phone)
  if (!digits) return undefined
  return listUsers().find((user) => user.phone === digits)
}

export function findByEmail(email: string) {
  const address = normalizeEmail(email)
  if (!address) return undefined
  return listUsers().find((user) => user.email === address)
}

/** Accepts a 10-digit mobile number or an email address. */
export function findByIdentifier(identifier: string) {
  const value = identifier.trim()
  if (!value) return undefined
  return value.includes('@') ? findByEmail(value) : findByPhone(value)
}

export async function createUser(input: NewUser): Promise<StoredUser> {
  const salt = randomId()
  const user: StoredUser = {
    id: randomId(),
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
    email: input.email ? normalizeEmail(input.email) : undefined,
    profession: input.profession,
    salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  }
  writeUsers([...listUsers().filter((existing) => existing.phone !== user.phone), user])
  return user
}

export async function verifyPassword(user: StoredUser, password: string) {
  return (await hashPassword(password, user.salt)) === user.passwordHash
}

export async function resetPassword(userId: string, password: string) {
  const users = listUsers()
  const user = users.find((item) => item.id === userId)
  if (!user) return false
  const salt = randomId()
  user.salt = salt
  user.passwordHash = await hashPassword(password, salt)
  writeUsers(users)
  return true
}

export function toSession(user: StoredUser): Session {
  return {
    userId: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    profession: user.profession,
    signedInAt: new Date().toISOString(),
  }
}

export function toSessionFromAccount(user: AuthAccount, profession: ProfessionId): Session {
  return {
    userId: String(user.id),
    name: user.full_name,
    phone: user.phone_number || '',
    email: user.email || undefined,
    profession,
    signedInAt: new Date().toISOString(),
  }
}

function isProfessionId(value: unknown): value is ProfessionId {
  return typeof value === 'string' && PROFESSION_IDS.includes(value as ProfessionId)
}

export function rememberProfession(userId: string, profession: ProfessionId) {
  try {
    const raw = localStorage.getItem(PROFESSION_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, ProfessionId>) : {}
    map[userId] = profession
    localStorage.setItem(PROFESSION_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota / private-mode failures */
  }
}

export function readProfession(userId: string): ProfessionId | undefined {
  try {
    const raw = localStorage.getItem(PROFESSION_KEY)
    if (!raw) return undefined
    const map = JSON.parse(raw) as Record<string, ProfessionId>
    return isProfessionId(map[userId]) ? map[userId] : undefined
  } catch {
    return undefined
  }
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed?.userId !== 'string' || typeof parsed?.name !== 'string') return null
    if (!isProfessionId(parsed.profession)) return null
    return parsed as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session, remember: boolean) {
  const payload = JSON.stringify(session)
  if (remember) {
    localStorage.setItem(SESSION_KEY, payload)
    localStorage.setItem(REMEMBER_KEY, session.email || session.phone)
    sessionStorage.removeItem(SESSION_KEY)
  } else {
    sessionStorage.setItem(SESSION_KEY, payload)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export function readRememberedIdentifier() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

export function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain) return email
  const head = name.slice(0, 2)
  return `${head}${'•'.repeat(Math.max(name.length - 2, 2))}@${domain}`
}

export function maskPhone(phone: string) {
  const digits = normalizePhone(phone)
  if (digits.length < 10) return digits
  return `+91 ${digits.slice(0, 2)}••• ••${digits.slice(8)}`
}

export function formatPhone(phone: string) {
  const digits = normalizePhone(phone)
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits
}
