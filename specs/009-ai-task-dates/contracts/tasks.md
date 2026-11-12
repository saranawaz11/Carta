# Task Date Entry Contract

## `POST /api/tasks`

Authentication: existing Clerk-protected task endpoint.

### Natural-language task request

```json
{
  "title": "Renew pass next month",
  "now": "2026-11-10T16:30:00+05:00",
  "timezone": "Asia/Karachi"
}
```

- `title` contains the user's raw task text.
- `now` is the browser's current datetime, including its offset.
- `timezone` is the browser's IANA timezone.
- The backend resolves the title and optional due date using the shared date interpreter and returns the existing Task response.
- When no date is present, `due_at` is null and `due_has_time` is false.
- A date-only result must not contain a fabricated time.
- An unresolvable stated date returns a client-visible error and creates no task.

### Already-normalized task requests

Existing callers that provide a normalized title and optional `due_at`/`due_has_time` continue to use the current task creation behavior. They do not need to invoke natural-language interpretation.

## `POST /api/capture`

The request remains `{ "text": "...", "now": "...", "timezone": "..." }`. Existing note and note-operation outcomes are unchanged. If the capture agent classifies the text as a task, it uses the same date-resolution rules as direct task entry before invoking existing task persistence. An unresolved date returns a visible message and creates no task.

## Ownership and persistence

Both entry points require the authenticated user. Task creation, duplicate detection, and ownership remain enforced by the existing backend service.
