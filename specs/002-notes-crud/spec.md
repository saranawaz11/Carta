# Feature Specification: Notes CRUD

**Feature Branch**: `002-notes-crud`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Notes CRUD for Carta, building on the finished Clerk auth step."

## User Scenarios

### User Story 1 - Manage notes (Priority: P1)

- A signed-in user creates an empty note, opens it at `/notes/[id]`, edits its title and content, and sees saved changes.
- **Acceptance Scenarios**:
  1. **Given** a signed-in user, **When** they create a note, **Then** an empty note is created and opened.
  2. **Given** a note, **When** its title or content is edited, **Then** the saved note reflects the changes.

### User Story 2 - Browse and search notes (Priority: P2)

- A persistent sidebar links to Notes, Archive, and Deleted. The default Notes gallery lists active notes; each list supports search.
- **Acceptance Scenarios**:
  1. **Given** notes in different states, **When** a user opens each list, **Then** it shows only notes for that state.
  2. **Given** a note in a list, **When** the user clicks it, **Then** its page opens at `/notes/[id]`.

### User Story 3 - Archive, delete, and restore (Priority: P3)

- A user archives or soft-deletes a note; deleted notes can be restored or permanently deleted.
- **Acceptance Scenarios**:
  1. **Given** a note page, **When** the user archives or deletes the note, **Then** the action is saved and they are redirected to Archive.
  2. **Given** a deleted note, **When** it is restored, **Then** it returns to the active Notes gallery.
  3. **Given** a deleted note, **When** it is permanently deleted or reaches 15 days deleted, **Then** it is permanently removed.

### Edge Cases

- Users never see or change another user's notes.
- Failed saves or state changes roll back optimistic UI updates.
- Sidebar remains mounted while navigating between notes pages and lists.

## Requirements

### Functional Requirements

- **FR-001**: The default page MUST list the signed-in user's active notes only (not archived or deleted).
- **FR-002**: The Archive page MUST list the user's archived, non-deleted notes; the Deleted page MUST list their soft-deleted notes.
- **FR-003**: A persistent sidebar MUST provide Create Note and links to Notes, Archive, and Deleted.
- **FR-004**: Create Note MUST create an empty note and open its `/notes/[id]` page; `id` MUST be a UUID.
- **FR-005**: Users MUST be able to edit and save a note's title and content.
- **FR-006**: Note pages MUST provide Archive and Delete actions. After either action, the user MUST be redirected to Archive.
- **FR-007**: Delete MUST soft-delete a note so it appears in Deleted.
- **FR-008**: Users MUST be able to restore or permanently delete notes from Deleted.
- **FR-009**: Deleted notes MUST be permanently removed after 15 days.
- **FR-010**: Users MUST be able to search notes.
- **FR-011**: Lists MUST reflect create, edit, archive, and delete immediately using optimistic updates and rollback on failure; page navigation MUST NOT fully reload or unmount the sidebar.
- **FR-012**: Notes MUST be stored in Neon PostgreSQL and belong to the signed-in user's Clerk user ID. Every read or change MUST be restricted to that owner.

### Key Entities

- **Note**: UUID identity, Clerk user ID owner, title, content, archived state, deleted state, and deletion time.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every note operation is limited to the signed-in owner; other users cannot read or change that note.
- **SC-002**: Creating a note opens its page with an empty title and content.
- **SC-003**: Each Notes, Archive, and Deleted list shows only its corresponding state.
- **SC-004**: Successful note actions update visible lists without a full page reload; failed actions restore the prior state.
- **SC-005**: Deleted notes can be restored or permanently removed, and are automatically removed after 15 days.

## Assumptions

- Search filters notes in the currently open list.
- Archive is a reversible state; restoring an archived note returns it to active Notes.
- Existing Clerk authentication supplies the signed-in user's identity.
- Out of scope: LLM features, summaries, vector search, styling.
