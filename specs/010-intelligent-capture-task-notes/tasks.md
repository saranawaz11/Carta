---
description: "Implementation tasks for intelligent capture, task management, and rich notes"
---

# Tasks: Intelligent Capture, Task Management, and Rich Notes

**Input**: Design documents in `specs/010-intelligent-capture-task-notes/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`

**Organization**: Tasks are grouped by the four independently deliverable user stories. No automated test-file or testing tasks are included, per project constitution.

## Phase 1: Setup

**Purpose**: Project initialization and basic structure.

No setup tasks are required; the existing backend, frontend, database migration chain, and API structure are already initialized. Feature-specific dependencies are included with the rich-note story.

## Phase 2: Foundational

**Purpose**: Shared persisted fields and API response types required across the user stories.

- [X] T001 Add `backend/alembic/versions/0006_intelligent_capture_task_notes.py` as an additive migration for nullable `notes.content_rich` JSONB and nullable `tasks.due_end_at` timezone-aware timestamp and `tasks.source_text` text; do not rewrite or backfill existing note content.
- [X] T002 [P] Map `Note.content_rich`, `Task.due_end_at`, and `Task.source_text` in `backend/models.py`; date ranges MUST be date-only, end date MUST NOT precede start date, and timed tasks MUST NOT have an end date.
- [X] T003 [P] Extend `NoteOut` and `TaskOut` with `content_rich`, `due_end_at`, and `source_text` in `backend/schemas.py`, preserving compatibility for existing records with null new fields.
- [X] T004 Add `due_end_at` and `source_text` to the frontend `Task` type in `frontend/lib/tasks.ts`; retain the existing nullable `due_at`, `due_has_time`, and `completed_at` fields.

**Checkpoint**: Additive storage and shared response types are available. User stories can proceed subject to the dependencies below.

## Phase 3: User Story 1 - Capture mixed thoughts accurately (Priority: P1)

**Goal**: Turn a capture into optional informational note content and multiple independently actionable tasks, with consistent title/date interpretation and safe user feedback.

**Independent Test**: Submit note-only, task-only, mixed, and multiple-action text. Verify the note and every intended task are present, informational content is not a task, task titles retain meaning, and ambiguous dates do not produce guessed deadlines.

### Implementation

- [X] T005 [P] [US1] Define validated structured capture extraction and task-candidate schemas in `backend/schemas.py`, including optional note content, multiple tasks, source phrases, and explicit clarification/error results.
- [X] T006 [US1] Implement structured classification and task-title refinement in `backend/llm.py`; preserve informational text and meaningful action context, and do not invent deadlines or task intents.
- [X] T007 [US1] Refactor shared task interpretation in `backend/services/tasks.py` to use the validated candidate shape for both capture and direct entry; preserve local timezone rules, undated tasks, inclusive ranges, title text, and original `source_text`.
- [X] T008 [US1] Update `backend/services/capture.py` to validate the complete extraction before persistence, create its optional note and multiple tasks through existing services, preserve note-operation confirmation, and report any partial persistence explicitly.
- [X] T009 [US1] Extend `CaptureResponse` in `backend/schemas.py` with the `capture_created` outcome containing `note: NoteOut | null` and `tasks: list[TaskOut]`, while retaining existing outcomes and response fields.
- [X] T010 [US1] Wire `POST /api/capture` in `backend/routes/capture.py` to the expanded response contract without moving business logic into the route.
- [ ] T011 [P] [US1] Update capture result types and rendering in `frontend/components/quick-capture.tsx` to show the optional note, all created tasks, deadline ranges, clarification messages, and partial failures while retaining submitted text when processing fails.

**Checkpoint**: Quick Capture can create a mixed note/task result, multiple tasks, or an actionable clarification without false success.

## Phase 4: User Story 2 - Manage task deadlines (Priority: P1)

**Goal**: Allow users to create undated tasks and add, edit, or remove date and time after creation.

**Independent Test**: Create a task with no deadline, add a date and time, change them, clear them, and reload `/tasks`; verify each state persists and is displayed consistently.

**Dependencies**: Depends on Phase 2 and T007's shared task interpretation behavior from US1.

