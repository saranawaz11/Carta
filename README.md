## Local development

Run these commands from the repository root in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

The backend command starts FastAPI from `backend/`, where `main.py` and the
backend project dependencies are located. The frontend is available at
`http://localhost:3000` and proxies its API requests to the backend configured
in `frontend/.env.local`.

To run the commands directly instead:

```powershell
Set-Location .\backend
uv run fastapi dev
```

```powershell
Set-Location .\frontend
npm run dev
```

For the complete local, Amazon ECR, EC2, and SSH deployment process, see
[AWS_EC2_DEPLOYMENT.md](AWS_EC2_DEPLOYMENT.md).

## Application deployment with Docker Compose

The root `docker-compose.yml` runs the Next.js frontend, FastAPI backend, and Redis. The backend uses Neon through `DATABASE_URL`; no local PostgreSQL service is started. Frontend and backend are published on host ports 3000 and 8000, and Redis is available only on the internal `carta-network` by default.

### Configuration

Create root `.env` from `.env.example` and `backend/.env` from `backend/.env.example` only if each file does not already exist. Replace the Clerk placeholders and configure `backend/.env` for Neon, Clerk, CORS, and OpenAI. Never overwrite an existing environment file. The frontend `NEXT_PUBLIC_*` settings are image build arguments; changing them requires rebuilding the frontend. `CLERK_SECRET_KEY` is injected at runtime. Do not put secret values in the Compose file or Docker build arguments.

The browser must be able to resolve `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`); `backend` is only a container-network name. Set `FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` in `backend/.env` to the actual browser origin. For production, use externally reachable HTTPS addresses and protect both environment files.

### Validate and operate

Run from the repository root. The config check does not print resolved environment values:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
# Edit .env and backend/.env with valid settings before building or starting.
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f backend
docker compose stop
docker compose up -d --build backend
```

Use `docker compose logs -f frontend` or `docker compose logs -f redis` for the other services. `docker compose ps` reports health. Redis checks its ping response; the backend `/test` and frontend HTTP checks show process responsiveness only, not Neon, Clerk, or OpenAI readiness. Backend startup waits for Redis health. `unless-stopped` restarts services after unexpected exits or host restart, but respects an intentional stop.

If a host port is occupied, change the host side of the mapping (for example `8001:8000`) and update `NEXT_PUBLIC_API_URL` accordingly; changing the frontend host port also requires matching `FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES`. Rebuild after changing public frontend values. For local-only Redis access, temporarily add `127.0.0.1:6379:6379` under Redis `ports`; do not publish Redis by default.

The named `redis-data` volume survives normal stops and restarts. Do not use `docker compose down -v`, which deletes named volumes. Removing PostgreSQL from the Compose definition does not delete its existing volume or old `carta-postgres` container; do not use `--remove-orphans` if those resources must remain.