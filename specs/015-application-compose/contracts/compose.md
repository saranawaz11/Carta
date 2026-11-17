# Contract: Deployment Interface

Operator-facing interface of the root [docker-compose.yml](../../../docker-compose.yml).

## Services and Ports

- `frontend`: browser at `http://localhost:3000`.
- `backend`: browser at `http://localhost:8000` (used by `NEXT_PUBLIC_API_URL`).
- `redis`: internal only at `redis:6379`; not published.

## Required Settings (names only)

- Root `.env`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- `backend/.env`: `DATABASE_URL`, `CLERK_ISSUER`, `FRONTEND_ORIGIN`, `OPENAI_API_KEY`.

A missing required setting must fail or warn with its name only, never its value.

## Operator Commands

```text
docker compose config --quiet                 # validate without printing values
docker compose build                          # rebuild images
docker compose up -d                          # start
docker compose ps                             # list status and health
docker compose logs -f <frontend|backend|redis>
docker compose stop                           # stop; keeps volumes
docker compose up -d --build <service>        # rebuild and restart one service
```

Do not use `docker compose down --remove-orphans`; it would remove the old `carta-postgres` container.
