# Feature Specification: Intelligent Capture, Task Management, and Rich Notes

**Feature Branch**: `Not created (no before_specify hook is configured)`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Improve intelligent Quick Capture classification and task management, and add rich-text formatting to individual notes."

## Problem Statement

Quick Capture can misclassify informational text and actionable items, task titles and natural-language dates are not consistently interpreted, and tasks do not provide complete deadline editing or retention behavior. Individual notes also lack formatting controls. Users need to capture mixed thoughts without losing context, manage deadlines consistently, clear completed tasks after a predictable period, and format notes without making existing content inaccessible.

## Existing System Context (Repository Review)

- The application has distinct browser and server responsibilities; the server owns persistence, authorization, and AI-assisted operations.
- Quick Capture currently returns one result per submission. Direct task entry and Quick Capture already share date resolution, but their capture classification and task-title behavior do not provide the requested consistent treatment of mixed inputs.
- Tasks already have an optional due date, a flag distinguishing date-only from timed deadlines, and a completion timestamp. Task updates currently change completion state, not deadlines.
- Notes currently store plain-text content. The individual note editor auto-saves after a short pause; existing plain-text notes and this save behavior must remain usable.
- No deployment scheduler or scheduled-job configuration was found in the reviewed project files. The cleanup mechanism must therefore be selected against the actual deployment environment during planning.
- The repository uses LangGraph and OpenAI for server-side AI, not LlamaNode. Quick Capture uses an AI graph to classify an input, and direct task entry and Quick Capture already share backend date resolution. This specification preserves the existing AI boundary and does not require replacing the provider.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture mixed thoughts accurately (Priority: P1)

As a user, I want one capture to preserve useful information and create a separate task for each real action, so I can record a thought without losing context or turning every sentence into a task.

**Why this priority**: Quick Capture is the central entry point and currently loses meaning when a statement contains both information and actions.

**Independent Test**: Submit note-only, task-only, mixed, and multi-action statements; verify the saved notes and tasks retain the intended meaning and are individually available.

**Acceptance Scenarios**:

1. **Given** the user submits "I am learning Docker. Images contain application code and dependencies. I need to deploy my Next.js application to AWS by Friday. I should also research Docker networking.", **When** capture completes, **Then** informational Docker content is saved in a note and two separate tasks are created for deploying the application and researching Docker networking.
2. **Given** the user submits a task-only statement with conversational wording, **When** capture completes, **Then** only the intended task is created, with a concise action-oriented title that preserves the user's meaning.
3. **Given** the user submits "I have a wedding next week.", **When** capture completes, **Then** the task title is "Attend wedding" and the phrase "next week" is not converted into an invented exact deadline.
4. **Given** a statement contains multiple independent actions, **When** capture completes, **Then** each action is represented as its own task and the informational context is retained separately when present.
5. **Given** the AI response is malformed, incomplete, or cannot be safely interpreted, **When** capture is submitted, **Then** no misleading partial result is presented as success, the original text remains available, and the user receives an actionable error.
6. **Given** a capture includes an ambiguous date, **When** the task is created, **Then** no date is guessed, the task remains undated, and the user is asked to clarify the date.

### User Story 2 - Manage task deadlines (Priority: P1)

As a user, I want to set, change, and remove a task's due date and time, so that deadlines reflect my intent and remain consistent wherever I work with tasks.

**Why this priority**: Users need reliable deadline control for both manually entered tasks and tasks produced by Quick Capture.

**Independent Test**: Create a task with no deadline, add or change a date and time, remove them, and verify each saved state remains correct after leaving and returning to the Tasks page.

**Acceptance Scenarios**:

