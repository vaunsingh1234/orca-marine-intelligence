from __future__ import annotations

from app.chat.local_reasoner import answer_locally
from app.chat.provider import SYSTEM_PROMPT, ChatProviderError, complete_json, llm_configured
from app.chat.schemas import ChatRequest, ChatResponse, HazardAdvice


def answer_question(request: ChatRequest) -> ChatResponse:
    if llm_configured():
        try:
            return _answer_with_llm(request)
        except ChatProviderError:
            raise
        except Exception as extra:
            raise ChatProviderError("LLM failed to produce an answer") from extra
    return answer_locally(request)


def _answer_with_llm(request: ChatRequest) -> ChatResponse:
    marine_lines = _marine_block(request)
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in request.history[-8:]:
        messages.append({"role": turn.role, "content": turn.content})
    user_block = f"User question:\n{request.question.strip()}\n\n{marine_lines}"
    messages.append({"role": "user", "content": user_block})
    raw = complete_json(messages)
    return _coerce_response(request.question.strip(), raw)


def _marine_block(request: ChatRequest) -> str:
    marine = request.marine
    if not marine or not marine.weather_available:
        return (
            "LIVE MARINE OBSERVATIONS: unavailable.\n"
            "Do not invent wind, wave, SST or temperature values.\n"
            "Fishing-zone polygons in the app are SAMPLE prototype data."
        )
    parts = ["LIVE MARINE OBSERVATIONS (use these; do not invent others):"]
    if marine.place_label:
        parts.append(f"- place: {marine.place_label}")
    if marine.latitude is not None and marine.longitude is not None:
        parts.append(f"- coordinates: {marine.latitude:.3f}, {marine.longitude:.3f}")
    if marine.condition:
        parts.append(f"- sky: {marine.condition}")
    if marine.temperature_c is not None:
        parts.append(f"- air temperature: {marine.temperature_c} C")
    if marine.wind_kmh is not None:
        parts.append(f"- wind: {marine.wind_kmh} km/h")
    else:
        parts.append("- wind: unavailable")
    if marine.wave_height_m is not None:
        parts.append(f"- wave height: {marine.wave_height_m} m")
    else:
        parts.append("- wave height: unavailable")
    if marine.sea_surface_c is not None:
        parts.append(f"- sea surface temperature: {marine.sea_surface_c} C")
    else:
        parts.append("- sea surface temperature: unavailable")
    parts.append("- fishing-zone polygons and routes in the app are SAMPLE prototype data, not live PFZ.")
    return "\n".join(parts)


def _coerce_response(question: str, raw: dict) -> ChatResponse:
    kind = raw.get("kind") if raw.get("kind") in {"knowledge", "conditions", "decision"} else "knowledge"
    verdict = raw.get("verdict") if raw.get("verdict") in {"yes", "caution", "no"} else None
    potential = raw.get("potential") if raw.get("potential") in {"High", "Moderate", "Low"} else None
    bullets = raw.get("bullets") if isinstance(raw.get("bullets"), list) else []
    clean_bullets = [str(item).strip() for item in bullets if str(item).strip()][:6]
    hazard = None
    if isinstance(raw.get("hazard"), dict):
        title = str(raw["hazard"].get("title") or "").strip()
        action = str(raw["hazard"].get("action") or "").strip()
        if title and action:
            hazard = HazardAdvice(title=title, action=action)

    headline = str(raw.get("headline") or "").strip() or "ORCA analysis"
    answer = str(raw.get("answer") or "").strip()
    if not answer:
        raise ChatProviderError("LLM returned an empty answer")

    return ChatResponse(
        question=question,
        headline=headline[:180],
        answer=answer[:1600],
        bullets=clean_bullets,
        kind=kind,
        verdict=verdict,
        show_conditions=bool(raw.get("show_conditions")),
        show_actions=bool(raw.get("show_actions")),
        show_map=bool(raw.get("show_map")),
        show_potential=bool(raw.get("show_potential")),
        time_window=_opt_str(raw.get("time_window")),
        zone=_opt_str(raw.get("zone")),
        route=_opt_str(raw.get("route")),
        avoid=_opt_str(raw.get("avoid")),
        potential=potential,
        potential_reason=_opt_str(raw.get("potential_reason")),
        hazard=hazard,
        used_live_data=bool(raw.get("used_live_data")),
        data_note=_opt_str(raw.get("data_note")),
        provider="llm",
    )


def _opt_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
