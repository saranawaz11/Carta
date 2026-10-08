# Feature Specification: Quick Capture and Tasks

**Created**: 2026-10-08
**Status**: Draft
**Input**: Quick Capture dialog in the sidebar where one free-text statement is routed by the agent to a task, a note, or a confirmed note operation; plus a Tasks page.

## User Scenarios

### User Story 1 - Quick capture a statement (Priority: P1)

From the sidebar, the user opens Quick Capture, types one statement, and submits. The agent decides the outcome and the dialog shows it.

**Independent Test**: Submit "remind me to call the bank on Friday", "I parked on level 3", and "asdf"; see a task, a note, and a note respectively.

**Acceptance Scenarios**:

1. **Given** a reminder/to-do statement, **When** submitted, **Then** a task is created with the understood due date and the dialog shows "task created".
2. **Given** something to remember, **When** submitted, **Then** a note is created and the dialog shows it with a link.
3. **Given** unclear intent, **When** submitted, **Then** the statement is saved as a note.
4. **Given** relative dates ("tomorrow", "next Friday"), **When** submitted, **Then** they resolve using the current date and timezone sent by the browser.

---

### User Story 2 - Note operations via capture (Priority: P2)

The user asks to edit, archive, or delete an existing note.

**Independent Test**: Submit "delete my grocery note"; a Confirm/Cancel card appears and nothing changes until Confirm.

**Acceptance Scenarios**:

1. **Given** a request matching exactly one of the user's notes, **When** submitted, **Then** the dialog shows the same Confirm/Cancel card as Ask AI and executes only after Confirm.
2. **Given** Cancel, **Then** nothing is changed.
3. **Given** zero or multiple matching notes, **When** submitted, **Then** the agent says it cannot match exactly one note and changes nothing.

---

### User Story 3 - Manage tasks (Priority: P3)

A Tasks sidebar link opens /tasks, listing the user's tasks (title, optional due date). The user can mark a task done or not done, and delete it.

**Independent Test**: Create a task, toggle done and back, delete it.

**Acceptance Scenarios**:

1. **Given** tasks exist, **When** the user opens /tasks, **Then** only their own tasks show.
2. **Given** a task, **When** toggled or deleted, **Then** the list updates without a full page reload.

### Edge Cases

- Empty or whitespace-only statement is rejected without calling the agent.
- Agent/LLM failure shows an error and still saves nothing silently lost (the statement is not discarded without notice).
- Reminder with no stated date creates a task with no due date.
- Accessing another user's task is treated as not found.

## Requirements

### Functional Requirements

- **FR-001**: Sidebar MUST have a Quick Capture button opening a dialog with one text input and submit.
- **FR-002**: Sidebar MUST have a Tasks link to /tasks.
- **FR-003**: The agent MUST classify each statement as task, new note, note edit/archive/delete, or unclear (saved as a note).
- **FR-004**: Tasks MUST have a title, optional due date, and done state, and be owned by the Clerk user ID with the same ownership rules as notes.
- **FR-005**: Browser MUST send current date and timezone with each capture; relative dates resolve against them.
- **FR-006**: Edit/archive/delete MUST be proposed with Confirm/Cancel and executed only after confirmation.
- **FR-007**: If the request does not match exactly one existing note, the agent MUST say so and not guess.
- **FR-008**: Note operations MUST reuse the existing notes service.
- **FR-009**: The dialog MUST show the outcome: task created, note created with link, or confirmation card.
- **FR-010**: Users MUST be able to mark tasks done/not done and delete them; no other task editing.
- **FR-011**: Task and note lists MUST update without a full page reload.
- **FR-012**: Tasks MUST be stored in Neon PostgreSQL via an Alembic migration.
- **FR-013**: All LLM calls MUST stay in the backend.

### Key Entities

- **Task**: title, optional due date, done state, owner (Clerk user ID).
- **Note**: existing entity; may be created or changed via capture.

## Success Criteria

- **SC-001**: A user can capture a reminder, note, or note operation request in under 15 seconds.
- **SC-002**: Every submitted statement ends in a visible outcome (task, note, confirmation, or no-match message); none is lost.
- **SC-003**: No note is edited, archived, or deleted without explicit confirmation.
- **SC-004**: Task changes appear in the list within 1 second without page reload.

## Assumptions

- Auth, notes CRUD, Ask AI, and LLM note operations are complete and reused.
- Out of scope: notifications/sending reminders, recurring tasks, task editing beyond done/delete, summaries and deadlines, styling.
- Due date is a date (no time of day).
