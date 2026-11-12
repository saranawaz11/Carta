# Feature Specification: Real Note Tags

**Feature Branch**: `007-note-tags`
**Created**: 2026-10-13
**Status**: Draft
**Input**: Replace the static placeholder tags on the note page with real, per-note tags the user can add and remove.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add and remove tags (Priority: P1)

On a note page, the user types a tag name and presses Enter to add it, and removes a tag with its chip. Changes save immediately and the UI updates at once; if saving fails, the change is rolled back.

**Why this priority**: Core value; replaces the placeholder tags and "+ Add tag".

**Independent Test**: Add a tag, reload, confirm it persists; remove it, reload, confirm it is gone.

**Acceptance Scenarios**:

1. **Given** a note, **When** the user types "  Project   Alpha " and presses Enter, **Then** the tag "project alpha" appears on the note and persists after reload.
2. **Given** a note with a tag, **When** the user removes its chip, **Then** it disappears and stays gone after reload.
3. **Given** a tag already on the note, **When** the user adds it again (any casing/spacing), **Then** no duplicate is created.
4. **Given** a save failure, **Then** the UI reverts to the previous tags and shows an error.
5. **Given** a tag over 30 characters or a note already at 10 tags, **When** the user adds a tag, **Then** it is rejected with a short message.

---

### User Story 2 - Suggestions from existing tags (Priority: P2)

While typing, the input suggests the user's existing tags from their other notes.

**Independent Test**: Tag note A "research", open note B, type "res", see "research" suggested.

**Acceptance Scenarios**:

1. **Given** other notes with tags, **When** the user types, **Then** matching existing tags not already on this note are suggested; choosing one adds it.
2. **Given** tags belonging to another user, **Then** they are never suggested.

### Edge Cases

- Empty or whitespace-only input: nothing is added.
- Tag text is normalized before checking limits and duplicates.
- Editing tags does not trigger re-embedding and does not mark a saved summary as stale.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The note page MUST show the note's real tags as chips and an input to add a tag, replacing the static placeholders, keeping existing UI and styling.
- **FR-002**: Pressing Enter in the input MUST add the typed tag; each chip MUST allow removing its tag.
- **FR-003**: Tags MUST be normalized: trimmed, lowercased, internal whitespace collapsed.
- **FR-004**: A note MUST NOT hold duplicate tags, tags longer than 30 characters, or more than 10 tags.
- **FR-005**: The input MUST suggest the user's existing tags from their other notes while typing.
- **FR-006**: Adds and removes MUST save immediately, update the UI at once, and roll back if saving fails.
- **FR-007**: Tags MUST belong to the note's owner only and be visible only to them.
- **FR-008**: Changing tags MUST NOT trigger re-embedding and MUST NOT mark a saved summary as stale.

### Key Entities

- **Tag**: A normalized label attached to one note, owned by the note's owner.

## Success Criteria *(mandatory)*

- **SC-001**: A tag appears in the UI immediately (no visible wait) after pressing Enter.
- **SC-002**: Tags persist across reloads for 100% of successful saves.
- **SC-003**: Failed saves leave the UI matching stored tags.
- **SC-004**: No other user's tags are ever shown or suggested.

## Assumptions

- Out of scope: filtering or searching by tag, tag colors, renaming a tag across notes, a tags page, suggested tags, styling changes.
- Suggestions come only from the user's other notes' tags.
