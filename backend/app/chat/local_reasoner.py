from __future__ import annotations

import re

from app.chat.schemas import ChatRequest, ChatResponse, ChatTurn, HazardAdvice, MarineSnapshot

_FOLLOW_UP = re.compile(
    r"\b(what about|how about|and (the )?(wind|waves?|saturday|sunday|tomorrow|today|"
    r"morning|evening|time|sst|temperature)|what time|the wind|this weekend)\b",
    re.I,
)


def answer_locally(request: ChatRequest) -> ChatResponse:
    question = request.question.strip()
    intent = classify_intent(question, request.history)
    marine = request.marine
    live = bool(marine and marine.weather_available)
    where = _where(marine)

    if intent == "pollution":
        return _knowledge(
            question,
            "Plastic, runoff and oil are the main drivers",
            "Ocean pollution is mainly caused by plastic waste, oil spills, sewage, agricultural runoff, and industrial chemicals. These pollutants reduce water quality and harm marine animals and habitats.",
            [
                "Land-based waste and rivers carry most plastic into the sea.",
                "Nutrient runoff can trigger harmful algal blooms and dead zones.",
                "Oil and chemical spills damage coasts, fisheries and wildlife.",
                "Reducing waste at source is more effective than cleanup alone.",
            ],
        )

    if intent == "fish_decline":
        return _knowledge(
            question,
            "Overfishing, habitat loss and warming seas",
            "Fish populations decline mainly because of overfishing, bycatch, habitat destruction, pollution, and climate-driven changes in temperature and oxygen. These pressures often act together.",
            [
                "Unsustainable catch removes adults faster than stocks can rebuild.",
                "Destroyed reefs, mangroves and seagrass remove nursery habitat.",
                "Warming and deoxygenation shift or shrink suitable ranges.",
                "Illegal and unreported fishing makes recovery harder to manage.",
            ],
        )

    if intent == "climate":
        return _knowledge(
            question,
            "Warming, acidification and habitat stress",
            "Climate change warms the ocean, raises sea level, and absorbs extra carbon dioxide, which acidifies seawater. Together these shifts stress coral, alter fish distributions, and increase extreme marine weather.",
            [
                "Warmer water can bleach coral and reduce oxygen.",
                "Many fish move poleward or into deeper, cooler water.",
                "Acidification weakens shells and reef-building organisms.",
                "Stronger storms and marine heatwaves raise safety and food-security risk.",
            ],
        )

    if intent == "sst":
        return _sst(question, marine, live, where)

    if intent == "zones":
        return _zones(question, marine, live, where)

    if intent == "danger":
        return _danger(question, marine, live, where)

    if intent == "weather":
        return _weather(question, marine, live, where)

    if intent == "fishing":
        return _fishing(question, marine, live, where)

    if intent == "wind_follow":
        return _wind_follow(question, marine, live, where)

    if intent == "time_follow":
        return _time_follow(question, marine, live, where)

    return _knowledge(
        question,
        "ORCA can help with that marine question",
        _generic_answer(question, marine, live, where),
        _generic_bullets(question),
        kind="knowledge",
        show_conditions=live and _asks_for_numbers(question),
        used_live_data=live and _asks_for_numbers(question),
        data_note=_data_note(marine, live) if live and _asks_for_numbers(question) else None,
    )


def classify_intent(question: str, history: list[ChatTurn]) -> str:
    q = question.lower()
    previous = _previous_user(history)
    follow = bool(_FOLLOW_UP.search(q)) or (len(q.split()) <= 6 and previous)

    if follow and previous:
        prior = classify_intent(previous, [])
        if any(word in q for word in ("wind", "breeze", "gust")):
            return "wind_follow"
        if any(word in q for word in ("time", "when", "morning", "hour")):
            return "time_follow"
        if any(word in q for word in ("saturday", "sunday", "weekend", "tomorrow")):
            return prior if prior != "general" else "fishing"
        return prior

    if any(word in q for word in ("pollution", "pollute", "plastic", "oil spill", "sewage", "runoff")):
        return "pollution"
    if any(word in q for word in ("population declining", "fish declining", "overfishing", "stocks falling")) or (
        "fish" in q and any(word in q for word in ("declin", "disappear", "fewer", "why are"))
    ):
        return "fish_decline"
    if "climate" in q or "global warming" in q or "ocean acidif" in q:
        return "climate"
    if "sea surface temperature" in q or re.search(r"\bsst\b", q) or (
        "temperature" in q and any(word in q for word in ("sea", "ocean", "surface", "water"))
    ):
        return "sst"
    if any(word in q for word in ("fishing zone", "best fishing", "where are the fish", "pfz", "near me")):
        return "zones"
    if any(word in q for word in ("dangerous", "unsafe", "hazard", "rough sea", "storm")) and any(
        word in q for word in ("sea", "ocean", "fisherman", "fishing", "boat", "craft")
    ):
        return "danger"
    if any(word in q for word in ("go fishing", "can i go", "should i go", "safe to go", "put to sea", "go to sea")):
        return "fishing"
    if any(word in q for word in ("weather", "forecast", "wind", "wave", "swell", "tomorrow", "weekend")) and any(
        word in q for word in ("sea", "marine", "ocean", "fishing", "coast", "harbour", "harbor")
    ):
        return "weather"
    if any(word in q for word in ("weather", "wind", "wave", "forecast")):
        return "weather"
    if "fish" in q or "sea" in q or "ocean" in q or "marine" in q:
        return "general"
    return "general"


