# Research: AI Task Date Parsing

## Existing Project Findings

- Quick-add currently parses dates in `frontend/lib/parsequickadd.ts` with `chrono-node`; it defaults undated tasks to today.
- The task page calls that parser before `POST /api/tasks`; the task API currently accepts a title and optional already-resolved `due_at`.
- Quick Capture already sends browser `now` and IANA timezone. Its LangGraph agent already creates tasks, but date rules are prompt-based and do not define period-only phrases.
- `backend/llm.py` owns existing LangGraph and structured-output patterns. `services/capture.py` and `services/tasks.py` already route task creation through shared services.
- The Task model already stores nullable timezone-aware `due_at` and `due_has_time`; no schema change is necessary.
- The project constitution requires backend-only LLM calls, route/service/data-access separation, minimal dependencies, and no test files or testing tasks.

## Decisions

### Shared Date Interpretation

- **Decision**: Add one backend LangGraph-based date resolver that accepts raw task text plus the user's local current date/time and timezone. Use it for direct quick-add and task creation selected by Quick Capture.
- **Rationale**: Both entry points need identical title cleanup, relative-date handling, period boundaries, and confidence behavior; frontend heuristics cannot provide that consistency.
- **Alternatives considered**: Keep separate parsing paths (inconsistent results); add a date library (does not satisfy the requested agent-based interpretation); parse every capture statement (unnecessary for notes and note operations).

### Task Persistence and Error Handling

- **Decision**: Validate the resolver's structured result, then persist through the existing task service. Return a visible unresolved-date response without creating a task when a stated date cannot be resolved confidently.
- **Rationale**: Keeps duplicate detection, ownership, and database behavior in the existing service and prevents unsupported dates from being silently guessed.
- **Alternatives considered**: Let the model create database records (violates backend layering); default uncertain input to today or an arbitrary date (incorrect and inconsistent).

### Date Context and Existing Contract

- **Decision**: Send browser `now` and timezone for natural-language task requests; preserve the existing Task response and nullable due-date fields. Keep already-normalized task creation paths working.
- **Rationale**: Relative dates depend on the user's locale, and the existing model already stores the result.
- **Alternatives considered**: Use server-local time (wrong near timezone boundaries); migrate the task table (unnecessary); break the existing request shape (unnecessary compatibility risk).

### Validation

- **Decision**: Provide UI-driven, end-to-end manual scenarios in `quickstart.md`; do not add automated test files or test tasks.
- **Rationale**: This follows the repository constitution.
- **Alternatives considered**: Add automated tests (explicitly disallowed by the project constitution).
