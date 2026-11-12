# Quickstart

## Prerequisites

- Existing backend and frontend environment variables are configured; backend has database access.
- Apply database changes with `cd backend; uv run alembic upgrade head`.
- Frontend packages updated: `cd frontend; npm install` to add Tiptap editor dependencies.
- Start the existing FastAPI and Next.js applications (`uv run fastapi dev` in `backend`; `npm run dev` in `frontend`).

## Scheduled Cleanup Setup

The implementation includes a one-shot cleanup command for expired tasks:

```bash
cd backend && uv run python scripts/cleanup_completed_tasks.py
```

This deletes tasks completed more than 7 days ago. To run cleanup automatically:

- **Linux/Unix (cron)**: Add to crontab:
  ```
  0 2 * * * cd /path/to/carta/backend && uv run python scripts/cleanup_completed_tasks.py
  ```

- **Windows (Task Scheduler)**: Create a task to run the command daily.

- **Cloud (AWS Lambda, Google Cloud Functions, Azure Functions)**: Deploy the command as a scheduled function.

Cleanup must run at least daily and independently from user traffic. Monitor job failure and surface errors operationally.

## Manual validation

1. **Mixed Capture**: Capture the Docker mixed-content example in [spec.md](spec.md). Verify one informational note and two separate tasks, with no informational sentence converted into a task.

2. **Task Date Interpretation**: Enter equivalent task text through Quick Capture and direct Tasks form. Verify refined titles/date interpretation match. Test: no date, tomorrow, coming/next weekday, mid-month, first week range, last week of December, next month, ambiguous and contradictory dates. Confirm no fabricated deadline.

3. **Task Deadlines**: Create a task without a deadline. Set date/time, edit them, remove them, reload `/tasks`, and verify values persist. Confirm manual values are not overwritten by later unrelated operations.

4. **Task Cleanup**: In a non-production test environment, complete a task and reopen it before expiry; confirm retention. Using controlled database timestamps, confirm completed tasks expire after seven days and unfinished tasks remain. Run the scheduled cleanup command twice to verify idempotence.

5. **Rich Note Editing**: Open a legacy plain-text note and apply formatting (bold, italic, headings, lists, blockquotes, links, code). Wait for autosave, reload, and confirm both formatting and readable text persist. Confirm search, summaries, and note AI continue to see readable text.

6. **Error Handling**: Submit ambiguous AI extraction cases (conflicting dates, unclear intent). Confirm validation errors are visible, no guessed task date is saved, and unsaved capture text remains available for user correction.

## Available checks

- `cd frontend; npm run lint`
- `cd frontend; npm run build`
- Backend: `cd backend; python -m py_compile models.py schemas.py llm.py services/ repositories/ routes/`

Project governance does not permit generated automated test files or testing tasks. Acceptance scenarios remain in the specification; see [contracts/api.md](contracts/api.md) for wire and persistence behavior.
