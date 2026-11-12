# Feature Specification: AI Task Date Parsing

**Feature Branch**: `009-ai-task-dates`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Currently a frontend function is being used for parsing dates when added to task, use langraph on backed and using that specify dates. Like both in capture method and tasks, like if said coming Saturday get date, last week of december get date, next month, date specified. using ai agent instead of function for such things"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a task with a natural-language date (Priority: P1)

When adding a task, the user can include a date in ordinary language and get a task with the intended due date, without manually converting the phrase into a calendar date.

**Why this priority**: Correct date interpretation is the core requested improvement and applies to everyday task entry.

**Independent Test**: Add tasks with an explicit date, "coming Saturday", and "next month"; verify their due dates against the user's local date and the period rules below.

**Acceptance Scenarios**:

1. **Given** a task with an explicit calendar date, **When** the user adds it, **Then** the task has that date and its title does not contain the date phrase.
2. **Given** the user's local date is Tuesday, April 7, **When** they add "submit report coming Saturday", **Then** the task is due Saturday, April 11, and its title is "submit report".
3. **Given** the user's local date is November 10, 2026, **When** they add "renew pass next month", **Then** the task is due December 31, 2026.
4. **Given** the user's local date is November 10, 2026, **When** they add "finish reading last week of December", **Then** the task is due December 31, 2026.
5. **Given** a task with a specific time, **When** the user adds it, **Then** the due time is preserved; when no time is stated, **Then** no time is invented.
6. **Given** a task with no stated date, **When** the user adds it, **Then** it remains undated.
7. **Given** a date phrase that cannot be confidently resolved, **When** the user submits it, **Then** no task with a guessed due date is created and the user is told to revise or clarify it.
8. **Given** a signed-in user adds a task, **When** it is saved, **Then** it remains subject to existing task ownership and access rules.

### User Story 2 - Capture a reminder with a natural-language date (Priority: P2)

When the user captures a reminder, the task is created with the same date interpretation and title cleanup used for direct task entry.

**Why this priority**: Users should get consistent results regardless of where they enter a reminder.

**Independent Test**: Capture reminders with relative, period-based, and explicit dates; verify each created task's title and due date match direct task entry.

**Acceptance Scenarios**:

1. **Given** a reminder with a relative date, **When** the user submits it through capture, **Then** the date is resolved from the user's local current date.
2. **Given** a reminder with an explicit date or a calendar-period phrase, **When** the user submits it through capture, **Then** the task has the same due date it would have through direct task entry.
3. **Given** a capture statement that is not a task, **When** it is submitted, **Then** existing note and note-operation behavior is preserved.
4. **Given** a reminder whose date cannot be confidently resolved, **When** it is submitted through capture, **Then** no guessed-dated task is created and the user is told how to proceed.

### Edge Cases

- If no date is stated, the task has no due date; the current date is not substituted.
- If a date phrase cannot be resolved confidently, no guessed-dated task is created and the user is told to revise or clarify the date.
- Relative expressions are interpreted using the user's current local date and timezone.
- For a calendar period without a more specific day (for example, "next month" or "last week of December"), use the final calendar day of the named period as the due date.
- If a phrase includes a time, preserve it in the user's timezone; date-only phrases remain date-only.
- If date interpretation fails, the user's submitted text is not silently discarded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to include explicit calendar dates and natural-language date expressions when adding tasks.
- **FR-002**: The system MUST interpret relative dates using the user's current local date and timezone.
- **FR-003**: The system MUST resolve calendar-period expressions such as "next month" and "last week of December" to the final calendar day of the referenced period unless a specific day is also stated.
- **FR-004**: The system MUST apply consistent date and task-title interpretation to reminders submitted through capture and tasks entered directly.
- **FR-005**: The system MUST remove a successfully interpreted date phrase from the task title while preserving the task's meaningful text.
- **FR-006**: The system MUST preserve a stated time and MUST NOT invent a time for a date-only expression.
- **FR-007**: If no date is stated, the system MUST create the task without a due date.
- **FR-008**: If a stated date cannot be interpreted confidently, the system MUST NOT create a task with a guessed due date and MUST tell the user how to proceed.
- **FR-009**: Existing capture behavior for notes and note operations MUST remain unchanged.
- **FR-010**: Task date interpretation MUST follow existing user ownership and data access rules.

### Key Entities *(include if feature involves data)*

- **Task**: A user's task with meaningful title text and an optional due date and time.
- **Date context**: The user's current local date and timezone used to interpret relative expressions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of test cases containing an explicit date or supported relative date resolve to the intended calendar date in both task entry flows.
- **SC-002**: At least 90% of test cases using calendar-period phrases resolve to the documented period boundary.
- **SC-003**: In at least 95% of successfully interpreted cases, the task title retains all meaningful non-date text and excludes the interpreted date phrase.
- **SC-004**: 100% of task entries without a date remain undated, and 100% of unresolved date phrases produce a visible explanation rather than a guessed due date.

## Assumptions

- Task due dates are calendar dates; a time is stored only when the user states one.
- Period-only expressions resolve to the period's final calendar day, a consistent deadline-oriented default.
- An unqualified month name refers to the next upcoming occurrence of that month.
- Existing authentication, task ownership, capture outcomes, and task management behavior are reused.
- Styling and broader conversational follow-up are out of scope.
