# Tasks: Notes CRUD

**Input**: `specs/002-notes-crud/` (plan, spec, data-model, contracts/notes.md)
**Tests**: None (per constitution)

## Phase 1: Setup

- [X] T001 Add backend deps with `uv add sqlalchemy alembic "psycopg[binary]"` in `backend/pyproject.toml`
- [X] T002 [P] Add `DATABASE_URL=` (name only) to `backend/.env` and `config.py` setting in `backend/core/config.py`
- [X] T003 [P] Install `swr` in `frontend/package.json`
- [X] T004 [P] Run shadcn init and add `button` and `input` only in `frontend/components/ui/`

## Phase 2: Foundational (blocks all stories)

- [X] T005 Create engine and session dependency in `backend/core/db.py`
- [X] T006 Create `Note` model per data-model.md in `backend/models.py` (id uuid PK default `gen_random_uuid()`; `clerk_user_id` text not null indexed; `title`/`content` text not null default `''`; `archived_at`/`deleted_at` timestamptz nullable; `created_at`/`updated_at` timestamptz not null default now, `updated_at` refreshed on every update)
- [X] T007 Run `alembic init` and configure `backend/alembic/env.py` to read `DATABASE_URL` and use `models.py` metadata
- [ ] T008 Write the single "create notes" revision in `backend/alembic/versions/` and run `alembic upgrade head` (blocked: `DATABASE_URL` is not configured; offline SQL generation passed)
- [X] T009 [P] Add `NoteOut` and `NoteUpdate` Pydantic schemas in `backend/schemas.py`
- [X] T010 Create owner-scoped queries (every query filters `clerk_user_id`) in `backend/repositories/notes.py`
- [X] T011 Create service skeleton (404 for foreign/missing, 409 for invalid transitions) in `backend/services/notes.py`
- [X] T012 Create router skeleton with `get_current_user_id` dependency in `backend/routes/notes.py`; include it and allow GET, POST, PATCH, DELETE in CORS in `backend/main.py`
- [X] T013 [P] Extend `apiFetch` with optional `method` and `body`; remove the `console.log("TOKEN:", token)` line in `frontend/lib/api.ts`
- [X] T014 [P] Create SWR list hook keyed by `?status=&q=` and `Note` type in `frontend/lib/notes.ts`
- [X] T015 Create `frontend/app/(app)/layout.tsx` and `frontend/components/sidebar.tsx` (Create Note button, links to `/`, `/archive`, `/deleted`); move/replace `frontend/app/page.tsx` demo with `frontend/app/(app)/page.tsx`

## Phase 3: User Story 1 - Manage notes (P1) 🎯 MVP

**Goal**: Create an empty note, open `/notes/[id]`, edit title and content.
**Independent test**: Create Note opens an empty note; edits persist after reload.

- [X] T016 [US1] Implement `POST /api/notes` (empty note), `GET /{id}`, `PATCH /{id}` (409 on deleted) across `backend/repositories/notes.py`, `backend/services/notes.py`, `backend/routes/notes.py`
- [X] T017 [US1] Add `createNote` (wait for server UUID, insert into active list, `router.push`), `useNote`, and `updateNote` in `frontend/lib/notes.ts`; wire Create Note button in `frontend/components/sidebar.tsx`
- [X] T018 [US1] Build note page with title/content inputs and 800 ms debounced PATCH with optimistic update and rollback in `frontend/app/(app)/notes/[id]/page.tsx`

## Phase 4: User Story 2 - Browse and search (P2)

**Goal**: Active, Archive, Deleted lists with search.
**Independent test**: Each list shows only its state; `?q=` filters the open list; click opens the note.

- [X] T019 [US2] Implement `GET /api/notes?status=active|archived|deleted&q=` (ILIKE on title and content; lazy purge of caller's notes deleted >15 days when `status=deleted`) in `backend/repositories/notes.py`, `backend/services/notes.py`, `backend/routes/notes.py`
- [X] T020 [US2] Create list component with search box and links to `/notes/[id]`, taking `status`, in `frontend/components/note-list.tsx`
- [X] T021 [P] [US2] Use it in `frontend/app/(app)/page.tsx`, `frontend/app/(app)/archive/page.tsx`, `frontend/app/(app)/deleted/page.tsx`

## Phase 5: User Story 3 - Archive, delete, restore (P3)

**Goal**: Archive, soft delete, restore, permanent delete.
**Independent test**: Archive/Delete on note page redirect to `/archive`; Deleted page can restore or permanently delete.

- [X] T022 [US3] Implement `POST /{id}/archive`, `/unarchive`, `/delete`, `/restore` and `DELETE /{id}` (only if soft-deleted, else 409; restore clears `deleted_at` and `archived_at`) in `backend/repositories/notes.py`, `backend/services/notes.py`, `backend/routes/notes.py`
- [X] T023 [US3] Add optimistic `archiveNote`, `deleteNote`, `restoreNote`, `purgeNote` with rollback in `frontend/lib/notes.ts`
- [X] T024 [US3] Add Archive and Delete buttons (then `router.push("/archive")`) in `frontend/app/(app)/notes/[id]/page.tsx`
- [X] T025 [US3] Add Restore and Delete permanently actions to Deleted list in `frontend/components/note-list.tsx`

## Phase 6: Polish

- [X] T026 Run `npm run lint` and `npx tsc --noEmit` in `frontend/`; fix errors
- [ ] T027 Run quickstart.md validation steps (blocked: Neon `DATABASE_URL` is not configured in `backend/.env`)

## Dependencies

- Setup -> Foundational -> US1 -> US2 -> US3 (US2/US3 reuse the note page and list from earlier phases)
- Backend (T016/T019/T022) and frontend tasks within a story can proceed in parallel after Foundational.
- Parallel: T002-T004; T009, T013, T014; T021.

## Strategy

- MVP = Phases 1-3 (create and edit notes), then add lists/search, then archive/delete/restore.
