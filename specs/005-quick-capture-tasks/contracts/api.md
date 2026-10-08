# API Contract

All endpoints require the Clerk bearer token.

- `GET /api/tasks` -> `Task[]` where `Task = {id, title, due_at|null, due_has_time, completed_at|null, created_at}`
- `POST /api/tasks` `{title, due_at?, due_has_time}` -> `Task`
- `PATCH /api/tasks/{id}` `{completed: bool}` -> `Task`
- `DELETE /api/tasks/{id}` -> 204
- `POST /api/capture` `{text (1-500), now (ISO 8601), timezone (IANA)}` ->
  `{outcome: "task_created"|"note_created"|"pending_action"|"message", task|null, note|null, pending_action|null, message|null}`
- Confirmed actions reuse `POST /api/chat/confirm` unchanged.