1. **Given** a user manually creates a task, **When** they leave date and time empty, **Then** the task remains undated.
2. **Given** a task has no deadline, **When** the user sets a date and optionally a time, **Then** the saved task displays the selected deadline consistently.
3. **Given** a task has a deadline, **When** the user changes or removes its date or time, **Then** the saved task reflects that change and no unrelated AI operation restores the old values.
4. **Given** a user enters the same task through Quick Capture or direct task entry with the same date context, **When** each is interpreted, **Then** title refinement, date interpretation, and no-deadline behavior follow the same rules.
5. **Given** the user specifies no deadline, **When** the task is saved, **Then** creation time, priority, or other context does not cause a due date to be assigned.

### User Story 3 - Keep completed tasks only for the retention period (Priority: P2)

As a user, I want completed tasks to remain available for seven days and then be removed automatically, so that completed work is temporarily recoverable without accumulating indefinitely.

**Why this priority**: A bounded retention period keeps the completed list useful while allowing recovery shortly after completion.

**Independent Test**: Complete tasks at controlled times, verify they remain available during the seven-day period, and verify only expired completed tasks are removed without requiring the user to open the application.

**Acceptance Scenarios**:

1. **Given** a task is marked complete, **When** the completion is saved, **Then** its completion time is recorded.
2. **Given** a task was completed less than seven days ago, **When** tasks are listed, **Then** it remains available and can be marked incomplete.
3. **Given** a task has been completed for at least seven days, **When** scheduled cleanup runs, **Then** it is removed from active task records.
4. **Given** an unfinished task has an old creation date, **When** cleanup runs, **Then** it is not removed.
5. **Given** a completed task is marked incomplete before expiry, **When** cleanup runs, **Then** it is retained as an unfinished task.

### User Story 4 - Format individual notes (Priority: P2)

As a user, I want to format text in an individual note, so that structured notes remain readable and useful after saving.

**Why this priority**: Formatting improves the usability of notes without changing the existing note-taking workflow.

**Independent Test**: Open a plain-text note, apply each supported format, wait for the existing save behavior, reload the note, and verify both its formatting and readable text.

**Acceptance Scenarios**:

1. **Given** a user edits an individual note, **When** they use the formatting controls, **Then** bold, italic, underline, strikethrough, headings 1–3, bullet and numbered lists, blockquotes, inline code, code blocks, hyperlinks, undo, and redo are available.
2. **Given** a formatted note is saved, **When** the user reloads it, **Then** its content and formatting are preserved.
3. **Given** a note contains existing plain text, **When** the user opens and edits it, **Then** its text remains readable and is not discarded or misinterpreted.
4. **Given** a note is created through Quick Capture, **When** the user opens its individual note page, **Then** it can be edited with the same formatting capabilities.
5. **Given** the user makes no content changes, **When** the note is open, **Then** no unnecessary save is triggered.

### Edge Cases

