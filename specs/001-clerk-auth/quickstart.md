# Quickstart (manual validation)

## Prerequisites

- Clerk application created; env vars from [plan.md](./plan.md) set in `frontend/.env.local` and backend environment.

## Run

- Backend: `cd backend; uv run fastapi dev`
- Frontend: `cd frontend; npm run dev`

## Check

- Open `/` signed out: redirected to `/sign-in`; `/sign-up` loads.
- Sign up, then land on `/`: your Clerk user ID is shown.
- Sign out via `UserButton`: redirected to `/sign-in`.
- `curl http://localhost:8000/api/me` (no token): 401; with a garbage token: 401.
- See [contracts/me.md](./contracts/me.md) for the response shapes.
