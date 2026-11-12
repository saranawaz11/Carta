# Data Model: AI Task Date Parsing

No database migration or persistent entity changes are required.

## Task (existing)

- `title`: non-empty task description after removing a successfully interpreted date phrase.
- `due_at`: nullable timezone-aware date/time. Remains null when no date is stated; a date-only value must not imply a user-provided time.
- `due_has_time`: true only when the user stated a time of day.
- `clerk_user_id`: existing owner; all persistence continues through the authenticated task service.

## Date Resolution (transient)

- Input: original task text, browser current datetime, and browser IANA timezone.
- Result: cleaned title, optional due datetime, whether a time was stated, and whether a stated date needs clarification.
- Validation: reject an empty cleaned title; reject invalid dates/timezones; do not persist a task when the date was stated but cannot be resolved confidently.
- Period-only dates use the last calendar day of the named period, as specified.

## Relationships and State

- A resolved task is persisted through the existing task service and repository; duplicate detection and ownership behavior are unchanged.
- An unresolved date produces a visible response and no Task record.