def _previous_user(history: list[ChatTurn]) -> str | None:
    for turn in reversed(history):
        if turn.role == "user":
            return turn.content
    return None


def _where(marine: MarineSnapshot | None) -> str:
    if marine and marine.place_label:
        return f" near {marine.place_label}"
    return ""


def _data_note(marine: MarineSnapshot | None, live: bool) -> str | None:
    if live and marine and marine.place_label:
        return f"Live weather for {marine.place_label}."
    if live:
        return "Live weather from the current location feed."
    return "Local weather is unavailable, so no live numbers are used."


def _fmt(value: float | None, unit: str, digits: int = 0) -> str | None:
    if value is None:
        return None
    if digits == 0:
        return f"{round(value)} {unit}"
    return f"{round(value, digits)} {unit}"


def _assess(marine: MarineSnapshot | None) -> tuple[str, str]:
    if not marine or not marine.weather_available:
        return "caution", "ORCA does not have live local weather yet."
    wind = marine.wind_kmh
    waves = marine.wave_height_m
    severe = (wind is not None and wind >= 40) or (waves is not None and waves >= 2.5)
    lively = (wind is not None and wind >= 28) or (waves is not None and waves >= 1.8)
    sky = (marine.condition or "").lower()
    if "thunder" in sky:
        severe = True
    if severe:
        return "no", "Wind, waves or storm signals look unsafe for small craft."
    if lively or "rain" in sky:
        return "caution", "Conditions are usable with care, but they may worsen."
    return "yes", "Seas look generally workable in the current weather feed."


def _knowledge(
    question: str,
    headline: str,
    answer: str,
    bullets: list[str],
    *,
    kind: str = "knowledge",
    show_conditions: bool = False,
    used_live_data: bool = False,
    data_note: str | None = None,
) -> ChatResponse:
    return ChatResponse(
        question=question,
        headline=headline,
        answer=answer,
        bullets=bullets,
        kind=kind,  # type: ignore[arg-type]
        show_conditions=show_conditions,
        used_live_data=used_live_data,
        data_note=data_note,
        provider="local",
    )


