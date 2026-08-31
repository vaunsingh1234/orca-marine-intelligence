from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "assistant"]
AnswerKind = Literal["knowledge", "conditions", "decision"]
Verdict = Literal["yes", "caution", "no"]
Potential = Literal["High", "Moderate", "Low"]


class ChatTurn(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=4000)


class MarineSnapshot(BaseModel):
    place_label: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    temperature_c: float | None = None
    condition: str | None = None
    wind_kmh: float | None = None
    wave_height_m: float | None = None
    sea_surface_c: float | None = None
    weather_available: bool = False


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)
    marine: MarineSnapshot | None = None


class HazardAdvice(BaseModel):
    title: str
    action: str


class ChatResponse(BaseModel):
    question: str
    headline: str
    answer: str
    bullets: list[str] = Field(default_factory=list)
    kind: AnswerKind = "knowledge"
    verdict: Verdict | None = None
    show_conditions: bool = False
    show_actions: bool = False
    show_map: bool = False
    show_potential: bool = False
    time_window: str | None = None
    zone: str | None = None
    route: str | None = None
    avoid: str | None = None
    potential: Potential | None = None
    potential_reason: str | None = None
    hazard: HazardAdvice | None = None
    used_live_data: bool = False
    data_note: str | None = None
    provider: str = "local"
