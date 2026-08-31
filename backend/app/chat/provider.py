from __future__ import annotations

import json
import re

import httpx

from app.config import settings

SYSTEM_PROMPT = """You are ORCA, a marine intelligence assistant for fishermen, researchers, and coastal users.
Answer ONLY the user's question. Be concise, clear, and useful. Do not write long essays.
Use 1 short headline, 1 short paragraph, and 2–4 bullets only when they help.

You will receive:
- The user's question
- Optional recent conversation turns (use them for follow-ups like "what about Saturday?" or "what about the wind?")
- Optional LIVE marine observations. If a live value is missing, say it is unavailable. NEVER invent live numbers.

Distinguish:
- General marine knowledge: answer from knowledge.
- Current/live conditions: use the provided observations only.
- Application/prototype map data: fishing-zone polygons and routes are SAMPLE decision aids, not live satellite PFZ. Say so if you mention them.

Return ONLY valid JSON with this shape:
{
  "headline": "short heading",
  "answer": "short paragraph that answers the question",
  "bullets": ["optional useful points"],
  "kind": "knowledge" | "conditions" | "decision",
  "verdict": "yes" | "caution" | "no" | null,
  "show_conditions": true/false,
  "show_actions": true/false,
  "show_map": true/false,
  "show_potential": true/false,
  "time_window": string or null,
  "zone": string or null,
  "route": string or null,
  "avoid": string or null,
  "potential": "High" | "Moderate" | "Low" | null,
  "potential_reason": string or null,
  "hazard": {"title": "...", "action": "..."} or null,
  "used_live_data": true/false,
  "data_note": string or null
}

Rules:
- kind=decision for go/no-go fishing or safety-at-sea questions. Then set verdict and show_conditions/show_actions true. Show map only if location/zones are relevant.
- kind=conditions for weather, SST, wind, waves. show_conditions true. Usually no full action grid unless asked.
- kind=knowledge for explanations (pollution, climate, fish decline, ocean science). show_conditions/show_actions/show_map/show_potential all false unless the user also asked for current numbers.
- Follow-ups inherit the previous topic.
"""


class ChatProviderError(Exception):
    def __init__(self, message: str, *, user_message: str | None = None) -> None:
        super().__init__(message)
        self.user_message = user_message or (
            "ORCA couldn't retrieve the latest marine information right now. Please try again."
        )


def llm_configured() -> bool:
    return bool(settings.ai_api_key)


def complete_json(messages: list[dict[str, str]]) -> dict:
    if not settings.ai_api_key:
        raise ChatProviderError(
            "ORCA_AI_API_KEY is not set",
            user_message="ORCA AI is not configured. Add ORCA_AI_API_KEY to backend/.env.",
        )

    url = f"{settings.ai_base_url}/chat/completions"
    payload: dict[str, object] = {
        "model": settings.ai_model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 700,
    }
    if "groq.com" in settings.ai_base_url or "openai.com" in settings.ai_base_url:
        payload["response_format"] = {"type": "json_object"}

    try:
        with httpx.Client(timeout=40.0) as client:
            response = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.ai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.TimeoutException as extra:
        raise ChatProviderError("LLM request timed out") from extra
    except httpx.HTTPError as extra:
        raise ChatProviderError("LLM request failed") from extra

    if response.status_code == 401:
        raise ChatProviderError(
            "LLM authentication failed",
            user_message="ORCA AI rejected the API key. Check ORCA_AI_API_KEY in backend/.env.",
        )
    if response.status_code >= 400:
        raise ChatProviderError(f"LLM HTTP {response.status_code}")

    try:
        body = response.json()
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as extra:
        raise ChatProviderError("LLM returned an invalid response") from extra

    return _parse_json_object(content)


def _parse_json_object(raw: str) -> dict:
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(text[start : end + 1])
        else:
            raise ChatProviderError("LLM did not return JSON")
    if not isinstance(data, dict):
        raise ChatProviderError("LLM JSON was not an object")
    return data
