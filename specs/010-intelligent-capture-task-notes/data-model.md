# Data Model

Additive PostgreSQL changes; apply through Alembic. Full request/response shapes are in [contracts/api.md](contracts/api.md).

## Note

Existing owner, title, plain `content`, tags, lifecycle timestamps, and hashes remain.

- `content_rich`: nullable JSONB Tiptap document. Null means a legacy/plain-text note.
- `content`: remains the canonical readable-text projection. Save it atomically with `content_rich`; use it for note search, hashes, embeddings, summaries, and existing AI tools.
- On a legacy note's first rich edit, initialize the editor from its plain text and save both representations. No bulk backfill.
- Ownership and lifecycle rules are unchanged.

## Task

Existing task fields remain; add:

- `due_end_at`: nullable timezone-aware timestamp. Null means a single date/deadline. When present, it is the inclusive end of a date-only range; `due_at` is its start. Timed tasks cannot have an end date.
- `source_text`: nullable text containing the extracted original task phrase/context, preserving vague dates or details omitted from the concise title.

Rules:

- No deadline: `due_at`, `due_end_at` are null and `due_has_time` is false.
- Single date: `due_at` is set, `due_end_at` is null, `due_has_time` is false.
- Date range: both endpoints are set, `due_has_time` is false, and end date is not before start date.
- Timed deadline: `due_at` is set with timezone, `due_end_at` is null, and `due_has_time` is true only for a user-stated time.
- Manual date edits override extracted ranges; clearing the manual deadline clears both endpoints and the time flag.
- Completion state remains `completed_at == null` for open and a UTC instant for complete. Cleanup deletes only tasks completed at least seven days earlier. Reopening clears the timestamp and excludes the task from cleanup.
- All user operations remain scoped by Clerk user ID. Cleanup is the only cross-user operation and is restricted by the expiry predicate.

## Capture

No durable Capture entity is required. Keep submitted text in the client until a successful response; structured model output is validated before any derived note/task is persisted. Each created task retains its source phrase in `source_text`.
