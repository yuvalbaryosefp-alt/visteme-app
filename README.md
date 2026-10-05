# Vísteme API

Backend for **Vísteme**, an AI-powered personal fashion app: catalog your clothes by text or voice in Spanish, generate outfits for any occasion (weather-aware), get store recommendations, and try garments on with *virtual try-on*.

🌐 **Production:** [`visteme-api-production.up.railway.app`](https://visteme-api-production.up.railway.app) · **Interactive docs:** [`/docs`](https://visteme-api-production.up.railway.app/docs)
📱 **App (frontend):** [`visteme-app.vercel.app`](https://visteme-app.vercel.app)

---

## What it does

- **Voice & text cataloging** — describe your garments in natural Mexican Spanish ("una chamarra de mezclilla azul oversize") and the AI structures them (category, color, formality, suitable weather).
- **Outfit generator** — builds outfits for a specific occasion, combining color, formality, your city's real weather, and your taste.
- **Digital closet** — manage your garments (add, list, update, delete).
- **Personalized shop** — product recommendations that fill the gaps in your closet and match your style.
- **Virtual Try-On** — try any garment on your own photo using IDM-VTON.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (async) |
| Database | PostgreSQL + SQLAlchemy 2.0 (async) + Alembic |
| AI — cataloging / outfits | Claude API (Anthropic) |
| AI — speech to text | OpenAI Whisper |
| AI — virtual try-on | Replicate · IDM-VTON |
| Weather | OpenWeatherMap |
| Auth | JWT (PyJWT) + bcrypt |
| Deploy | Railway (auto-deploy from `main`) |
| Python | 3.12+ |

## Main endpoints

All under the `/v1` prefix.

| Group | Route | Description |
|-------|-------|-------------|
| Auth | `POST /auth/register`, `POST /auth/login` | Sign up and sign in (return JWT + user) |
| Catalog | `POST /catalog/text`, `POST /catalog/voice` | Catalog garments from text or audio |
| Onboarding | `POST /onboarding/vibe-check`, `POST /onboarding/body-profile` | Style preferences and measurements |
| Closet | `GET/POST/PATCH/DELETE /garments` | Garment CRUD |
| Outfits | `POST /outfits/generate`, `GET /outfits` | Generate and list outfits |
| Shop | `GET /shop/recommendations`, `POST /shop/products/{id}/click` | Recommendations and affiliate click tracking |
| Try-On | `POST /try-on`, `GET /try-on/{id}` | Async virtual try-on (start job + poll) |

> The full list with request/response schemas is at [`/docs`](https://visteme-api-production.up.railway.app/docs).

## Run locally

Requires Python 3.12+ and Docker (for PostgreSQL).

```bash
# 1. Clone and install
git clone https://github.com/yuvalbaryosefp-alt/visteme-api.git
cd visteme-api
pip install -e ".[dev]"

# 2. Configure environment variables
cp .env.example .env   # then fill in your keys (see below)

# 3. Start PostgreSQL
docker compose up -d

# 4. Run migrations
alembic upgrade head

# 5. Start the server
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` and the docs at `http://localhost:8000/docs`.

## Environment variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `DATABASE_URL` | ✅ | Async PostgreSQL connection (`postgresql+asyncpg://...`) |
| `ANTHROPIC_API_KEY` | ✅ | Claude API — cataloging and outfits |
| `OPENAI_API_KEY` | ✅ | Whisper — voice transcription |
| `OPENWEATHERMAP_API_KEY` | ✅ | Weather for outfit generation |
| `JWT_SECRET_KEY` | ✅ | Secret phrase used to sign JWTs |
| `JWT_ALGORITHM` | — | Defaults to `HS256` |
| `REPLICATE_API_KEY` | — | Virtual try-on. If empty, `/try-on` returns `503` |

## Tests

```bash
pytest
```

## Project structure

```
app/
├── api/v1/        # Routers by domain (auth, catalog, garments, outfits, shop, try_on…)
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas (request/response)
├── services/      # Business logic and integrations (Claude, Whisper, Replicate, weather)
├── seeds/         # Sample product catalog
├── config.py      # Settings from environment variables
├── database.py    # Async engine and session
└── main.py        # FastAPI app + middleware
migrations/        # Alembic migrations
tests/             # Test suite (pytest)
```

## Deploy

Connected to Railway with **auto-deploy**: every push to `main` triggers a new deployment. Environment variables are configured in the Railway dashboard.

---

_Vísteme project · backend._
