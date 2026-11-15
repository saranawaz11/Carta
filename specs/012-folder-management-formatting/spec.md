# Feature Specification: Folder Management and Enhanced Note Formatting

**Feature Branch**: `012-folder-management-formatting`

**Created**: 2026-05-05

**Status**: Draft

**Input**: User description: "Extend the existing notes application with a folder management system and Notion-like rich-text formatting capabilities."

## Clarifications

### Session 2026-11-12

- Q: When a note is archived or in Trash, should the user be able to move it into a folder? → A: Archived notes can be moved and stay archived. Trashed notes cannot be moved.
- Q: When a user clicks "Clear formatting", should it remove only colors and highlights, or also bold, italic, and underline? → A: Only text color and highlight are removed. Bold, italic, underline, and headings stay.
- Q: Should folder names be unique regardless of letter case, so that "Work" and "work" count as duplicates? → A: Yes. Names are trimmed of surrounding spaces and compared case-insensitively.
- Q: In the navbar, how should folders be ordered? → A: Most recently changed first. A folder counts as changed when it is renamed or when a note is added to or removed from it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create, Rename, and Delete Folders from the Navbar (Priority: P1)

A signed-in user opens the Folders section in the navbar, expands it, and creates a new folder without needing to create a note first. The folder appears in the list immediately. The user can rename the folder or delete it. Deleting a folder never deletes its notes; those notes become unassigned root-level notes.

**Why this priority**: Folders are the foundation for every other story. Without creating and managing folders, no organization is possible.

**Independent Test**: Sign in, expand the Folders section, create a folder, rename it, and delete it. Confirm the folder list updates at each step and that no notes are removed.

**Acceptance Scenarios**:

1. **Given** the Folders section is collapsed, **When** the user selects the expand arrow, **Then** the list of the user's folders is shown, and the arrow reflects the expanded state.
2. **Given** the Folders section is expanded, **When** the user selects the add-folder control and enters a non-empty name, **Then** a new folder with that name is created and shown in the navbar without a page reload.
3. **Given** the user opens the add-folder dialog, **When** the user submits an empty or whitespace-only name, **Then** the folder is not created and the user sees a validation message.
4. **Given** the user already has a folder named "Cloud Computing", **When** the user creates another folder with the same name, **Then** the user is told the name is already in use and no duplicate is created.
5. **Given** a folder exists, **When** the user renames it to a valid unused name, **Then** the navbar and folder heading show the new name.
6. **Given** a folder contains notes, **When** the user deletes the folder and confirms, **Then** the folder is removed, every note from that folder still exists, and those notes appear as unassigned notes.
7. **Given** a folder deletion is requested, **When** the user cancels the confirmation, **Then** nothing changes.

---

### User Story 2 - Browse Notes by Folder (Priority: P1)

A user selects a folder in the navbar and sees only the notes assigned to that folder, under the folder name as the page heading. The user can open any note from that view. An empty folder shows an empty state.

**Why this priority**: Viewing a folder's notes is the main reason to organize notes. It delivers value as soon as folders exist.

**Independent Test**: Create two folders, assign notes to one of them, select each folder, and confirm that each view shows only its own notes.

**Acceptance Scenarios**:

1. **Given** a folder contains three notes, **When** the user selects that folder, **Then** exactly those three notes are listed and the folder name is the page heading.
2. **Given** a folder contains no notes, **When** the user selects it, **Then** an empty-state message is shown that explains how to add notes to the folder.
3. **Given** the user is viewing a folder, **When** the user opens one of its notes, **Then** the note opens with its title, content, and formatting unchanged.

---

### User Story 3 - Move a Note into or out of a Folder Manually (Priority: P2)

From a note's page, the user chooses "Move to folder", picks a destination from a dropdown of their folders, or chooses to remove the note from its current folder. The note's folder association updates. Its ID, title, and content do not change.

**Why this priority**: The manual move is the reliable way to organize notes and is needed even if drag-and-drop is unavailable.

**Independent Test**: Open a note, move it to folder A, then to folder B, then remove it from any folder. Confirm the note's ID, title, and content are identical after each step.

**Acceptance Scenarios**:

