# Quickstart: Application Compose Validation

## Prerequisites

- Docker with Compose v2.
- Create root `.env` from [.env.example](../../.env.example) only if it does not already exist; replace placeholders with the correct Clerk settings.
- If `backend/.env` does not exist, create it from `backend/.env.example`; configure it with the Neon `DATABASE_URL`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `FRONTEND_ORIGIN=http://localhost:3000`, and `OPENAI_API_KEY`. Never overwrite an existing environment file.
- Clerk and OpenAI accounts for full end-to-end checks; mark those checks blocked if unavailable.

## Steps

1. Validate configuration (prints nothing secret):
   `docker compose config --quiet`
2. Build and start:
   `docker compose build` then `docker compose up -d`
3. Confirm status and health: `docker compose ps` (Redis, backend, and frontend should report `healthy`).
4. Open `http://localhost:3000` (home page loads) and `http://localhost:8000/test` (returns the test message).
5. Internal connectivity:
   - `docker compose exec frontend node -e "fetch('http://backend:8000/test').then(r=>console.log(r.status))"` → `200`
   - `docker compose exec backend python -c "import urllib.request as u;print(u.urlopen('http://frontend:3000/').status)"` → `200`
6. Browser connectivity: confirm `NEXT_PUBLIC_API_URL` is the browser-reachable backend URL (default `http://localhost:8000`), sign in, and load a backend-backed page. For voice, confirm the browser connects to the corresponding `/ws/transcribe` WebSocket URL (`ws://` for local HTTP, `wss://` for HTTPS). Blocked if Clerk, Neon, or required browser permissions are unavailable.
7. Cache: `docker compose exec redis redis-cli SET quickstart-check ok EX 600`, then `docker compose restart redis`, then `docker compose exec redis redis-cli GET quickstart-check` → `ok`.
8. Stop without losing data: `docker compose stop`, then `docker compose up -d`, then re-check step 7 (within expiry).
9. Rebuild one service after a source change: `docker compose up -d --build backend`.

## Expected Outcomes

- All three services report healthy.
- No `postgres` container is started; `postgres-data` is untouched.
- Redis is not published to the host; its data survives a normal stop/restart.
- Missing required settings fail or warn by name only, without printing values.

## Known Limits

- `/test` checks backend HTTP responsiveness only; the frontend health check checks its HTTP process and Redis health checks Redis itself. None establishes Neon, Clerk, or OpenAI readiness.
- Changing `NEXT_PUBLIC_API_URL` or Clerk public values requires `docker compose build frontend`. If host ports change, update the browser URL, `FRONTEND_ORIGIN`, and `CLERK_AUTHORIZED_PARTIES` to match.
- If an operator needs host access to Redis for local development, temporarily publish it on loopback only (for example `127.0.0.1:6379:6379`); do not expose it by default.
- Do not use `docker compose down --remove-orphans` or `docker compose down -v`: the former can remove the old `carta-postgres` container and the latter deletes named volumes.