- A capture contains general information, suggestions, aspirations, and an action; only the actionable item becomes a task.
- A capture contains several actions in one sentence, repeated actions, or wording that could be either an event or a task.
- Refining a title must not remove important people, objects, destinations, or other task context.
- Relative dates cross a month, year, daylight-saving change, or timezone boundary.
- A date is contradictory, invalid, ambiguous, or only states a broad period. No exact deadline may be fabricated.
- Date-only deadlines must not shift to a different calendar day when displayed in the user's timezone.
- A task title becomes empty or meaningless after date text is removed.
- A completion is reversed near the retention cutoff, or cleanup runs more than once.
- A cleanup run fails or is delayed; expired completed tasks must be removed on a later successful run, and unfinished tasks must remain unaffected.
- An existing note is empty, plain text, or contains characters that resemble rich-text markup.
- The user edits a note while a save is pending or the save fails; unsaved content must remain available and the failure must be visible.
- A retry or repeated AI result must not create duplicate tasks where duplicate detection is supported.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Quick Capture MUST classify a submission into its informational content and zero or more genuinely actionable items; one submission MUST be able to produce both a note and multiple tasks.
- **FR-002**: Quick Capture MUST preserve informational context in a note and MUST NOT turn general facts, suggestions, or aspirations into tasks unless the user expresses an actionable intent.
- **FR-003**: The system MUST refine task titles into concise, action-oriented wording without adding an action or changing the user's intent. For example, "I have a wedding next week" becomes "Attend wedding".
- **FR-004**: Direct task entry and Quick Capture MUST use one shared task-interpretation capability for title refinement, date resolution, and output validation rather than maintaining duplicate rules.
- **FR-005**: The system MUST preserve task-critical context when refining a title and MUST keep a vague date phrase such as "next week" as context rather than inventing an exact deadline.
- **FR-006**: The system MUST interpret supported relative and explicit dates using the user's current date and application timezone. "Tomorrow" means the next local calendar day; "in two weeks" means 14 days from the reference date; "coming <weekday>" means the next occurrence after today; and "next <weekday>" means the occurrence in the following calendar week. These rules MUST be identical in both task-entry flows.
- **FR-007**: When associated with an actionable item, "middle of December" or "mid-December" MUST resolve to December 15, "beginning of December" to December 1, and "end of December" to December 31.
- **FR-008**: A whole-week expression MUST retain its stated period meaning. "Last week of December" used as a single-date deadline MUST resolve to the Monday starting the final Monday–Sunday calendar week that contains December 31, not December 31.
- **FR-009**: "Next month" by itself MUST NOT be converted into an exact due date. The phrase and its context MUST remain available to the user.
- **FR-010**: When a phrase expresses a bounded date range such as "first week of December", the system MUST store and display the full inclusive range (December 1–7); it MUST NOT collapse that range to one date. The single-date interpretation in FR-008 is an explicit exception for "last week of December" when used as a single-date deadline.
- **FR-011**: A task with no explicit, resolvable deadline MUST have no due date. The system MUST NOT infer a deadline from task creation time, task priority, or a default date.
- **FR-012**: For an ambiguous or contradictory date, the system MUST NOT assign a guessed date; it MUST ask the user to clarify and keep the affected task undated until a date is resolved.
- **FR-013**: When a user manually creates a task, they MUST be able to select a due date and optional due time, or leave both empty.
- **FR-014**: Users MUST be able to add, change, or remove a task's due date and due time after creation. A manually selected date MUST replace an AI-generated date range. Changes MUST persist and be reflected wherever that task is shown.
- **FR-015**: Marking a task complete MUST record its completion time; marking it incomplete MUST clear the completion state and exclude it from completed-task retention.
- **FR-016**: Completed tasks MUST remain available and recoverable during the seven days following completion, then be automatically removed once they have been completed for seven days. Cleanup MUST run independently of whether a user opens the application.
- **FR-017**: Retention cleanup MUST use completion time, MUST NOT delete unfinished tasks, and MUST be safe to repeat after failures or delayed runs.
- **FR-018**: Individual notes MUST support bold, italic, underline, strikethrough, heading levels 1–3, bullet and numbered lists, blockquotes, inline code, code blocks, hyperlinks, undo, and redo.
- **FR-019**: The individual note page MUST provide accessible, intuitive formatting controls without replacing the existing note layout with a separate editor page.
- **FR-020**: Saving formatted note content MUST preserve its formatting across reloads while keeping existing plain-text notes readable and editable.
- **FR-021**: Formatted note text MUST remain available to existing note search, summaries, and other text-based note features; formatting data MUST NOT appear to users as raw markup.
- **FR-022**: Note editing MUST preserve existing autosave behavior when present, avoid unnecessary writes, and keep unsaved content available when a save fails.
- **FR-023**: AI results MUST be validated before persistence. Malformed or incomplete responses MUST produce a visible error and MUST NOT be presented as a successfully saved result.
- **FR-024**: Existing authentication, user ownership, and authorization rules MUST apply to all note and task creation, reading, editing, completion, and cleanup operations.
- **FR-025**: Existing task duplicate-prevention behavior MUST be preserved where it applies, including when a capture is retried.

