# Research: Application Compose Deployment

No NEEDS CLARIFICATION items remained after inspection. Findings:

- **Frontend image**: `frontend/Dockerfile` builds Next.js with `output: "standalone"` (`frontend/next.config.ts:4`). It takes `NEXT_PUBLIC_*` as build args and requires `CLERK_SECRET_KEY` at runtime. Decision: reuse unchanged. Rationale: already matches the containerization plan (014). Alternative rejected: `next start` with full `node_modules`, which is larger.
- **Backend image**: `backend/Dockerfile` runs `uvicorn main:app` on port 8000 as a non-root user. `backend/.dockerignore` excludes `.env*`. Decision: reuse unchanged.
- **Redis config**: `backend/core/config.py` reads `REDIS_URL` (default `redis://localhost:6379/0`), so the compose service must override it. Decision: set `REDIS_URL` in compose `environment`.
- **Browser origin**: `backend/main.py` sets CORS from `FRONTEND_ORIGIN`. Frontend calls `NEXT_PUBLIC_API_URL` in `frontend/lib/api.ts:10`, `frontend/lib/voice.ts:20` (WebSocket derived from it), and `frontend/app/(app)/ask/page.tsx:162`. Decision: browser-reachable URL as build arg; no service-name URLs.
- **Backend probe**: `backend/main.py` `GET /test` returns a static message without touching DB or Redis. Decision: use only as a process-responsiveness check.
- **Ignore rules**: root `.gitignore` ignores `.env*` except `.env.example`. Decision: root `.env.example` is tracked; no root `.dockerignore` because build contexts are per service.
- **Existing compose**: `docker-compose.yml` defines `redis` (publishes 6379, healthcheck, `redis-data`) and `postgres` (publishes 5432, `postgres-data`). Decision: remove `postgres` service, its port, and its volume declaration; keep `redis` and `redis-data`.
