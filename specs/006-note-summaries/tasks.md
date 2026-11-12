# Tasks: Real Note Summaries

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Tests**: None (per constitution).

## Phase 1: Foundational (blocks all stories)

- [X] T001 Add `NoteSummary` model and `Task.source_note_id` (uuid null, FK `notes.id` ON DELETE SET NULL) in `backend/models.py`; `note_summaries`: note_id pk FK notes ON DELETE CASCADE, clerk_user_id text indexed, overview text, key_points jsonb, deadlines jsonb, connections jsonb `[{note_id, reason}]`, content_hash text, generated_at timestamptz
- [X] T002 Add Alembic migration `backend/alembic/versions/0004_note_summaries.py` creating `note_summaries` (index on `clerk_user_id`) and `tasks.source_note_id`
- [X] T003 Add `find_duplicate(db, user, title, due_at)` (trimmed lowercase title, equal `due_at`, null equals null) and optional `source_note_id` on create in `backend/repositories/tasks.py`
- [X] T004 Make `create_task` in `backend/services/tasks.py` return the existing task from `find_duplicate` instead of inserting; accept optional `source_note_id` (shared by quick capture, Ask AI, and summaries)

## Phase 2: User Story 1 - Summarize a note (P1) MVP

**Goal**: Summarize/Regenerate saves and shows overview and key points; reopening shows it; stale hint.
**Independent Test**: Summarize, reload (no regeneration), edit note (stale hint), Regenerate (replaced); empty note button disabled.

- [X] T005 [P] [US1] Add `NoteSummaryResult` (overview, key_points, deadlines `{title, due_at ISO, due_has_time}`, connections `{note_id, reason}`) and `summarize_note(title, content, now, timezone, candidates)` using `ChatOpenAI.with_structured_output` in `backend/llm.py`; prompt: be brief, only explicit dates, never invent dates, connection ids only from candidates
- [X] T006 [P] [US1] Add summary request/response schemas (`SummaryRequest {now, timezone}`, deadline with `already_in_tasks`, connection with current title, `stale`) in `backend/schemas.py`
- [X] T007 [P] [US1] Implement `backend/repositories/note_summaries.py` (get, upsert, update deadlines, delete; every query filtered by `clerk_user_id`)
- [X] T008 [P] [US1] Add `similar_notes(db, note_id, clerk_user_id, limit=3)` in `backend/repositories/note_chunks.py` using the note's own chunk vectors, grouped by note, excluding itself, archived, and soft-deleted notes
- [X] T009 [US1] Implement `generate` and `get` in `backend/services/note_summaries.py`: 404 if not the user's live note; 400 if empty; `embedding.sync_note` first; candidates (id, title, snippet); drop connections not in candidate ids; upsert with note `content_hash`; `get` returns `stale` when hashes differ
- [X] T010 [US1] Delete the summary row on soft delete in `backend/services/notes.py`
- [X] T011 [US1] Add `backend/routes/note_summaries.py` with `GET` and `POST /api/notes/{id}/summary` (thin, auth dependency) and register in `backend/main.py`
- [X] T012 [US1] Add `frontend/lib/summary.ts`: `useNoteSummary(id)` (SWR), `generate()` posting `new Date().toISOString()` and `Intl.DateTimeFormat().resolvedOptions().timeZone`, loading and error states
- [X] T013 [US1] Update `SummaryPanel` in `frontend/app/(app)/notes/[id]/page.tsx`: remove `STATIC_SUMMARY` and the "Sample data" badge; Summarize/Regenerate button (disabled for empty note or loading), stale hint, empty state, error; keep JSX and classes

## Phase 3: User Story 2 - Deadlines to tasks (P2)

**Goal**: Deadlines listed; Add to tasks creates a linked, non-duplicate task; Remove drops it.
**Independent Test**: Add a deadline -> task on /tasks without reload, shows Added; add again -> no duplicate; Remove -> gone.

- [X] T014 [US2] Add `already_in_tasks` (via `find_duplicate`), `remove_deadline(index)` and `add_deadline_task(index)` (calls `tasks.create_task` with `source_note_id`; bad index -> 404) in `backend/services/note_summaries.py`
- [X] T015 [US2] Add `DELETE /api/notes/{id}/summary/deadlines/{index}` and `POST .../deadlines/{index}/task` in `backend/routes/note_summaries.py`
- [X] T016 [US2] Add `removeDeadline(i)` and `addDeadlineToTasks(i)` to `frontend/lib/summary.ts`, updating the SWR cache and calling `invalidateTasks` from `frontend/lib/tasks.ts`
- [X] T017 [US2] Add Deadlines section between Key points and Connected notes in `frontend/app/(app)/notes/[id]/page.tsx` reusing existing heading and list styles: Add to tasks (Added label when `already_in_tasks`) and Remove

## Phase 4: User Story 3 - Connected notes (P3)

**Goal**: Up to 3 connected notes with reasons, linked, deleted ones hidden.
**Independent Test**: Summarize a note with similar notes; click a connection; delete one and reload -> hidden.

- [X] T018 [US3] Resolve connections to current note titles in `get`, skipping deleted or missing notes, in `backend/services/note_summaries.py`
- [X] T019 [US3] Render each connected note as a `Link` to `/notes/[id]` with its reason in `frontend/app/(app)/notes/[id]/page.tsx`

## Dependencies

- Phase 1 blocks all. T005-T008 parallel, then T009 -> T011 -> T012 -> T013.
- US2 and US3 build on US1 (T009, T011, T013); US2 and US3 are independent of each other.
