# Quickstart: AI Task Date Parsing

## Prerequisites

- Start the backend and frontend using the repository's existing development setup.
- Sign in so task and capture requests use the existing Clerk authentication.
- Verify the browser timezone is the intended IANA timezone.

## Manual validation

1. On the Tasks page, add `Renew pass next month`. With the local date set to November 10, 2026, expect title `Renew pass` and due date December 31, 2026.
2. Add `Finish reading last week of December`. With the same local date, expect due date December 31, 2026.
3. Add a task with an explicit date and one with a stated date and time; verify the title omits the date phrase and only the stated time is retained.
4. Add a task without a date; verify it remains undated.
5. Add a task with an ambiguous or invalid date expression; verify a visible explanation appears and no task is added.
6. Submit equivalent reminders through Quick Capture and compare their title and due date with direct task entry.
7. Submit a note and a note-operation request through Quick Capture; verify their existing behavior remains unchanged.
8. Verify created tasks are visible only to the signed-in user and existing duplicate handling still applies.

See [the task contract](./contracts/tasks.md) and [the data model](./data-model.md).
