# API and Interaction Contracts

Existing REST paths and Clerk authorization remain. All paths below require the existing authenticated user unless marked as an internal scheduled command.

## Quick Capture — `POST /api/capture`

Request remains `{ "text": string, "now": ISO-8601, "timezone": IANA timezone }`.

The backend validates the full structured classification before saving. Result includes:

- Existing `pending_action` and `message` outcomes for note operations requiring confirmation or requests that cannot be classified.
- Existing `task_created` / `note_created` single-item outcomes and compatibility fields.
- `capture_created` for mixed or multiple results, with `note: NoteOut | null` and `tasks: TaskOut[]`.
- On a clarification or processing error, no guessed deadline or false success; return an actionable message, retain submitted text in the UI, and identify any partial persistence.

Task entries include a concise title, source phrase/context, and either no deadline, one date/time, or an inclusive date range.

## Tasks — `POST /api/tasks`, `PATCH /api/tasks/{id}`

- Creation accepts a title/text and the existing `now` + `timezone` pair for natural-language interpretation. If deadline fields are omitted, resolve any date phrase in the title. If the caller explicitly includes `due_at`/`due_end_at`, those fields are a user-selected override; `due_at: null` means explicitly create without a deadline. Direct entry and capture share title/date rules.
- `PATCH` continues to accept completion changes and adds optional deadline fields. Omitted fields are unchanged; explicit `due_at: null` clears deadline, end date, and time. A non-null end date is only valid for a date-only range and cannot precede the start.
- A successful response returns the updated `TaskOut`, including `due_at`, `due_end_at`, `due_has_time`, `completed_at`, and `source_text`.
- Authenticated users can only create or update their own tasks; another user's task remains not found.

## Notes — `GET/PATCH /api/notes/{id}`

- Keep `content: string` as the readable-text projection and add nullable `content_rich: object` for the Tiptap document.
- Rich edits submit the document and its text projection together. The server validates supported document shape and persists both atomically. A legacy update containing only `content` updates plain text and sets `content_rich` to null; this prevents a stale rich document from masking the new text. It never interprets raw markup as rich content.
- `NoteOut` returns both fields. Search, embedding synchronization, note hashes, summary generation, and AI tools continue using `content`.
- Links are constrained to safe web/email protocols; raw HTML is not accepted as editor content.

## Completed-task cleanup — scheduled backend command

- A one-shot backend command invokes the shared cleanup service using UTC.
- It deletes only tasks with `completed_at <= now - 7 days`; repeated runs are safe. Schedule at least daily in the deployment environment and surface job failures operationally.
- Do not expose a public unauthenticated cleanup route or make cleanup depend on user requests.
