# Data Model: Application Compose Deployment

No application data model changes. This describes deployment entities from the spec.

## Services

| Service | Image source | Host port | Health check | Depends on |
|---------|--------------|-----------|--------------|------------|
| `frontend` | `./frontend` (Dockerfile) | `3000` | Node request to `http://127.0.0.1:3000/` | none |
| `backend` | `./backend` (Dockerfile) | `8000` | Python request to `http://127.0.0.1:8000/test` | `redis` (`service_healthy`) |
| `redis` | `redis:7-alpine` | not published | `redis-cli ping` | none |

All services use `restart: unless-stopped` and join `carta-network`.

## Configuration

| Name | Scope | Source | Timing |
|------|-------|--------|--------|
| `NEXT_PUBLIC_API_URL` | Public | Root `.env` (build arg) | Build time |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Root `.env` (build arg) | Build time |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | Public | Root `.env` (build arg) | Build time |
| `CLERK_SECRET_KEY` | Secret | Root `.env` (`env_file`) | Runtime |
| `DATABASE_URL`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `FRONTEND_ORIGIN`, `OPENAI_*`, `VOICE_*` | Backend | `backend/.env` (`env_file`) | Runtime |
| `REDIS_URL` | Backend | Compose `environment` (`redis://redis:6379/0`) | Runtime |

## Volumes

| Volume | Status |
|--------|--------|
| `redis-data` | Kept; mounted at `/data` in `redis` |
| `postgres-data` | Declaration removed; existing volume not deleted |
