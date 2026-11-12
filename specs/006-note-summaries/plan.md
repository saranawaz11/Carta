# Implementation Plan: Real Note Summaries

**Branch**: `006-note-summaries` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

## Summary

One structured LLM call per Summarize/Regenerate produces overview, key points, deadlines, and connection reasons. The result is saved per note and served by GET. Candidates come from existing chunk vectors. Deadlines become tasks through the tasks service, which now de-duplicates for every path.

## Technical Context

- **Backend**: FastAPI, SQLAlchemy, Alembic, LangChain `ChatOpenAI` (no new packages or env vars). Backend is flat (`backend/llm.py`, `services/`, `repositories/`, `routes/`).
- **Frontend**: Next.js, SWR, `apiFetch`; edits in `app/(app)/notes/[id]/page.tsx` plus a new `lib/summary.ts`.
- **Storage**: new `note_summaries` table; new `tasks.source_note_id`.

## Constitution Check

- OpenAI/LangChain only in `llm.py`; frontend talks only to the API: pass.
- routes -> services -> repositories, thin routes, Alembic migration: pass.
- Every query scoped by Clerk user ID: pass.
- No tests, no extra docs, no styling changes: pass.

## Design Decisions

| Decision | Reason | Rejected |
|---|---|---|
| One structured-output call | Fixed shape, one pass, cheaper and predictable | Agent with tools |
| Save result in `note_summaries` | Reopening is free; LLM only on button | Regenerating on every view |
| Candidates from existing `note_chunks` vectors, LLM writes only reasons | No extra embedding cost; reuses pgvector | New embedding call, separate similarity table |
| Discard connections whose id is not a candidate | Prevents invented or foreign notes | Letting the model name notes freely |
| Duplicate check in tasks service | Quick capture, Ask AI, and this feature share one rule | Checking only in this feature |
| `source_note_id` FK ON DELETE SET NULL | Tasks outlive their note | Deleting tasks with their note |
| Remove deadline by editing stored list | Simple; regeneration restoring it is accepted | Dismissed-deadlines table |
| Stale = saved `content_hash` != note's current hash | Reuses the existing hash | Timestamp comparison |

## Backend

- **Migration** `alembic/versions/0004_note_summaries.py`: `note_summaries(note_id uuid pk fk notes ON DELETE CASCADE, clerk_user_id text indexed, overview text, key_points jsonb, deadlines jsonb, connections jsonb [{note_id, reason}], content_hash text, generated_at timestamptz)`; `tasks.source_note_id uuid null fk notes ON DELETE SET NULL`. Models `NoteSummary` and `Task.source_note_id` in `models.py`.
- **`repositories/note_summaries.py`**: get, upsert, update deadlines, delete; all filter by `clerk_user_id`. `repositories/note_chunks.py`: add `similar_notes(note_id, user, limit=3)` using the note's own chunk vectors as the query, grouped by note, excluding itself, archived, and soft-deleted notes. `repositories/tasks.py`: add `find_duplicate(user, title, due_at)` (lower/trim title, equal `due_at`, null equals null) and accept `source_note_id` on create.
- **`services/tasks.py`**: `create_task` calls `find_duplicate` first and returns the existing task instead of inserting; accepts optional `source_note_id`. Quick capture and Ask AI already go through it.
- **`llm.py`**: `summarize_note(title, content, now, timezone, candidates)` using `ChatOpenAI.with_structured_output` on a Pydantic `NoteSummaryResult` (overview, key_points, deadlines `{title, due_at ISO, due_has_time}`, connections `{note_id, reason}`). The prompt says be brief, list only explicit dates, never invent dates, and use connection ids only from the candidates.
- **`services/note_summaries.py`**:
  - `generate`: 404 if not the user's live note; 400 if empty; `embedding.sync_note`; fetch candidates (id, title, short snippet); call `summarize_note`; drop connections not in the candidate ids; upsert with the note's `content_hash`.
  - `get`: returns saved overview, key points, deadlines each with `already_in_tasks` (via `find_duplicate`), connections resolved to current titles (skipping deleted or missing), and `stale`.
  - `remove_deadline(index)`: edits the stored list and returns it with flags. `add_deadline_task(index)`: calls `tasks.create_task` with `source_note_id`. Bad index -> 404.
- **`services/notes.py`**: on soft delete, delete the summary row.
- **`routes/note_summaries.py`** (auth dependency, thin): `GET /api/notes/{id}/summary`; `POST /api/notes/{id}/summary {now, timezone}`; `DELETE /api/notes/{id}/summary/deadlines/{index}`; `POST /api/notes/{id}/summary/deadlines/{index}/task`. Schemas in `schemas.py`; register router in `main.py`.

## Frontend

- **`lib/summary.ts`**: `useNoteSummary(id)` (SWR on `/api/notes/{id}/summary`) with `generate()` (POST with `new Date().toISOString()` and `Intl.DateTimeFormat().resolvedOptions().timeZone`), `removeDeadline(i)`, `addDeadlineToTasks(i)`; each updates the SWR cache and the last two also `invalidateTasks`. Loading and error states exposed.
- **`notes/[id]/page.tsx`** (`SummaryPanel`): remove `STATIC_SUMMARY` and the "Sample data" badge; keep existing JSX and classes. Add Summarize/Regenerate button (disabled for empty note or while loading) and a stale hint in the header area; empty state when no summary. New Deadlines section between Key points and Connected notes, reusing heading and list styles, with Add to tasks (Added label when `already_in_tasks`) and Remove. Connected notes become `Link`s to `/notes/[id]`. Tags and provenance untouched.