1. **Given** a note with no folder, **When** the user opens "Move to folder" and selects folder A, **Then** the note belongs to folder A, shows folder A as its current folder, and appears in folder A's list.
2. **Given** a note in folder A, **When** the user moves it to folder B, **Then** it no longer appears in folder A and appears in folder B. No copy of the note is created.
3. **Given** a note in folder A, **When** the user chooses to remove it from the folder, **Then** the note has no folder and appears among unassigned notes.
4. **Given** a move fails because of a network or server error, **When** the failure occurs, **Then** the user sees an error message and the note's folder association is unchanged.
5. **Given** a move succeeds, **When** the change is saved, **Then** the user sees a success confirmation.

---

### User Story 4 - Drag a Note onto a Folder (Priority: P2)

A user drags a note from the notes list and drops it onto a folder in the navbar. While dragging, the navbar highlights valid drop targets. Dropping assigns the note to the folder. Dragging does not trigger accidental navigation to the note.

**Why this priority**: Drag-and-drop is the faster way to organize many notes, and it reuses the move logic from User Story 3.

**Independent Test**: Drag a note from the list onto a folder in the navbar. Confirm the folder highlights during the drag, the note is assigned on drop, and the page does not navigate to the note.

**Acceptance Scenarios**:

1. **Given** the user starts dragging a note, **When** the pointer is over a folder in the navbar, **Then** that folder shows a visible drop-target highlight.
2. **Given** the user drops a note on a folder, **When** the drop completes, **Then** the note is assigned to that folder and the navbar and note lists update to reflect it.
3. **Given** the user drags a note and releases it outside any folder, **When** the drag ends, **Then** the note's folder association is unchanged and no navigation occurs.
4. **Given** the user drags a note, **When** the drag starts or ends, **Then** the browser does not navigate to the note page.
5. **Given** the app is on a narrow screen, **When** the user uses the responsive navigation layout, **Then** folders are still reachable and can still receive dropped notes.

---

### User Story 5 - Use Folder Notes as LLM Context (Priority: P3)

The system can fetch all notes that belong to a given folder for the signed-in user, including each note's title and content, so future assistant features can answer questions such as "What are the key points in my Cloud Computing folder?". Notes from other folders and notes owned by other users are never returned.

**Why this priority**: The data and retrieval capability are required for future LLM features, but no user-visible LLM feature ships in this feature.

**Independent Test**: For a folder with known notes, request its contents and confirm the result contains exactly the expected notes with titles and content, and nothing from other folders or other users.

**Acceptance Scenarios**:

1. **Given** folder A has two notes and folder B has one note, **When** folder A's contents are requested, **Then** exactly the two notes from folder A are returned, each with its title and content.
2. **Given** a folder ID that belongs to another user, **When** its contents are requested, **Then** the request is refused and no notes are returned.
3. **Given** a folder with no notes, **When** its contents are requested, **Then** an empty collection is returned.

---

### User Story 6 - Apply Text Color and Highlights in the Editor (Priority: P2)

While editing a note, the user selects text and opens a text-color picker or a highlight picker from the toolbar. Each picker offers a predefined, visually consistent palette. The user can apply a color, remove it, or clear formatting. Formatting is saved with the note and appears the same when the note is reopened.

**Why this priority**: It gives users the Notion-like formatting they asked for. It is independent of folder work.

**Independent Test**: Select text, apply a text color and a highlight, save, reload the note, and confirm both are shown. Then remove them and confirm the text returns to default styling.

**Acceptance Scenarios**:

1. **Given** text is selected, **When** the user opens the text-color picker and picks a palette color, **Then** the selected text shows that color.
2. **Given** colored text is selected, **When** the user picks the default color option, **Then** the color is removed and the text returns to the default color.
3. **Given** text is selected, **When** the user picks a highlight color, **Then** the selected text gets that background highlight.
4. **Given** highlighted text is selected, **When** the user removes the highlight, **Then** the background is removed and the text is otherwise unchanged.
5. **Given** formatted text (colors, highlights, bold, italic, underline, headings, lists), **When** the note is saved and reopened, **Then** all formatting is shown as it was before saving.
6. **Given** a note with existing content and no color or highlight marks, **When** the note is opened after this feature ships, **Then** its content is displayed unchanged.
7. **Given** text has bold, italic, or underline applied, **When** a color or highlight is also applied, **Then** all marks remain visible together.
8. **Given** the user selects "Clear formatting", **When** the action is applied, **Then** only text colors and highlights are removed from the selection, and bold, italic, underline, headings, and lists remain.

---

### User Story 7 - Existing Notes Keep Working Without Folders (Priority: P1)

