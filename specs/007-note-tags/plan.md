# Implementation Plan: Real Note Tags

**Branch**: `007-note-tags` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

## Summary

Tags live in a text-array column on `notes`, set through the existing PATCH endpoint and normalized and validated in the notes service. A distinct-tags query feeds suggestions. The note page swaps static tags for real ones with optimistic, immediate saves.

## Technical Context

- **Backend**: FastAPI, SQLAlchemy, Alembic (no new packages). Flat layout (`services/`, `repositories/`, `routes/`).
- **Frontend**: Next.js, SWR, `apiFetch`; edits in `app/(app)/notes/[id]/page.tsx`, `lib/notes`, and a new `useTags` hook.
- **Storage**: `notes.tags text[] not null default '{}'` with a GIN index.

## Constitution Check

- No LLM/OpenAI code touched: pass.
- routes -> services -> repositories, thin routes, Alembic migration: pass.
- Every query scoped by Clerk user ID: pass.
- No tests, no extra docs, no styling changes: pass.

## Design Decisions

| Decision | Reason | Rejected |
|---|---|---|
| `tags text[]` column on notes | Simplest fit for per-note labels | Tags table plus join table (more machinery until tags are renamed or filtered globally) |
| Normalize and validate in the notes service | One trusted rule for every client | Trusting the frontend |
| Keep tags out of `content_hash` | Tag edits must not re-embed or mark summaries stale | Re-embedding on tag change |
| Reuse `PATCH /api/notes/{id}` | One update path, existing `updateNote` action | Separate tag endpoints per note |
| `GET /api/tags` as a distinct-tags query | Always in sync with notes, nothing extra to store | Storing a separate tag list |

## Backend

- **Migration** `alembic/versions/0005_note_tags.py`: add `notes.tags text[] not null server_default '{}'`; GIN index on it. Add `tags` to the `Note` model.
- **`schemas.py`**: add `tags: list[str]` to the note response schemas (all existing note responses return it) and optional `tags` to the note update schema.
- **`services/notes.py`**: `normalize_tags(tags)`: trim, lowercase, collapse internal whitespace, drop empties, de-duplicate keeping order; raise 422 if any tag exceeds 30 characters or more than 10 remain. `update_note` applies tags only when provided. `compute_hash` is unchanged (title and content only), so `embedding.sync_note` skips and summary `stale` is unaffected.
- **`repositories/notes.py`**: persist `tags`; add `list_tags(user_id)` returning distinct `unnest(tags)` from non-deleted notes for that user, sorted.
- **`routes/tags.py`** (auth dependency, thin): `GET /api/tags` -> `list[str]`; register in `main.py`. PATCH route stays as is.

## Frontend

- **`lib/notes`**: add `tags: string[]` to the `Note` type.
- **`lib/tags.ts`**: `useTags()` (SWR on `/api/tags`) returning the user's tags; revalidated after a tag change.
- **`notes/[id]/page.tsx`**: keep `TagChip` and styling. Replace `STATIC_TAGS` with `note.tags`. The "+ Add tag" placeholder becomes a small input shown on click: Enter adds, Escape or blur closes. Each chip gets a remove control. Suggestions come from `useTags` filtered by the typed text, excluding tags already on the note; picking one adds it. Client rejects over-length, duplicate, or over-limit input with a short message.
- **Saving**: tag changes call the existing `updateNote` with only `{ tags }` immediately (no 800ms debounce), optimistically updating the note in cache and rolling back on error. This path is separate from the title/content autosave so neither interferes with the other.
