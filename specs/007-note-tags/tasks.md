# Tasks: Real Note Tags

**Input**: `specs/007-note-tags/` (plan.md, spec.md). No tests requested.

## Phase 1: Foundational

- [X] T001 Add `tags` (text array, not null, default empty) to the `Note` model in `backend/models.py` and create migration `backend/alembic/versions/0005_note_tags.py` with a GIN index; apply it
- [X] T002 [P] Add `tags: list[str]` to note response schemas and optional `tags` to the note update schema in `backend/schemas.py`
- [X] T003 [P] Add `tags: string[]` to the `Note` type in `frontend/lib/notes.ts`

## Phase 2: User Story 1 - Add and remove tags (P1)

**Goal**: add by Enter, remove by chip, saved immediately with rollback.
**Independent test**: add a tag, reload, it persists; remove it, reload, it is gone.

- [X] T004 [US1] Add `normalize_tags` (trim, lowercase, collapse spaces, drop empties, de-duplicate; 422 if a tag > 30 chars or > 10 tags) and apply tags in update in `backend/services/notes.py`, leaving `compute_hash` unchanged; persist `tags` in `backend/repositories/notes.py`
- [X] T005 [US1] Replace `STATIC_TAGS` with `note.tags` in `frontend/app/(app)/notes/[id]/page.tsx`; turn "+ Add tag" into a click-to-open input (Enter adds, Escape/blur closes) and add a remove control on each `TagChip`, with client-side limit/duplicate messages
- [X] T006 [US1] In the same page, save tag changes via `updateNote` with only `{ tags }` immediately (no debounce), optimistic update with rollback on error, independent of the title/content autosave

## Phase 3: User Story 2 - Suggestions (P2)

**Goal**: typing suggests the user's existing tags from other notes.
**Independent test**: tag note A "research", type "res" on note B, see "research".

- [X] T007 [US2] Add `list_tags(user_id)` (distinct tags from non-deleted notes, sorted) to `backend/repositories/notes.py` and a thin `GET /api/tags` in new `backend/routes/tags.py`; register the router in `backend/main.py`
- [X] T008 [P] [US2] Create `useTags()` (SWR on `/api/tags`) in `frontend/lib/tags.ts`
- [X] T009 [US2] Show suggestions in the tag input in `frontend/app/(app)/notes/[id]/page.tsx`, filtered by typed text and excluding tags already on the note; revalidate tags after a change

## Dependencies

T001 -> T004, T007; T002 -> T004; T003 -> T005; T004, T005 -> T006; T007 + T008 -> T009. US2 builds on the US1 input.

## Parallel

T002 and T003 run in parallel after T001; T008 runs in parallel with T007.

## Strategy

MVP = Phase 1 + US1 (T001-T006); then add suggestions (US2).
