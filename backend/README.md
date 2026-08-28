# ORCA Marine Intelligence API

Initial FastAPI backend with SQLite, user registration/login, vessel registry, location tracking, and live Open-Meteo weather by coordinates or saved location. OTP, email delivery, SMS, and Google OAuth are not implemented yet.

## Run locally

From the `backend/` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Copy `.env.example` to `.env` if you want to override defaults:

```bash
cp .env.example .env
```

## Endpoints

Once the server is running:

- Health: http://127.0.0.1:8000/api/health
- Database check: http://127.0.0.1:8000/api/users/test-db
- Register: POST http://127.0.0.1:8000/api/auth/register
- Login: POST http://127.0.0.1:8000/api/auth/login
- Add location: POST http://127.0.0.1:8000/api/location/
- List locations: GET http://127.0.0.1:8000/api/location/
- Get location: GET http://127.0.0.1:8000/api/location/{location_id}
- Delete location: DELETE http://127.0.0.1:8000/api/location/{location_id}
- Add vessel: POST http://127.0.0.1:8000/api/marine/
- List vessels: GET http://127.0.0.1:8000/api/marine/
- Get vessel: GET http://127.0.0.1:8000/api/marine/{vessel_id}
- Delete vessel: DELETE http://127.0.0.1:8000/api/marine/{vessel_id}
- Weather by coordinates: GET http://127.0.0.1:8000/api/weather?latitude=18.9388&longitude=72.8354
- Weather by saved location: GET http://127.0.0.1:8000/api/weather/location/{location_id}
- Docs: http://127.0.0.1:8000/docs

The development SQLite file is `backend/orca.db` and is gitignored.