Existing notes remain accessible and unchanged after folders are introduced. They do not need a folder to be viewed, edited, searched, or deleted. Notes that are not in any folder appear in the main notes list as before.

**Why this priority**: The feature must not break the existing notes experience or lose data.

**Independent Test**: Before and after the change, open a note created earlier that has no folder. Confirm it opens, edits save, and it still appears in the main notes list.

**Acceptance Scenarios**:

1. **Given** a note created before this feature, **When** the user opens it after the change, **Then** the note, its title, and its content are unchanged and it has no folder.
2. **Given** the user has notes with no folder, **When** the main notes list is viewed, **Then** all of those notes are shown.

---

### Edge Cases

- What happens when two folders are renamed to the same name at the same time? The server rejects the second rename, and the user sees a duplicate-name message.
- What happens when a folder is deleted while another tab is viewing it? The other tab shows a not-found message on the next action and does not show stale notes as if they still belong to the folder.
- What happens when a note is dropped on a folder that was deleted in the meantime? The drop fails with an error, and the note keeps its previous folder association.
- How does the system handle a very long folder name? Names are limited to a maximum length, and longer input is rejected with a clear message.
- What happens when the user is offline during a move? The move fails, shows an error, and the note's folder association does not change.
- What happens when a note is moved while it is open in the editor with unsaved changes? The move does not discard unsaved edits, and the note content stays as the user edited it.
- What happens when a user tries to move a note into a folder owned by someone else? The server refuses the request, and the note keeps its folder association.
- What happens when a user applies a color to text that already has a highlight? Both marks are kept.
- What happens when a folder contains a very large number of notes? The folder view loads them in pages and remains usable.

## Requirements *(mandatory)*

### Functional Requirements

**Folder management**

- **FR-001**: The navbar MUST show a Folders section with an expand/collapse control.
- **FR-002**: The Folders section MUST list only the signed-in user's folders when expanded, ordered by most recent change first (a folder is changed when it is renamed or a note is added to or removed from it), and hide the list when collapsed.
- **FR-003**: Users MUST be able to create a folder from the Folders section without creating a note first.
- **FR-004**: The system MUST reject folder names that are empty or contain only whitespace.
- **FR-005**: The system MUST reject a folder name that duplicates another folder name owned by the same user. Names are trimmed of surrounding spaces and compared case-insensitively, so "Work" and " work " are duplicates. The user MUST be told why.
- **FR-006**: The system MUST limit folder names to a maximum length and tell the user when the limit is exceeded.
- **FR-007**: Users MUST be able to rename their folders, subject to the same name rules as creation.
- **FR-008**: Users MUST be able to delete their folders only after confirming the deletion in a confirmation dialog.
- **FR-009**: Deleting a folder MUST NOT delete any note. Each note that belonged to the deleted folder MUST become an unassigned note.

**Folder navigation**

- **FR-010**: Selecting a folder MUST show all notes assigned to that folder and only those notes.
- **FR-011**: The folder view MUST show the folder name as the page heading.
- **FR-012**: The folder view MUST show an empty state when the folder has no notes.
- **FR-013**: Users MUST be able to open any note from a folder view.

**Note and folder relationship**

- **FR-014**: A note MUST be able to belong to zero or one folder at any time.
- **FR-015**: A folder MUST be able to contain zero or more notes.
- **FR-016**: Moving a note MUST change its folder association only. It MUST NOT create a copy of the note, and it MUST keep the note's ID, title, content, and other existing properties.
- **FR-017**: Notes MUST remain accessible and editable whether or not they belong to a folder.

**Moving notes**

- **FR-018**: The note page MUST provide a "Move to folder" action that shows a dropdown of the user's folders. Archived notes MUST be movable and keep their archived status. Trashed notes MUST NOT be movable; the action is unavailable for them until they are restored.
- **FR-019**: The "Move to folder" action MUST include an option to remove the note from its current folder.
- **FR-020**: The note page MUST show the note's current folder, or indicate that it has none.
- **FR-021**: Users MUST be able to drag a note from the notes list and drop it on a folder in the navbar to assign it to that folder. Trashed notes MUST NOT be draggable onto a folder. Archived notes MAY be dragged and keep their archived status.
- **FR-022**: While a note is being dragged, the system MUST visually highlight folders that are valid drop targets.
- **FR-023**: Dragging a note MUST NOT trigger navigation to the note page.
- **FR-024**: After any successful move, the navbar folder counts and the affected note lists MUST reflect the new association.
- **FR-025**: The system MUST show a success message after a successful move and an error message after a failed move. A failed move MUST leave the note's folder association unchanged.

