import { API_BASE } from '../api/config'

export type AuthUser = {
  id: number
  full_name: string
  email: string | null
  phone_number: string | null
  is_verified: boolean
}

type AuthSuccess = {
  status: string
  user: AuthUser
}

export class AuthApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

export type RegisterPayload = {
  full_name: string
  email?: string
  phone_number?: string
  password: string
}

function detailMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object') {
    const first = detail[0] as { msg?: unknown }
    if (typeof first.msg === 'string') return first.msg
  }
  return ''
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function login(identifier: string, password: string): Promise<AuthUser> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
  } catch {
    throw new AuthApiError('Unable to reach ORCA. Make sure the backend is running.', 0)
  }

  if (response.status === 401) {
    throw new AuthApiError('Invalid email/phone or password.', 401)
  }
  if (!response.ok) {
    const message = detailMessage(await readBody(response)) || 'Sign in failed. Please try again.'
    throw new AuthApiError(message, response.status)
  }

  const data = (await response.json()) as AuthSuccess
  return data.user
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const body: Record<string, string> = {
    full_name: payload.full_name,
    password: payload.password,
  }
  if (payload.email) body.email = payload.email
  if (payload.phone_number) body.phone_number = payload.phone_number

  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthApiError('Unable to reach ORCA. Make sure the backend is running.', 0)
  }

  if (response.status === 409) {
    const detail = detailMessage(await readBody(response)).toLowerCase()
    if (detail.includes('email')) {
      throw new AuthApiError('This email address is already registered. Sign in instead.', 409)
    }
    if (detail.includes('phone')) {
      throw new AuthApiError('This mobile number is already registered. Sign in instead.', 409)
    }
    throw new AuthApiError('This account is already registered. Sign in instead.', 409)
  }
  if (!response.ok) {
    const message = detailMessage(await readBody(response)) || 'Registration failed. Please try again.'
    throw new AuthApiError(message, response.status)
  }

  const data = (await response.json()) as AuthSuccess
  return data.user
}
