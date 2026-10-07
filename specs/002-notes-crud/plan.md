# Implementation Plan: Notes CRUD

**Branch**: `002-notes-crud` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

- Backend: `notes` table (Alembic), owner-scoped REST API under `/api/notes`.
- Frontend: sidebar layout, list pages (`/`, `/archive`, `/deleted`), note page (`/notes/[id]`).
- SWR caches lists; optimistic updates with rollback; debounced edit saves.

## Technical Context

- **Language/Version**: Python >=3.11; TypeScript (Next.js 16, React 19)
- **Primary Dependencies**: backend: SQLAlchemy, Alembic, `psycopg[binary]` (Pydantic ships with FastAPI); frontend: `swr`, shadcn/ui (`button`, `input` only)
- **Storage**: Neon PostgreSQL via `DATABASE_URL`
- **Testing**: None (per constitution)
- **Project Type**: Web app (`frontend/` + `backend/`)
- **Constraints**: no scheduler/background jobs; no pagination; config via env vars

## Constitution Check

- Frontend talks only to FastAPI; backend is the only DB client: PASS
- Layers routes -> services -> data access, no logic in routes: PASS
- Alembic for every schema change: PASS
- Notes owned by Clerk user ID, own notes only: PASS
- Minimal files/deps, minimal shadcn, no styling, no tests: PASS
- New env var added to `backend/.env`: PASS (planned)

## Key Design Decisions

- **Sync SQLAlchemy + psycopg**: simplest with Neon; FastAPI runs sync routes in a threadpool. Rejected: async + asyncpg (extra setup, Neon SSL quirks).
- **Every query filters by `clerk_user_id`; foreign notes return 404**: no existence leak. Rejected: 403.
- **State via `archived_at` / `deleted_at` timestamps**: gives deletion time for the 15-day purge, no status enum. Rejected: status column.
- **Lazy purge when the Deleted list is read, scoped to the caller**: no scheduler needed. Rejected: cron/background job (out of scope).
- **Invalid state transitions return 409**: e.g. permanent DELETE on a non-deleted note. Rejected: silent no-op.
- **SWR keyed by `?status=&q=`**: shared list cache across pages and sidebar. Rejected: manual React state/context.
- **Route group `app/(app)/layout.tsx` holds the sidebar**: stays mounted across navigation; sign-in/up stay outside. Rejected: sidebar per page.
- **Create waits for the server UUID, then inserts into the active list and navigates**: the URL needs the id. Rejected: client-generated id (changes the create contract).
- **Debounced PATCH (800 ms) from the note page**: fewer requests. Rejected: save on every keystroke.
- **`apiFetch` gains optional `method`/`body`**: reuse the existing helper. Rejected: second fetch helper.

## Project Structure

### Documentation

```text
specs/002-notes-crud/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/notes.md
```

### Source Code

```text
backend/
├── alembic.ini
├── alembic/              # env.py reads DATABASE_URL; one revision: create notes
├── core/db.py            # engine, session dependency
├── models.py             # Note (SQLAlchemy)
├── schemas.py            # Pydantic: NoteOut, NoteUpdate
├── routes/notes.py       # /api/notes endpoints
├── services/notes.py     # state rules, 404/409, purge
├── repositories/notes.py # owner-scoped queries
└── main.py               # include router (edit)

frontend/
├── components.json       # shadcn init
├── components/ui/        # button, input
├── components/sidebar.tsx
├── components/note-list.tsx   # list + search, takes status
├── lib/api.ts            # add method/body (edit)
├── lib/notes.ts          # SWR hooks + optimistic mutations
└── app/
    ├── (app)/layout.tsx          # sidebar + children
    ├── (app)/page.tsx            # active notes (replaces /api/me demo)
    ├── (app)/archive/page.tsx
    ├── (app)/deleted/page.tsx
    └── (app)/notes/[id]/page.tsx # edit, Archive, Delete
```

**Structure Decision**: Extends existing `frontend/` and `backend/`; layers split per constitution.

## Environment Variables

- Backend: `DATABASE_URL` (Neon, `postgresql+psycopg://...?sslmode=require`) in `backend/.env`

## Complexity Tracking

- None.
