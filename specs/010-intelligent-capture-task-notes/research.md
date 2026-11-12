# Research

Repository-specific findings and decisions for [spec.md](spec.md).

## Architecture and AI

- **Decision**: Extend the existing FastAPI route → service → repository flow and keep model calls in `backend/llm.py`.
  **Rationale**: This is the established constitution and code pattern; task date resolution already accepts local `now` and IANA timezone.
  **Alternatives considered**: New provider or frontend AI/date parsing — rejected because they duplicate behavior and violate the backend-only LLM boundary.
- **Decision**: Use a validated structured capture extraction with optional informational content and multiple task candidates, then run each task through shared title/date interpretation before saving.
  **Rationale**: Current capture reports one task or one note; the required mixed and multi-task output cannot be represented by that result shape.
  **Alternatives considered**: Repeated free-form agent tool calls — rejected because partial writes and malformed outputs are harder to validate consistently.
- **Decision**: Keep the existing note CRUD proposal/confirmation path intact and add structured extraction only for new capture content.
  **Rationale**: Existing changes to notes require explicit user confirmation.
  **Alternatives considered**: Replacing the complete capture graph — rejected as unnecessary behavioral risk.

## Task Dates and Cleanup

- **Decision**: Retain `due_at` as the start/single date and add nullable `due_end_at` for an inclusive range; date-only endpoints use the user's local date consistently, while timed tasks remain single instants.
  **Rationale**: The selected behavior requires preserving full ranges while keeping existing single-date clients compatible.
  **Alternatives considered**: Collapse ranges to a date or change all task date fields — rejected because that loses selected intent or requires broader migration.
- **Decision**: Add an idempotent cleanup service/command that deletes tasks with `completed_at <= now_utc - 7 days`; invoke it from the deployment's periodic scheduler.
  **Rationale**: Existing data already records completion time, and the repository has no scheduler, worker, lifecycle job, or deployment configuration.
  **Alternatives considered**: Run cleanup on list requests or start a web-process timer — rejected because the user may not visit and process restarts/multiple instances make timing unreliable.
- **Operational boundary**: Repository review did not identify a deployment provider. Bind the one-shot command to the chosen host's native scheduled-job mechanism at deployment; run at least daily and alert on job failure. Do not introduce a provider-specific workflow without provider evidence.

## Rich Note Content

- **Decision**: Add nullable JSONB Tiptap document content and retain the existing plain `content` text as the canonical projection for current consumers.
  **Rationale**: Current search, embeddings, summaries, note hashes, and AI tools all consume readable text. This enables additive migration and legacy compatibility.
  **Alternatives considered**: Store HTML in `content` or replace it with editor JSON — rejected because text-based consumers would index/render markup and legacy clients would break.
- **Decision**: Save the editor document and derived plain-text projection together; validate document shape, and use the plain projection for existing hash/embedding/summary flows.
  **Rationale**: One update preserves rich formatting and makes existing search and AI features coherent.
  **Alternatives considered**: Update only the rich payload — rejected because search, embeddings, and note summaries would become stale or lose readable text.
- **Decision**: Keep legacy notes with a null rich document readable as plain text; convert to an editor document on first edit.
  **Rationale**: No bulk content migration is needed and existing text is preserved.
  **Alternatives considered**: Mandatory backfill — rejected because it adds migration risk without user value.

## Validation and Scope

- **Decision**: Keep the user-requested acceptance scenarios in the spec and provide a manual end-to-end quickstart; use existing frontend lint/build commands.
  **Rationale**: The project constitution disallows generated test files, testing tasks, and a testing section; the planning workflow requires a runnable quickstart guide.
  **Alternatives considered**: Adding a new test framework or test suite — rejected by project governance.
- **Decision**: Add Tiptap packages only for requested editor capabilities and reuse existing page, autosave, SWR, and API patterns.
  **Rationale**: The frontend currently has no Tiptap dependency and individual notes use a textarea with an 800 ms autosave.
  **Alternatives considered**: Replacing the note page or changing unrelated note workflows — rejected as out of scope.