### Implementation

- [X] T012 [P] [US2] Extend `TaskCreate` and `TaskUpdate` in `backend/schemas.py` so omitted deadline fields remain unchanged, explicit `due_at: null` clears `due_at`, `due_end_at`, and `due_has_time`, date ranges are date-only, and range end is not before range start.
- [X] T013 [US2] Add task deadline update operations in `backend/repositories/tasks.py`, keeping task lookup and mutation scoped by `clerk_user_id` and leaving completion changes intact.
- [X] T014 [US2] Implement deadline creation/update validation and manual-date precedence in `backend/services/tasks.py`; explicit user-selected dates replace extracted values, and no-deadline tasks remain undated.
- [X] T015 [US2] Wire deadline fields through `PATCH /api/tasks/{task_id}` in `backend/routes/tasks.py`, preserving existing completion updates and 404 behavior for tasks outside the authenticated user's ownership.
- [X] T016 [US2] Extend task request and mutation helpers in `frontend/lib/tasks.ts` to send and cache date, optional time, range, and explicit-clear changes without losing existing optimistic completion behavior.
- [ ] T017 [US2] Add date/time controls for task creation and existing-task editing in `frontend/app/(app)/tasks/page.tsx`, supporting empty values, date-only ranges, saving, removal, and visible failures using the existing page design.

**Checkpoint**: Manual deadline changes persist, display after reload, and take precedence over AI-interpreted values.

## Phase 5: User Story 3 - Keep completed tasks only for the retention period (Priority: P2)

**Goal**: Keep completed tasks recoverable for seven days, then automatically remove them without affecting unfinished or reopened tasks.

**Independent Test**: Complete a task, verify it remains within seven days, then run cleanup with controlled timestamps and verify only expired completed tasks are removed. Reopen another task before expiry and verify it remains.

**Dependencies**: Depends on Phase 2 task model and migration. Independent of US1, US2, and US4.

### Implementation

- [X] T018 [P] [US3] Add an idempotent expiry query in `backend/repositories/tasks.py` that deletes only rows with `completed_at <= now_utc - 7 days`; never select by `created_at` and exclude tasks whose completion timestamp has been cleared.
- [X] T019 [US3] Implement a cleanup service in `backend/services/task_cleanup.py` that uses UTC, invokes the repository expiry query, and returns a count for operational reporting.
- [X] T020 [US3] Add a one-shot command in `backend/scripts/cleanup_completed_tasks.py` that opens and closes a database session, runs the shared cleanup service, and exits nonzero with a visible error if cleanup fails.
- [X] T021 [P] [US3] Document the command invocation and requirement for a daily deployment-native scheduled run in `specs/010-intelligent-capture-task-notes/quickstart.md`; state that cleanup must not depend on user traffic and that scheduler failure needs operational visibility.

**Checkpoint**: The same cleanup command can be run repeatedly and removes only tasks past the completion-based retention cutoff.

## Phase 6: User Story 4 - Format individual notes (Priority: P2)

**Goal**: Add rich editing to individual notes while preserving readable plain-text content for search, embeddings, summaries, and existing AI operations.

**Independent Test**: Open a legacy plain-text note, apply every specified format, wait for autosave, reload, and verify formatting and readable text persist. Confirm no write occurs without an edit.

**Dependencies**: Depends on Phase 2 note model and migration. Independent of US1, US2, and US3.

### Implementation

