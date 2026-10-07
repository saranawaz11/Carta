# Quickstart (manual validation)

## Prerequisites

- Clerk auth from [001-clerk-auth](../001-clerk-auth/quickstart.md) working; `DATABASE_URL` set in `backend/.env`.

## Run

- Migrate: `cd backend; uv run alembic upgrade head`
- Backend: `cd backend; uv run fastapi dev`
- Frontend: `cd frontend; npm run dev`

## Check

- Create Note: empty note opens at `/notes/<uuid>`; edits persist after refresh.
- Notes, Archive, Deleted lists show only their own state; sidebar stays mounted when navigating.
- Archive or Delete from the note page redirects to `/archive`; deleted note appears in Deleted.
- Restore returns a note to Notes; permanent delete removes it.
- Search narrows the current list.
- A second user's id for the same note URL returns 404.
- Break the API (stop backend) and edit: the list rolls back.
- Endpoint shapes: [contracts/notes.md](./contracts/notes.md); fields: [data-model.md](./data-model.md).
