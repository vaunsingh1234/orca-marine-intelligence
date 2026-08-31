export type ChatRole = 'user' | 'assistant'

export type AnswerKind = 'knowledge' | 'conditions' | 'decision'

export type ChatTurn = {
  role: ChatRole
  content: string
}

export type MarineSnapshot = {
  place_label?: string | null
  latitude?: number | null
  longitude?: number | null
  temperature_c?: number | null
  condition?: string | null
  wind_kmh?: number | null
  wave_height_m?: number | null
  sea_surface_c?: number | null
  weather_available: boolean
}

export type ChatResponse = {
  question: string
  headline: string
  answer: string
  bullets: string[]
  kind: AnswerKind
  verdict: 'yes' | 'caution' | 'no' | null
  show_conditions: boolean
  show_actions: boolean
  show_map: boolean
  show_potential: boolean
  time_window: string | null
  zone: string | null
  route: string | null
  avoid: string | null
  potential: 'High' | 'Moderate' | 'Low' | null
  potential_reason: string | null
  hazard: { title: string; action: string } | null
  used_live_data: boolean
  data_note: string | null
  provider: string
}

export class ChatApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChatApiError'
  }
}