### Quality Requirements

- **QR-001**: Existing user data MUST remain accessible; any changes to note content representation MUST support existing plain-text content without destructive conversion.
- **QR-002**: If one part of a mixed capture cannot be processed, the user MUST be told which results were saved and which were not; saved content MUST NOT be hidden behind a success-shaped response.
- **QR-003**: Deadline display and date interpretation MUST be consistent with the user's application timezone and MUST avoid local/UTC off-by-one errors.
- **QR-004**: The cleanup process MUST remove eligible tasks no later than 24 hours after the seven-day retention period expires.

### Current Data and Interaction Contract

- Notes currently have a plain-text content value and an auto-save workflow. Formatted content must remain compatible with that user-facing contract.
- Tasks currently have a nullable due date, a separate indication of whether a time was supplied, and a completion timestamp. The requested date editing can build on these task concepts; representing AI-generated inclusive date ranges requires the task data and display contract to retain both range boundaries.
- Current task interactions support creating, completing, reopening, and deleting tasks. This feature adds user-facing deadline editing and scheduled retention; it does not change note/task ownership rules.
- Quick Capture currently presents a single-result outcome. The required user-facing result must be able to report a note, multiple tasks, a clarification request, or an explicit processing failure without losing the source capture.

### Key Entities *(include if feature involves data)*

- **Note**: A user's informational content, which may be plain text or formatted text and remains editable and searchable.
- **Task**: A user's actionable item with a concise title, optional single due date/time or inclusive date range, completion state and completion time, and any context needed to preserve the original intent.
- **Capture**: The original user submission and the resulting note, tasks, or date clarification.
- **Date context**: The reference date and timezone used to interpret relative expressions and display deadlines.
- **Retention period**: The seven-day period measured from a task's completion time, during which the completed task remains recoverable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of representative note-only, task-only, mixed, and multiple-action capture scenarios produce the expected set of notes and tasks without losing informational content.
- **SC-002**: At least 95% of representative task-title and supported-date scenarios produce the expected title and date consistently through direct entry and Quick Capture.
- **SC-003**: 100% of supported date-range scenarios preserve and display the full inclusive range, except for an explicitly requested single-date interpretation.
- **SC-004**: 100% of tasks with no resolvable deadline remain undated, and 100% of ambiguous or contradictory dates avoid a fabricated due date.
- **SC-005**: 100% of date and time changes made by a user persist and are displayed consistently after the task list is reloaded.
- **SC-006**: All completed tasks remain available through the seven-day retention period and are removed within 24 hours after it expires; no unfinished task is removed by cleanup.
- **SC-007**: All listed formatting capabilities survive save and reload, and all existing plain-text notes remain readable and editable.
- **SC-008**: At least 90% of representative users can create a task and add, change, or remove its deadline without assistance in under two minutes.

## Assumptions

- Existing authentication, task ownership, note ownership, and note/task workflows remain in place.
- The requested Tiptap editor is a feature constraint from the user input; it must be integrated into the existing individual note editing experience.
- Existing date behavior is intentionally revised where this specification differs from the earlier AI task-date feature: "next month" alone has no exact due date, and "last week of December" uses the beginning of the final Monday–Sunday week rather than December 31.
- A date-only deadline has no invented time. A broad or vague time period stays in the task context unless the user provides an exact date.
- An unqualified month name refers to its next upcoming occurrence, using the user's local date as the reference.
- Completed tasks may be reopened during the seven-day period; reopening before expiry makes the task ineligible for cleanup.
- Cleanup will use a periodic mechanism supported by the deployment environment and will not depend on user traffic. The exact mechanism is deferred because no deployment scheduler is configured in the reviewed repository.
- A rich-text representation must preserve existing plain text and the human-readable text used by existing note features. The storage representation is a planning decision, not a requirement to migrate or discard existing notes.
- Styling and interaction details should follow the existing application design; this specification defines required behavior rather than a broader redesign.
