# Feature Specification: Real Note Summaries

**Feature Branch**: `006-note-summaries`
**Created**: 2026-10-13
**Status**: Draft
**Input**: Replace the static placeholder data in the Summary panel on a note page with real, saved summaries including deadlines and connected notes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Summarize a note (Priority: P1)

On a note page, the user presses Summarize and sees an overview, key points, deadlines, and up to 3 connected notes and if not linked completley hide the connected notes part. The result is saved; reopening the note shows it without regenerating.

**Why this priority**: Core value; replaces the "Sample data" placeholder.

**Independent Test**: Summarize a note, reload, and confirm the same summary appears with no regeneration.

**Acceptance Scenarios**:

1. **Given** a note with content and no summary, **When** the user presses Summarize, **Then** the panel shows overview, key points, deadlines, and connected notes, and the "Sample data" badge is gone.
2. **Given** a saved summary, **When** the note is reopened, **Then** the saved summary is shown and no new generation happens.
3. **Given** a saved summary, **When** the user presses Regenerate, **Then** the saved result is replaced by the new one.
4. **Given** an empty note, **Then** the button is disabled.
5. **Given** a note edited after its summary was generated, **Then** a small stale hint is shown.

---

### User Story 2 - Deadlines to tasks (Priority: P2)

In a Deadlines section (between Key points and Connected notes), each deadline can be added to tasks or removed from the list.

**Why this priority**: Turns summary output into action.

**Independent Test**: Add a deadline, see it on the Tasks page linked to the note, and see it marked "already added".

**Acceptance Scenarios**:

1. **Given** a deadline, **When** the user presses Add to tasks, **Then** a task with that title and due date, linked back to the note, appears on the Tasks page without a full reload.
2. **Given** a deadline whose task already exists, **Then** it shows as already added and no duplicate is created.
3. **Given** a deadline, **When** the user presses Remove, **Then** it disappears from the list.
4. **Given** removed deadlines, **When** the summary is regenerated, **Then** they may reappear (accepted).

---

### User Story 3 - Connected notes (Priority: P3)

Each connected note shows a one-line reason and links to its own note page.

**Independent Test**: Click a connected note and land on its page.

**Acceptance Scenarios**:

1. **Given** a summary, **Then** up to 3 connected notes are shown, chosen from the user's most similar other notes, never the note itself, archived, or deleted notes.
2. **Given** a connected note deleted since generation, **Then** it is not shown.

### Edge Cases

- Note text has no dates: Deadlines section is empty.
- A deadline states no time: only the date is stored/shown.
- Relative dates ("next Friday") resolve using the current date and timezone sent by the browser.
- Fewer than 3 similar notes exist: show fewer.
- Generation fails: the panel shows an error and any existing saved summary is kept.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Summary panel MUST show Summarize (Regenerate when a summary exists), disabled for empty notes, keeping existing UI and styling.
- **FR-002**: A summary MUST contain an overview, a short list of key points, deadlines (title, date, time only if stated in the note), and up to 3 connected notes each with a one-line reason.
- **FR-003**: Relative dates MUST be resolved with the current date and timezone sent by the browser.
- **FR-004**: Connected notes MUST be the user's most similar other notes, excluding the note itself, archived, and deleted notes.
- **FR-005**: The summary MUST be saved; only Summarize/Regenerate may call the LLM, and regenerating replaces the saved result.
- **FR-006**: The panel MUST show a stale hint when the note changed after generation.
- **FR-007**: Add to tasks MUST create a task linked to the note; Remove MUST drop the deadline from the list.
- **FR-008**: A task MUST NOT be created if one exists with the same user, same title (case-insensitive, trimmed), and same due date. This applies to Add to tasks, quick capture, and Ask AI chat. Deadlines with an existing task show as already added.
- **FR-009**: Each connected note MUST link to its note page; deleted notes MUST be hidden.
- **FR-010**: The saved summary MUST be deleted when its note is deleted.
- **FR-011**: All data MUST be scoped to the signed-in user; LLM calls MUST stay in the backend.
- **FR-012**: The panel and Tasks page MUST update without a full page reload.

### Key Entities

- **Summary**: One saved result per note: overview, key points, deadlines, connected notes, generation time.
- **Task**: Existing entity; gains a link back to its source note.

## Success Criteria *(mandatory)*

- **SC-001**: Users get a complete summary within 15 seconds of pressing Summarize.
- **SC-002**: Reopening a summarized note shows the summary with no generation.
- **SC-003**: Zero duplicate tasks (same user, title, due date) across all creation paths.
- **SC-004**: A deadline can be on the Tasks page in one click, with no page reload.

## Assumptions

- Out of scope: automatic summarizing, summary history, tags, provenance panel data, styling changes.
- Similarity uses the existing note search capability.
- Removing a deadline is stored with the summary; regeneration may restore it.
- Tasks without a due date are compared on title alone.