def _sst(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    sst = _fmt(marine.sea_surface_c if marine else None, "°C", 1)
    if live and sst:
        answer = (
            f"Sea surface temperature (SST) is the temperature of the top layer of the ocean. "
            f"The latest reading{where} is {sst}."
        )
        note = _data_note(marine, True)
        used = True
    elif live:
        answer = (
            "Sea surface temperature (SST) is the temperature of the ocean's top layer. "
            "A live SST reading is not in the current marine feed for this location."
        )
        note = "Weather is available, but sea-surface temperature was not returned."
        used = False
    else:
        answer = (
            "Sea surface temperature (SST) is the temperature of the ocean's top layer. "
            "It affects marine life, weather, and fishing conditions. Allow location so ORCA can show the live value."
        )
        note = _data_note(marine, False)
        used = False
    return ChatResponse(
        question=question,
        headline="Sea surface temperature",
        answer=answer,
        bullets=[
            "SST is measured at the surface, not at fishing depth.",
            "Warmer SST can stratify the water column and change where fish feed.",
            "Cooler, well-mixed water is often linked with higher productivity.",
        ],
        kind="conditions",
        show_conditions=True,
        used_live_data=used,
        data_note=note,
        provider="local",
    )


def _zones(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    verdict, reason = _assess(marine)
    zone = (
        f"Stay within about 18 km of shore{where}" if where else "Stay within about 18 km of shore"
    )
    if verdict == "no":
        zone = "No recommended fishing zone while this risk remains"
    answer = (
        f"The best nearby fishing water depends on safety and local sea state{where}. {reason} "
        "The map zones are prototype decision aids, not live satellite PFZ."
    )
    return ChatResponse(
        question=question,
        headline="Nearshore water is the practical starting point",
        answer=answer,
        bullets=[
            "Use live wind and wave state before steaming farther offshore.",
            "Map fishing-potential layers in this app are sample data.",
            "Stay clear of restricted or protected boxes shown on the decision map.",
        ],
        kind="decision",
        verdict=verdict,  # type: ignore[arg-type]
        show_conditions=True,
        show_actions=True,
        show_map=True,
        show_potential=True,
        time_window="05:30 AM – 10:30 AM" if verdict == "yes" else "Stay close and review later",
        zone=zone,
        route="Low-risk nearshore route" if verdict != "no" else "Do not put to sea",
        avoid="Do not push farther offshore after late morning",
        potential="High" if verdict == "yes" else "Moderate" if verdict == "caution" else "Low",
        potential_reason="Estimated from local wind and sea state — not a guarantee of where fish are.",
        used_live_data=live,
        data_note=_data_note(marine, live),
        provider="local",
    )


def _danger(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    verdict, reason = _assess(marine)
    answer = (
        f"Dangerous sea conditions for fishermen include high wind, steep waves, poor visibility, "
        f"thunderstorms, and strong current at harbour mouths{where}. {reason}"
    )
    return ChatResponse(
        question=question,
        headline="High wind, steep seas and storms are the main risks",
        answer=answer,
        bullets=[
            "Treat roughly 40 km/h wind or 2.5 m waves as a stay-ashore signal for small craft.",
            "Thunderstorms and lightning over the sea are a no-go.",
            "If visibility drops or the barometer falls quickly, return early.",
            "Do not run bar crossings on a falling tide in a rising swell.",
        ],
        kind="conditions",
        verdict=verdict,  # type: ignore[arg-type]
        show_conditions=True,
        show_actions=verdict != "yes",
        hazard=HazardAdvice(
            title="Unsafe sea conditions" if verdict == "no" else "Watch the sea state",
            action="Remain in harbour until the feed improves."
            if verdict == "no"
            else "Keep a short leash from harbour and recheck ORCA before going farther.",
        )
        if verdict != "yes"
        else None,
        used_live_data=live,
        data_note=_data_note(marine, live),
        provider="local",
    )


def _weather(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    if not live or not marine:
        return ChatResponse(
            question=question,
            headline="Local marine weather is not available yet",
            answer="ORCA needs your location to read live wind, waves and sky conditions. Allow location, then ask again.",
            bullets=["Wind, waves and SST are not invented when the feed is missing."],
            kind="conditions",
            show_conditions=True,
            used_live_data=False,
            data_note=_data_note(marine, False),
            provider="local",
        )
    bits = []
    if marine.condition:
        bits.append(f"{marine.condition} skies")
    if marine.wind_kmh is not None:
        bits.append(f"wind around {round(marine.wind_kmh)} km/h")
    if marine.wave_height_m is not None:
        bits.append(f"waves near {marine.wave_height_m} m")
    if marine.sea_surface_c is not None:
        bits.append(f"sea surface about {marine.sea_surface_c}°C")
    summary = ", ".join(bits) if bits else "limited observations"
    return ChatResponse(
        question=question,
        headline=f"Current marine weather{where}",
        answer=f"The live feed{where} shows {summary}. Use this as a nowcast, not a multi-day guarantee.",
        bullets=[
            item
            for item in [
                f"Sky: {marine.condition}" if marine.condition else None,
                f"Wind: {round(marine.wind_kmh)} km/h" if marine.wind_kmh is not None else "Wind: unavailable",
                f"Waves: {marine.wave_height_m} m" if marine.wave_height_m is not None else "Waves: unavailable",
            ]
            if item
        ],
        kind="conditions",
        show_conditions=True,
        used_live_data=True,
        data_note=_data_note(marine, True),
        provider="local",
    )


def _fishing(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    verdict, reason = _assess(marine)
    qlow = question.lower()
    when = "tomorrow" if "tomorrow" in qlow else "this period"
    if verdict == "yes":
        headline = f"Yes - conditions look favourable {when}"
        answer = f"You can plan a trip{where}. {reason} Keep the outing nearshore and recheck before you leave."
        time_window = "05:30 AM – 10:30 AM"
        zone = f"Stay within about 18 km of shore{where}"
        route = "Low-risk nearshore route"
        avoid = "Do not push farther offshore after late morning"
        hazard = None
    elif verdict == "no":
        headline = f"No - not recommended {when}"
        answer = f"Going to sea is not recommended{where}. {reason}"
        time_window = "Stay ashore until conditions ease"
        zone = "No recommended fishing zone while this risk remains"
        route = "Do not put to sea"
        avoid = "Harbour mouth and open water until the weather feed improves"
        hazard = HazardAdvice(
            title="Unsafe sea conditions",
            action="Remain in harbour. Recheck with ORCA before leaving.",
        )
    else:
        headline = f"Caution - keep the trip short {when}"
        answer = (
            f"A short trip{where} may be possible, but conditions may worsen. {reason} "
            "Stay close to shore and watch the sky."
        )
        time_window = "05:30 AM – 09:00 AM, then review"
        zone = "Stay close to shore"
        route = "Short, low-risk loop — return early"
        avoid = "Northern offshore water after 11:00 AM"
        hazard = HazardAdvice(
            title="Conditions may worsen later in the day",
            action="Consider returning before late morning.",
        )
    return ChatResponse(
        question=question,
        headline=headline,
        answer=answer,
        bullets=[
            _sky_bullet(marine),
            _wind_bullet(marine),
            _wave_bullet(marine),
            "This is decision support from the weather feed, not a guarantee of catch.",
        ],
        kind="decision",
        verdict=verdict,  # type: ignore[arg-type]
        show_conditions=True,
        show_actions=True,
        show_map=True,
        show_potential=True,
        time_window=time_window,
        zone=zone,
        route=route,
        avoid=avoid,
        potential="High" if verdict == "yes" else "Moderate" if verdict == "caution" else "Low",
        potential_reason="Estimated from local wind, sea state and sky - not a guarantee of where fish are.",
        hazard=hazard,
        used_live_data=live,
        data_note=_data_note(marine, live),
        provider="local",
    )


def _wind_follow(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    if live and marine and marine.wind_kmh is not None:
        wind = round(marine.wind_kmh)
        if wind >= 40:
            answer = f"Wind{where} is about {wind} km/h — too strong for small-craft fishing."
        elif wind >= 28:
            answer = f"Wind{where} is about {wind} km/h. Manageable for a short trip, but it will feel lively."
        else:
            answer = f"Wind{where} is about {wind} km/h, which is generally workable for a nearshore trip."
        used = True
    else:
        answer = "A live wind reading is not available right now, so ORCA will not invent a speed."
        used = False
    return ChatResponse(
        question=question,
        headline="Wind for the trip you asked about",
        answer=answer,
        bullets=[
            "Small craft should treat ~40 km/h as a stay-ashore threshold.",
            "Wind against tide steepens waves near harbour mouths.",
        ],
        kind="conditions",
        show_conditions=True,
        used_live_data=used,
        data_note=_data_note(marine, live),
        provider="local",
    )


def _time_follow(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> ChatResponse:
    verdict, reason = _assess(marine)
    if verdict == "no":
        answer = f"There is no good departure window{where} while this risk remains. {reason}"
        window = "Stay ashore until conditions ease"
    elif verdict == "caution":
        answer = f"If you go{where}, the safer window is early: leave around dawn and be back by late morning. {reason}"
        window = "05:30 AM – 09:00 AM, then review"
    else:
        answer = f"The more comfortable window{where} is early morning, before the sea breeze builds. {reason}"
        window = "05:30 AM – 10:30 AM"
    return ChatResponse(
        question=question,
        headline="Best time window",
        answer=answer,
        bullets=["Dawn departures usually offer lighter wind and better visibility.", "Recheck ORCA immediately before you leave."],
        kind="decision",
        verdict=verdict,  # type: ignore[arg-type]
        show_conditions=True,
        show_actions=True,
        time_window=window,
        used_live_data=live,
        data_note=_data_note(marine, live),
        provider="local",
    )


def _sky_bullet(marine: MarineSnapshot | None) -> str:
    if marine and marine.condition:
        return f"{marine.condition} sky conditions"
    return "Sky conditions unavailable"


def _wind_bullet(marine: MarineSnapshot | None) -> str:
    if marine and marine.wind_kmh is not None:
        wind = round(marine.wind_kmh)
        label = "Manageable wind" if wind < 28 else "Stronger wind building" if wind < 40 else "High wind"
        return f"{label} ({wind} km/h)"
    return "Wind unavailable"


def _wave_bullet(marine: MarineSnapshot | None) -> str:
    if marine and marine.wave_height_m is not None:
        waves = marine.wave_height_m
        label = "Moderate wave conditions" if waves < 1.8 else "Choppy sea state" if waves < 2.5 else "Rough sea state"
        return f"{label} ({waves} m)"
    return "Wave height unavailable"


def _asks_for_numbers(question: str) -> bool:
    q = question.lower()
    return any(word in q for word in ("now", "today", "current", "live", "near me", "temperature", "wind", "wave"))


def _generic_answer(question: str, marine: MarineSnapshot | None, live: bool, where: str) -> str:
    return (
        f"ORCA can help with ocean, fishing, weather and marine-safety questions. "
        f"For “{question.strip()}”, share a bit more if you want a local go/no-go call"
        f"{' using live conditions' + where if live else ''}. "
        "You can ask about fishing, sea state, pollution, marine life or climate impacts."
    )


def _generic_bullets(question: str) -> list[str]:
    return [
        "Ask about fishing safety, weather, SST, zones, pollution or marine life.",
        "Follow-ups like “what about the wind?” stay in this conversation.",
        f"Your question was: {question.strip()}",
    ]
