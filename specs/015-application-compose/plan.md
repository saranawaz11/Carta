# Implementation Plan: Application Compose Deployment

**Branch**: `015-application-compose` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the root [docker-compose.yml](../../docker-compose.yml) to run frontend, backend, and Redis together, drop the unused local PostgreSQL service (Neon is the database), and add a names-only root `.env.example`. Reuse the existing `frontend/Dockerfile` and `backend/Dockerfile` unchanged. No application code changes.

## Technical Context

- **Language/runtime**: Compose Specification; Node 24 (frontend) and Python 3.11 (backend) from existing Dockerfiles.
- **Dependencies**: Docker Compose; `redis:7-alpine`; existing Next.js standalone and FastAPI/Uvicorn images. No new dependencies.
- **Storage**: Keep `redis-data` volume. Remove `postgres-data` declaration and service from the definition only; never delete it. Hosted Neon PostgreSQL via `DATABASE_URL`.
- **Validation**: Manual, via [quickstart.md](./quickstart.md).
- **Target**: Local Docker host (Linux containers) running production-built apps.
- **Constraints**: No business logic changes; no new orchestrator; no automatic data or volume deletion; no secrets in compose file, images, or build contexts; browser uses host-reachable URLs.

## Constitution Check

- **I. Note ownership**: No change. PASS.
- **II. LLM assistance**: No change; OpenAI key stays in backend runtime env only. PASS.
- **III. API and backend boundaries**: Browser still talks only to the backend; no new server-side flow. PASS.
- **IV. Data and schema**: No schema change; backend remains the only DB client; removing local PostgreSQL matches Neon. PASS.
- **V. Small, spec-driven changes**: Changes limited to `docker-compose.yml` and a root `.env.example`. PASS.
- **Technology stack**: Secrets come from env variables, never hardcoded. PASS.
- **Agent rules**: No test files or testing tasks; validation is in quickstart only. PASS.

## Decisions

- **Reuse both Dockerfiles unchanged**: They already provide standalone output, a non-root user, and runtime secret checks. Rejected rewriting them, which would widen scope.
- **Override `REDIS_URL` in compose as `redis://redis:6379/0`**: Compose `environment` overrides `env_file`. Rejected editing `backend/.env`, which is operator-owned and holds real values.
- **Backend `DATABASE_URL` from `backend/.env` (Neon)**: No local database service. Rejected keeping PostgreSQL as a fallback because the spec states Neon is used.
- **Build arg `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`**: Public values are inlined at build time, and browsers cannot resolve Compose service names. Rejected `http://backend:8000`.
- **`FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` stay in `backend/.env`**: They must match the browser origin for CORS and Clerk. Rejected hardcoding them in compose to keep config in one place.
- **Frontend runtime secret via `env_file: .env`**: Keeps `CLERK_SECRET_KEY` out of the compose file and image. Rejected `environment:` entries because `docker compose config` prints resolved values.
- **Root `.env` for interpolation; root `.env.example` lists names only**: The existing `.env*` ignore rule covers `.env`. Rejected a root `.dockerignore` because build contexts are `./frontend` and `./backend`, which already have their own.
- **Health checks**: Redis `redis-cli ping`; backend probes `/test` (process responsiveness only, not DB or Redis); frontend probes its own port 3000 via Node. Rejected plain `depends_on` because start order is not readiness.
- **`backend` waits for `redis` with `service_healthy`; `frontend` has no dependency**: Backend uses Redis at runtime; frontend only serves pages. Rejected a frontend-to-backend dependency because the frontend does not call the backend at startup.
- **`restart: unless-stopped` on all services**: Recovers from crashes and host restarts while respecting deliberate `docker compose stop`. Rejected `always`, which restarts deliberately stopped services after reboot.
- **Publish only frontend `3000` and backend `8000`; Redis not published**: Meets FR-006. Host Redis access is a documented, commented-out `ports` line. Rejected an extra override file.
- **Document `docker compose down` without `--remove-orphans`**: The removed `postgres` service leaves orphan container `carta-postgres`, which the flag would delete. Rejected automatic removal to honor the no-deletion rule.
- **Keep `redis-data` volume and `carta-network` bridge**: Preserves cache persistence (FR-003) and gives service-name DNS in both directions (FR-004).

## Project Structure

### Documentation (this feature)

```text
specs/015-application-compose/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (services and configuration)
├── quickstart.md        # Phase 1 output (validation guide)
├── contracts/
│   └── compose.md       # Phase 1 output (deployment interface)
└── checklists/          # Existing
```

### Source Code (repository root)

```text
docker-compose.yml       # Modified: frontend, backend, redis; postgres removed
.env.example             # New: names-only root example
README.md                # Modified: deployment section
frontend/Dockerfile      # Unchanged
backend/Dockerfile       # Unchanged
```

**Structure decision**: A single root `docker-compose.yml` orchestrates the existing `frontend/` and `backend/` build contexts. No new directories or tooling.

## Complexity Tracking

No constitution violations. The `quickstart.md` validation guide is required by the planning workflow; it is not a test suite.
