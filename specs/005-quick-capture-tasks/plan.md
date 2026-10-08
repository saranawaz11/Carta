# Implementation Plan: Quick Capture and Tasks

**Branch**: `005-quick-capture-tasks` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

## Summary

A one-shot capture endpoint runs the existing tool-calling agent with a new `create_task` tool and a capture prompt. Tasks get their own table, service, and `/api/tasks` CRUD. A sidebar dialog posts to `/api/capture`; a `/tasks` page lists tasks.

## Technical Context

- **Backend**: FastAPI, SQLAlchemy, Alembic, LangChain/LangGraph/OpenAI (no new packages, no new env vars).
- **Frontend**: Next.js, SWR, existing `apiFetch`, shadcn (add `dialog` only).
- **Storage**: new `tasks` table in Neon PostgreSQL.

## Constitution Check

- LLM imports only in `backend/llm.py`; frontend talks only to the API ?
- routes -> services -> repositories; routes thin; Alembic migration ?
- Clerk-user scoping on every query ?
- No tests, no extra docs, no styling ?

## Design Decisions

| Decision | Reason | Rejected |
|---|---|---|
| Reuse the tool-calling agent, add `create_task` | Same tools and graph already cover notes; one new tool is the smallest change | Separate router or classifier graph |
| Capture-specific prompt and `POST /api/capture` | One statement, no conversation, different outcome shape | Reusing the chat endpoint |
| Browser sends `now` and `timezone` | Only the browser knows the user's zone | Backend guessing a timezone |
| Save as a note when unsure | One-shot dialog; nothing is lost | Follow-up questions |
| Reuse `propose_*` and `POST /api/chat/confirm` | Same Confirm/Cancel safety, no new confirm logic | Direct execution |
| Own `tasks` table | Different fields and lifecycle (done, due) | Tasks as flagged notes |
| Store due date only, no notifications | Out of scope | Building a scheduler now |

## Backend

- **Migration** `alembic/versions/0003_create_tasks.py`: `tasks(id uuid pk, clerk_user_id text indexed, title text, due_at timestamptz null, due_has_time bool default false, completed_at timestamptz null, created_at timestamptz default now())`. Model `Task` in `models.py`.
- **`repositories/tasks.py`**: list (open first, then by due date), get, create, set completed, delete; every query filters by `clerk_user_id`.
- **`services/tasks.py`**: wraps the repository; missing or foreign task -> 404.
- **`routes/tasks.py`** (`/api/tasks`, auth dependency): `GET`, `POST {title, due_at?, due_has_time}`, `PATCH /{id} {completed}`, `DELETE /{id}` (hard delete, 204).
- **`llm.py`**: add `create_task(title, due_at?, due_has_time)` with Pydantic args. The user ID comes from the graph config, never from arguments. `due_at` is parsed as ISO 8601; invalid -> error text returned to the model. It calls a `create_task` callable from the config (keeps `llm.py` free of DB code) and returns `{task_id, title, due_at}`. Add it to the shared tool list, so Ask AI gets it too. Add `CAPTURE_PROMPT` and a `run_capture_graph(text, now, timezone, configurable)` that uses all tools except `resolve_pending_action`, and returns `{task, note_id, pending_action, message}`.
- **Capture prompt**: handle exactly one statement, no conversation; `create_task` for reminders and to-dos; `create_note` for things to remember; `propose_*` for edit, archive, delete only after `search_notes` finds exactly one note, otherwise say none or several match and do nothing; when unsure, `create_note` with the original statement. Includes the current datetime and timezone for resolving relative dates.
- **`services/capture.py`**: syncs embeddings like chat, supplies callables (search, create note, get note, create task), runs the graph, maps the result to an outcome: `task_created`, `note_created`, `pending_action`, or `message`.
- **`routes/capture.py`**: `POST /api/capture`. `schemas.py`: `CaptureRequest {text (1-500 chars, stripped), now (ISO), timezone (valid IANA name)}`, `CaptureResponse`, `TaskCreate`, `TaskUpdate`, `TaskRead`. Register routers in `main.py`.

## Frontend

- **`lib/tasks.ts`**: `Task` type, `useTasks()` (SWR on `/api/tasks`), `useTaskActions()` with optimistic `toggle` and `remove` plus rollback, and `invalidateTasks`.
- **`components/action-card.tsx`**: the existing Confirm/Cancel card and `PendingAction` type, extracted from `ask/page.tsx` and used by both Ask and the dialog.
- **`components/quick-capture.tsx`**: shadcn `Dialog` with one input and submit. Calls `/api/capture` with `text`, `now: new Date().toISOString()`, and `Intl.DateTimeFormat().resolvedOptions().timeZone`. Shows: task created with due date; note created with link to `/notes/[id]`; the action card (confirm via `/api/chat/confirm`); or the message. After a capture or confirmation, invalidates the tasks and notes caches.
- **`components/sidebar.tsx`**: add the Quick Capture button and a Tasks link.
- **`app/(app)/tasks/page.tsx`**: list with title, due date, done checkbox, delete button.
- Add `components/ui/dialog.tsx` via shadcn.

## Project Structure

```text
backend/{alembic/versions/0003_create_tasks.py, models.py, schemas.py, main.py, llm.py,
  repositories/tasks.py, services/{tasks,capture}.py, routes/{tasks,capture}.py}
frontend/{lib/tasks.ts, components/{action-card,quick-capture,sidebar}.tsx,
  components/ui/dialog.tsx, app/(app)/{tasks/page.tsx, ask/page.tsx}}
```