- [X] T022 [P] [US4] Add the required Tiptap editor, StarterKit, underline, and link packages to `frontend/package.json` and update `frontend/package-lock.json` with the package manager.
- [X] T023 [P] [US4] Add conversion helpers in `frontend/lib/rich-notes.ts` to initialize editor JSON from legacy plain text and derive a deterministic readable-text projection from the editor document.
- [X] T024 [US4] Add an accessible formatting toolbar and Tiptap editor in `frontend/components/rich-note-editor.tsx` supporting bold, italic, underline, strikethrough, headings 1–3, bullet and numbered lists, blockquotes, inline code, code blocks, safe hyperlinks, undo, and redo.
- [X] T025 [P] [US4] Extend note API types and update payloads in `frontend/lib/notes.ts` to carry `content_rich` alongside plain `content`, retaining existing SWR cache behavior.
- [ ] T026 [US4] Integrate the rich editor into `frontend/app/(app)/notes/[id]/page.tsx`, preserving the existing layout, title editor, voice insertion where feasible, 800 ms autosave, save status, and unsaved content on errors.
- [ ] T027 [US4] After T009 and T012, validate and persist `content_rich` plus its plain-text `content` projection atomically in `backend/schemas.py` and `backend/services/notes.py`; a legacy update containing only `content` MUST set `content_rich` to null, raw HTML MUST NOT be accepted, and existing search/hash/embedding/summary/AI consumers MUST continue using readable `content`.

**Checkpoint**: New and legacy notes are readable in the same individual-note editor, and existing plain-text consumers continue to receive readable text.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Align generated interface and validation documentation with the implemented behavior.

- [ ] T028 [P] Reconcile response field names, explicit-null semantics, safe link rules, and date-range representations in `specs/010-intelligent-capture-task-notes/contracts/api.md` with the implemented schemas.
- [X] T029 Update `specs/010-intelligent-capture-task-notes/quickstart.md` with final manual acceptance steps, available lint/build commands, and links to `specs/010-intelligent-capture-task-notes/contracts/api.md`; do not add automated test files or testing tasks.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No work required; repository projects already exist.
- **Foundational (Phase 2)**: Starts immediately and blocks all user stories because they share schema fields and API output types.
- **US1 (Phase 3)**: Starts after Phase 2; establishes the shared task interpretation needed by US2.
- **US2 (Phase 4)**: Starts after Phase 2 and T007 in US1.
- **US3 (Phase 5)**: Starts after Phase 2; independent of US1, US2, and US4.
- **US4 (Phase 6)**: Starts after Phase 2; independent of US1, US2, and US3.
- **Polish (Phase 7)**: Starts after the stories whose behavior is being documented.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; independent deliverable and suggested MVP.
- **US2 (P1)**: Requires T007's shared title/date interpretation from US1; otherwise independent.
- **US3 (P2)**: Independent after Phase 2; operates on the completion timestamp already present in the task model.
- **US4 (P2)**: Frontend editor work can start after Phase 2. Its backend schema work (T027) follows T009 and T012 because those stories also update `backend/schemas.py`; the story retains readable plain-text consumers.

### Within Each User Story

- Complete the backend contract and persistence path before wiring its UI.
- Tasks marked `[P]` touch separate files and can proceed concurrently after their stated prerequisites.
- Do not add automated test files or testing tasks; use each story's independent acceptance criterion and the manual validation guide.

## Parallel Execution Examples

### User Story 1

After foundational tasks complete, T005 (schemas) and frontend T011 (result rendering against the contract) can proceed in parallel. T006 follows T005 because it consumes the capture schema; T009 and T006 can then proceed in parallel, followed by service/route integration.

### User Story 2

T012 (request validation) and T016 (frontend task action helpers) can proceed in parallel after the US1 shared interpretation dependency is met. T013 repository work can also proceed independently of frontend work; T014 and T015 follow the backend dependency chain.

### User Story 3

T018 (expiry query) can proceed independently from T021 (quickstart scheduler documentation). T019 follows T018, then T020 follows T019.

### User Story 4

After Phase 2, T022 (package manifest), T023 (conversion helper), and T025 (frontend API types) can proceed in parallel. T024 follows T022; T026 follows T024 and T025. T027 follows the schema changes in T009 and T012; backend projection consumers remain compatible through canonical `content`.

## Implementation Strategy

1. Complete Phase 2 and then implement US1 as the MVP, verifying mixed and multi-task capture behavior against its independent criterion.
2. Implement US2 after the shared task interpretation is available; US3 and US4 can proceed independently after Phase 2.
3. Implement and operationally schedule the cleanup command using the actual deployment's native scheduler; the repository contains no provider-specific deployment configuration.
4. Finish with the cross-cutting contract and quickstart reconciliation in Phase 7.