**Ownership and security**

- **FR-026**: Every folder operation and every note-to-folder assignment MUST be restricted to folders and notes owned by the authenticated user. The server MUST validate ownership of both the folder and the note before saving an assignment.
- **FR-027**: Folder contents MUST be retrievable by folder identifier, returning each note's title and content, scoped to the authenticated user, and excluding notes not in the requested folder.

**Editor formatting**

- **FR-028**: The editor toolbar MUST include a text-color control that offers a predefined palette, applies the chosen color to the selected text, and offers a way to restore the default color.
- **FR-029**: The editor toolbar MUST include a highlight control that offers a predefined set of background colors and a way to remove the highlight.
- **FR-030**: The editor toolbar MUST include a clear-formatting control. It MUST remove text colors and highlights from the selection only. Bold, italic, underline, headings, and lists MUST be unchanged by it.
- **FR-031**: Color and highlight choices MUST be presented in pickers or popovers, not as a permanent row of color swatches.
- **FR-032**: Text colors and highlights MUST be saved with the note and MUST be shown the same way when the note is reopened.
- **FR-033**: Existing bold, italic, underline, heading, list, and other editor features MUST continue to work unchanged, including when combined with colors and highlights.
- **FR-034**: Existing note content MUST NOT be altered or lost when the editor is extended. Notes saved before this feature MUST open with their content unchanged.

**Interaction states**

- **FR-035**: The Folders section, folder views, and move actions MUST show a loading state while data is being fetched or saved.
- **FR-036**: The system MUST show clear messages for folder creation errors, rename errors, failed moves, and successful moves.

## Key Entities *(include if feature involves data)*

- **Folder**: A named collection owned by one user. Key attributes: a stable identifier, the owner, a name, and creation and update times. A folder references its notes; it does not store copies of note content.
- **Note**: An existing entity that is extended with an optional reference to one folder. Key attributes remain unchanged: identifier, title, content, formatting, owner, and timestamps. A note with no folder reference is an unassigned note.
- **Folder membership**: The relationship in which many notes may reference one folder, and each note references at most one folder. Deleting a folder clears this reference on its notes rather than deleting the notes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a folder and see it in the navbar in under 10 seconds from opening the Folders section.
- **SC-002**: A user can move a note into a folder through the note page in under 15 seconds.
- **SC-003**: A user can drag a note onto a folder and see the note appear in that folder's view on the first attempt in at least 90% of trials.
- **SC-004**: After any folder deletion, 100% of the notes that were in that folder still exist and are visible among unassigned notes.
- **SC-005**: Opening a folder shows only its own notes in 100% of verification cases, with no notes from other folders or other users.
- **SC-006**: Every note that existed before this feature opens with its title and content unchanged, with no manual folder assignment required.
- **SC-007**: A user can apply a text color and a highlight, save, reopen the note, and see the same formatting in 100% of trials.
- **SC-008**: A user can request the contents of one of their folders and receive the titles and content of exactly the notes in that folder.
- **SC-009**: Users attempting to access or change another user's folder or note are refused in 100% of verification cases.
- **SC-010**: Users report that the new folder and formatting controls feel consistent with the existing notes interface, with at least 80% rating them as easy to find in a usability check.

## Assumptions

- Users already have accounts and the existing authentication flow is reused for all folder operations.
- Each user's folders are private to that user. Folder sharing is out of scope.
- Folders are a single level. Nested subfolders are out of scope for this feature.
- A note can belong to at most one folder. Multiple-folder tagging is out of scope.
- The current editor is extended, not replaced. Its existing content format remains valid, so previously saved notes need no migration beyond the new optional folder reference.
- The predefined color and highlight palettes follow the existing visual design and are inspired by Notion's palette. Users cannot define custom colors in this feature.
- Drag-and-drop uses a lightweight, maintained library or the browser's native drag-and-drop, chosen during planning.
- The LLM summarization and question-answering workflow is not built in this feature. Only the data model and retrieval support it.
- Folder names are limited to a reasonable maximum length, and the exact limit is decided during planning.
- Deleting a folder is a permanent folder removal. Notes are kept, and no folder restore feature is included.
- Dependencies on the existing notes, authentication, and navigation systems are satisfied by the current application.
