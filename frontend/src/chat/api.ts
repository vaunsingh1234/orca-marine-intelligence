import { API_BASE } from '../api/config'
import {
  ChatApiError,
  type ChatResponse,
  type ChatTurn,
  type MarineSnapshot,
} from './types'

export async function askOrca(
  question: string,
  history: ChatTurn[],
  marine: MarineSnapshot,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history, marine }),
      signal,
    })
  } catch {
    throw new ChatApiError(
      "ORCA couldn't retrieve the latest marine information right now. Please try again.",
    )
  }

  if (!response.ok) {
    const detail = await readDetail(response)
    throw new ChatApiError(detail)
  }

  try {
    return (await response.json()) as ChatResponse
  } catch {
    throw new ChatApiError('ORCA returned an unexpected response. Please try again.')
  }
}

async function readDetail(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: unknown }
    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail
  } catch {
    /* ignore */
  }
  if (response.status === 503) {
    return "ORCA couldn't retrieve the latest marine information right now. Please try again."
  }
  return "ORCA couldn't complete that analysis. Please try again."
}
