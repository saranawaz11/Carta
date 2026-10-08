# Tasks: Quick Capture and Tasks

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md)
**Tests**: None (per constitution).

## Phase 1: Setup

- [X] T001 Add shadcn Dialog component in `frontend/components/ui/dialog.tsx`

## Phase 2: Foundational (blocks all stories)

- [X] T002 Add `Task` model in `backend/models.py` (id uuid pk, clerk_user_id text indexed, title text, due_at timestamptz null, due_has_time bool default false, completed_at timestamptz null, created_at timestamptz default now())
- [X] T003 Add Alembic migration `backend/alembic/versions/0003_create_tasks.py` creating `tasks` with an index on `clerk_user_id`
- [X] T004 [P] Add `TaskCreate`, `TaskUpdate`, `TaskRead` schemas in `backend/schemas.py`
- [X] T005 Implement `backend/repositories/tasks.py` (list open-first then by due date, get, create, set completed, delete; every query filtered by `clerk_user_id`)
- [X] T006 Implement `backend/services/tasks.py` wrapping the repository; missing or foreign task -> 404

## Phase 3: User Story 1 - Quick capture a statement (P1) ?? MVP

**Goal**: One statement becomes a task, a note, or a fallback note.
**Independent Test**: Capture "remind me to call the bank on Friday", "I parked on level 3", "asdf" -> task, note, note.

- [X] T007 [US1] Add `create_task(title, due_at?, due_has_time)` tool in `backend/llm.py`: user ID from graph config only, ISO 8601 validation (error text to model), calls `create_task` callable from config, add to shared tool list (Ask AI gets it too)
- [X] T008 [US1] Add `CAPTURE_PROMPT` (one statement, no conversation; task/note/propose_* rules; note fallback with original text; includes `now` and `timezone`) and `run_capture_graph(text, now, timezone, configurable)` in `backend/llm.py`, excluding `resolve_pending_action`
- [X] T009 [P] [US1] Add `CaptureRequest` (text 1-500 chars stripped, now ISO, timezone valid IANA name) and `CaptureResponse` in `backend/schemas.py`
- [X] T010 [US1] Implement `backend/services/capture.py`: embedding sync, callables (search, create note via notes service, get note, create task via tasks service), map graph result to outcome `task_created|note_created|pending_action|message`
- [X] T011 [US1] Add `POST /api/capture` in `backend/routes/capture.py`; register it in `backend/main.py`
- [X] T012 [P] [US1] Add `Task` type, `useTasks`, and `invalidateTasks` in `frontend/lib/tasks.ts`
- [X] T013 [US1] Build `frontend/components/quick-capture.tsx`: Dialog with one input and submit, call `/api/capture` via `apiFetch` with `now` (ISO) and `Intl` timezone, show task created (with due date), note created (link to `/notes/[id]`), or message; invalidate tasks and notes caches
- [X] T014 [US1] Add the Quick Capture button to `frontend/components/sidebar.tsx`

## Phase 4: User Story 2 - Note operations via capture (P2)

**Goal**: Edit/archive/delete proposed with Confirm/Cancel, executed only after confirm.
**Independent Test**: "delete my grocery note" -> card; nothing changes until Confirm; several/zero matches -> message.

- [X] T015 [US2] Extract the Confirm/Cancel card and `PendingAction` type from `frontend/app/(app)/ask/page.tsx` into `frontend/components/action-card.tsx` and use it in the Ask page
- [X] T016 [US2] In `frontend/components/quick-capture.tsx` render the action card for `pending_action`, confirm via `POST /api/chat/confirm`, show result, invalidate notes and tasks caches

## Phase 5: User Story 3 - Manage tasks (P3)

**Goal**: /tasks lists tasks; toggle done and delete.
**Independent Test**: Toggle and delete a task without page reload.

- [X] T017 [US3] Add `GET/POST /api/tasks`, `PATCH /api/tasks/{id}`, `DELETE /api/tasks/{id}` (204) in `backend/routes/tasks.py`; register in `backend/main.py`
- [X] T018 [US3] Add `useTaskActions` with optimistic `toggle` and `remove` plus rollback in `frontend/lib/tasks.ts`
- [X] T019 [US3] Create `frontend/app/(app)/tasks/page.tsx` (title, due date, done checkbox, delete button)
- [X] T020 [US3] Add the Tasks link to `frontend/components/sidebar.tsx`

## Phase 6: Polish

- [X] T021 Run `alembic upgrade head` and walk through [quickstart.md](./quickstart.md)

## Dependencies

- Phase 2 blocks everything. US1 needs T002-T006; US2 builds on US1's dialog (T013); US3 is independent of US1/US2 after Phase 2 (T018 extends T012).
- T007 -> T008 -> T010 -> T011; T013 needs T011 and T012.
- Parallel: T004 with T005; T009 and T012 with backend work.

## Strategy

MVP = Phases 1-3. Then US2, then US3.
