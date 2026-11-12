# Tasks: AI Task Date Parsing

**Input**: Design documents from `specs/009-ai-task-dates/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/tasks.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story; use the documented manual scenarios to verify each completed increment.

## Phase 1: Setup

**Purpose**: No setup is required; the feature uses existing backend dependencies, task storage, and application structure.

## Phase 2: Foundational

**Purpose**: Define the shared request and result contracts used by both task-entry flows.

- [X] T001 Add validated natural-language date request context and resolution result schemas, including cleaned title, optional due date, stated-time flag, and unresolved-date outcome, in `backend/schemas.py`

## Phase 3: User Story 1 - Add a task with a natural-language date (Priority: P1) 🎯 MVP

**Goal**: Resolve dates and remove date phrases when a user adds a task directly.

**Independent Test**: From the Tasks page, add an explicit date, “coming Saturday,” “next month,” “last week of December,” a time-bearing date, an undated task, and an unclear date. Verify title cleanup, local due date/time, no invented due date, visible ambiguity handling, and no task creation for unresolved input.

### Implementation

- [X] T002 [US1] Implement the shared LangGraph date interpreter with validated structured output and period-boundary rules in `backend/llm.py`
- [X] T003 [US1] Resolve natural-language task requests before persistence and pass only validated title/date values to the existing creation service in `backend/services/tasks.py`
- [X] T004 [US1] Integrate the natural-language request and explicit unresolved-date response in `backend/routes/tasks.py`
- [X] T005 [US1] Update task creation to accept raw text and send browser current datetime and IANA timezone in `frontend/lib/tasks.ts`
- [X] T006 [US1] Submit quick-add text without client-side parsing, display unresolved-date errors, and remove date-parser usage in `frontend/app/(app)/tasks/page.tsx`
- [X] T007 [US1] Remove the obsolete `chrono-node` parser and dependency from `frontend/lib/parsequickadd.ts`, `frontend/package.json`, and `frontend/package-lock.json`

**Checkpoint**: Direct task entry produces accurate cleaned titles and optional dates without defaulting undated tasks to today.

## Phase 4: User Story 2 - Capture a reminder with a natural-language date (Priority: P2)

**Goal**: Make task captures use the same validated date rules as direct task entry without changing note or note-operation behavior.

**Independent Test**: Submit equivalent explicit, relative, period-only, time-bearing, undated, and unresolved reminder text through Quick Capture and compare title/date outcomes with direct task entry. Also submit note and note-operation requests and verify their existing outcomes remain unchanged.

### Implementation

- [X] T008 [US2] Update the capture task prompt and tool handling to require the shared date rules and surface unresolved dates without creating tasks in `backend/llm.py`
- [X] T009 [US2] Route task creation selected by Quick Capture through the shared date interpreter using request `now` and `timezone`, and return an unresolved-date message without persistence in `backend/services/capture.py`

**Checkpoint**: Quick Capture and direct entry follow the same date, title, and ambiguity rules; note capture remains unchanged.

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No prerequisites or setup work.
- **Foundational (Phase 2)**: Establishes the request/result schema required by both stories.
- **User Story 1 (Phase 3)**: Depends on the foundational schema; delivers direct task entry as the MVP.
- **User Story 2 (Phase 4)**: Depends on the shared resolver and task creation path delivered in User Story 1.

### User story completion order

1. **US1 (P1)** — direct task quick-add dates; MVP.
2. **US2 (P2)** — consistent Quick Capture reminder dates.

### Parallel execution examples

- After T001, **T005** (frontend request helper) can proceed independently from **T002–T004** (backend resolver and endpoint) once the API contract in `specs/009-ai-task-dates/contracts/tasks.md` is followed. **T006** depends on T005.
- In US2, **T008** and **T009** touch separate files and can proceed in parallel after the US1 resolver contract is implemented.

## Implementation Strategy

1. Deliver **US1 first**: direct task entry resolves dates on the backend, supports undated tasks, and surfaces ambiguous dates without saving.
2. Deliver **US2** by reusing the same resolver for task-intent capture while preserving note and note-operation outcomes.
3. Use `specs/009-ai-task-dates/quickstart.md` for manual validation. Keep persistence, duplicate detection, and ownership in existing backend services.
