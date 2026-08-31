from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.auth.routes import router as auth_router
from app.chat.routes import router as chat_router
from app.config import settings
from app.db import init_db
from app.location.routes import router as location_router
from app.marine.routes import router as marine_router
from app.users.routes import router as users_router
from app.weather.routes import router as weather_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ORCA Marine Intelligence API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(chat_router, prefix="/api/chat")
app.include_router(users_router, prefix="/api/users")
app.include_router(location_router, prefix="/api/location")
app.include_router(marine_router, prefix="/api/marine")
app.include_router(weather_router, prefix="/api/weather")
