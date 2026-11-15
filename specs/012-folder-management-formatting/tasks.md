# Tasks: Folder Management and Enhanced Note Formatting

**Input**: Design documents from `/specs/012-folder-management-formatting/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/folders-api.md](./contracts/folders-api.md), [quickstart.md](./quickstart.md)

**Tests**: Not included. The constitution forbids test files and testing tasks. Manual checks live in [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story so each story can be implemented and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: User story from spec.md (US1 to US7)

---

## Phase 1: Setup

**Purpose**: Install the three Tiptap packages needed for formatting.

- [X] T001 Install `@tiptap/extension-text-style@^2.9.2`, `@tiptap/extension-color@^2.9.2`, and `@tiptap/extension-highlight@^2.9.2` in `frontend/package.json` by running `npm install` from `frontend/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, data access, shared name rules, and the frontend API client. All user stories depend on these.

**CRITICAL**: No user story work starts until this phase is complete.

- [X] T002 Add a `Folder` model to `backend/models.py` with: `id` UUID primary key; `clerk_user_id` text, not null; `name` text, not null, "Trimmed; 1 to 60 characters"; `created_at` timestamptz, default `now()`; `updated_at` timestamptz, default `now()`, "bumped on rename and on note move in or out"; unique index on `(clerk_user_id, lower(name))`
- [X] T003 Add `folder_id` to the `Note` model in `backend/models.py`: UUID, nullable, "FK to `folders.id`, `ON DELETE SET NULL`; must belong to the same `clerk_user_id`"; add index on `(clerk_user_id, folder_id)`
- [X] T004 [P] Create `backend/alembic/versions/0007_folders.py` with `revision = "0007_folders"` and `down_revision = "0006_intelligent_capture"`. Create the `folders` table, the unique functional index, `notes.folder_id` with FK `ON DELETE SET NULL`, and the notes index. The downgrade reverses all of it. Follow the style of `backend/alembic/versions/0005_note_tags.py`
- [X] T005 [P] Add schemas to `backend/schemas.py`: `FolderCreate` and `FolderUpdate` with `name` "1 to 60 characters after trimming"; `FolderOut` with `id`, `name`, `note_count`, `created_at`, `updated_at`; `NoteFolderUpdate` with `folder_id: UUID | None`; and `folder_id: UUID | None = None` on `NoteOut` (around line 9)
- [X] T006 Create `backend/repositories/folders.py` with owner-scoped data access, every query filtered by `clerk_user_id`: get a folder by id, find a folder by `lower(name)` excluding one id, list folders with a non-trashed `note_count`, set a note's `folder_id`. Depends on T002 and T003
- [X] T007 Create `backend/services/folders.py` with shared helpers: `normalize_name` (trim; reject empty, FR-004; reject over 60 characters with a message, FR-006), `ensure_unique_name` (case-insensitive, 409, FR-005), and `get_owned_folder` (404 when missing or not owned, FR-026). Depends on T006
- [X] T008 [P] Create `frontend/lib/folders.ts` with `listFolders`, `createFolder`, `renameFolder`, `deleteFolder`, `listFolderNotes(folderId, limit, offset)`, and `moveNote(noteId, folderId | null)`, using `apiFetch` from `frontend/lib/api.ts` like `frontend/lib/chat-history.ts`. Add `FolderOut` and `folder_id` types

**Checkpoint**: Schema, repository, helpers, and client are ready. User stories can start.

---

## Phase 3: User Story 1 - Create, Rename, and Delete Folders from the Navbar (Priority: P1) 🎯 MVP

**Goal**: A user can create, rename, and delete folders from a Folders section in the navbar.

**Independent test**: [quickstart.md](./quickstart.md) scenarios 1 and 2.

- [X] T009 [US1] Add `create_folder`, `rename_folder`, `delete_folder`, and `list_folders` to `backend/services/folders.py`. Create and rename apply the T007 rules (FR-003, FR-004, FR-005, FR-006, FR-007). Rename sets `updated_at`. Delete removes only the folder row and relies on `ON DELETE SET NULL` so notes are kept (FR-008, FR-009). List is ordered by `updated_at` descending (FR-002) and returns a non-trashed `note_count`
- [X] T010 [US1] Create `backend/routes/folders.py` with routes only, no logic. Add `GET /api/folders`, `POST /api/folders` (201), `PATCH /api/folders/{folder_id}`, and `DELETE /api/folders/{folder_id}` (204). Each route calls the service. Depends on T009
- [X] T011 [US1] Register the folders router in `backend/main.py` next to the existing routers (lines 25 to 32). Confirm CORS `allow_methods` (line 21) includes PATCH and DELETE
- [X] T012 [P] [US1] Create `frontend/components/folder-dialog.tsx` for create and rename, built on `frontend/components/ui/dialog.tsx`. Show validation errors for FR-004, FR-005, and FR-006. Show error messages (FR-036). Show a loading state while saving (FR-035). Use the minimal shadcn set only; styling is left to the developer
- [X] T013 [US1] Create `frontend/components/folders-nav.tsx`. Include an expand/collapse control (FR-001). When expanded, list folders from `listFolders` in server order and hide the list when collapsed (FR-002). Add a "New folder" action that opens `folder-dialog` (FR-003). Rename opens `folder-dialog` (FR-007). Delete uses `frontend/components/delete-confirm-modal.tsx` with a message that says notes are kept (FR-008, FR-009). Show a loading state (FR-035). Depends on T008 and T012
- [X] T014 [US1] Mount `FoldersNav` in `frontend/components/sidebar.tsx`. Ask the developer where it should appear on narrow screens, as noted in the plan's Structure Decision. Depends on T013

**Checkpoint**: US1 works on its own. Folders can be created, renamed, and deleted from the navbar.

---

## Phase 4: User Story 2 - Browse Notes by Folder (Priority: P1)

**Goal**: Selecting a folder shows only its notes.

**Independent test**: [quickstart.md](./quickstart.md) scenarios 3 and 7.

- [X] T015 [US2] Add `list_folder_notes` to `backend/services/folders.py`. Check ownership with `get_owned_folder` (404). Exclude trashed notes. Return only notes in this folder (FR-010, FR-027). Paginate with `limit` (default 50, max 100) and `offset`. Depends on T009
- [X] T016 [US2] Add `GET /api/folders/{folder_id}/notes` to `backend/routes/folders.py` with `limit` and `offset` query parameters. Return `NoteOut[]` through the service only. Depends on T015
- [X] T017 [US2] Create `frontend/app/(app)/folders/[id]/page.tsx`. Show the folder name as the page heading (FR-011) and an empty state when the folder has no notes (FR-012). Open a note on click (FR-013). Load more pages. Show a loading state (FR-035). Get the folder name from `listFolders`. Depends on T008 and T016
- [X] T018 [US2] Extend `NoteList` in `frontend/components/note-list.tsx`. It takes only `status` today (line 453). Add an optional folder scope so the folder page can reuse the grid and list views. Default behavior must not change. Depends on T017
- [X] T019 [US2] Make each folder in `frontend/components/folders-nav.tsx` link to `/folders/{id}`. Depends on T013

**Checkpoint**: US1 and US2 work together. Folders can be created and browsed.

---

## Phase 5: User Story 7 - Existing Notes Keep Working Without Folders (Priority: P1)

**Goal**: Notes that predate this feature open and save unchanged, with no folder assignment.

**Independent test**: [quickstart.md](./quickstart.md) scenario 9.

- [X] T020 [US7] Check `update_note` in `backend/services/notes.py` (line 69). It must not write `folder_id`, so `PATCH /api/notes/{id}` never changes folder membership. Leave the `content` and `content_rich` logic unchanged (FR-034)
- [X] T021 [US7] Confirm `NoteOut` returns `folder_id: null` for notes created before this feature. Confirm migration `0007_folders` only adds the nullable column and makes no data changes. Title and content must stay the same (FR-017, SC-006)
- [X] T022 [US7] Confirm `frontend/app/(app)/notes/[id]/page.tsx` and `frontend/components/note-list.tsx` handle `folder_id: null` without errors, and do not require a folder (FR-017)

---

## Phase 6: User Story 3 - Move a Note into or out of a Folder Manually (Priority: P2)

**Goal**: A user moves a note into, or out of, a folder from the note page.

**Independent test**: [quickstart.md](./quickstart.md) scenarios 4 and 5.

- [X] T023 [US3] Add `move_note` to `backend/services/folders.py`. Check that the note belongs to the user (404). If the target folder is not null, check its ownership (404). Trashed notes return 409 (FR-018). Archived notes are allowed and keep their status. Set only `folder_id`, leaving title, content, `content_rich`, and embeddings unchanged (FR-016). Set `updated_at` on the old and new folder (plan decision 3). Depends on T009
- [X] T024 [US3] Add `PUT /api/notes/{note_id}/folder` to `backend/routes/notes.py`. Use the `NoteFolderUpdate` body and return `NoteOut`. The route calls the service only (plan decision 4). Depends on T023
- [X] T025 [US3] Create `frontend/components/folder-move.tsx` with a native `<select>` listing the user's folders plus a "No folder" option to remove the note from its folder (FR-019). Disable it with an explanation for trashed notes (FR-018). Show success and error messages (FR-025). On error, restore the previous selection (FR-025). Show a loading state (FR-035). Depends on T008
- [X] T026 [US3] Add `FolderMove` and the current folder name to `frontend/app/(app)/notes/[id]/page.tsx`. Show "No folder" when there is none (FR-020). Pass the note's trashed status to `FolderMove`. Depends on T025
- [X] T027 [US3] Refresh the folder list and counts in `frontend/components/folders-nav.tsx` after a successful move (FR-024). `FolderMove` triggers the refresh. Pick a mechanism (shared context or a small event) and note the choice in the commit. Depends on T013 and T025

---

## Phase 7: User Story 4 - Drag a Note onto a Folder (Priority: P2)

**Goal**: A user drags a note from the list onto a folder in the navbar.

**Independent test**: [quickstart.md](./quickstart.md) scenario 6.

- [X] T028 [US4] In `frontend/components/note-list.tsx`, make note items draggable in the grid and list views using the custom MIME type `application/x-carta-note`, carrying the note id. Disable dragging for trashed notes (FR-021). Archived notes stay draggable. A drag must not navigate to the note page (FR-023). Depends on T018
- [X] T029 [US4] In `frontend/components/folders-nav.tsx`, make folders drop targets. On dragover, call `preventDefault` only for the custom MIME type and highlight valid targets (FR-022). On drop, call `moveNote` (FR-021). Show success and error messages (FR-025). A failed drop leaves the folder unchanged. Depends on T027 and T028

---

## Phase 8: User Story 6 - Apply Text Color and Highlights in the Editor (Priority: P2)

**Goal**: Text color, highlight, and clear-formatting controls in the note editor.

**Independent test**: [quickstart.md](./quickstart.md) scenario 8.

- [X] T030 [US6] Register `TextStyle`, `Color`, and `Highlight.configure({ multicolor: true })` in the `extensions` array of `frontend/components/rich-note-editor.tsx` (around line 40). `TextStyle` goes before `Color` (plan decision 9). Depends on T001
- [X] T031 [US6] Add a text-color popover to the toolbar in `frontend/components/rich-note-editor.tsx` (FR-028, FR-031). The palette has 10 entries, including "Default", which removes the color with `unsetColor`. Palette values are left to the developer. Depends on T030
- [X] T032 [US6] Add a highlight popover to the toolbar in `frontend/components/rich-note-editor.tsx` with 9 colors plus "Remove highlight", which uses `unsetHighlight` (FR-029, FR-031). Depends on T031
- [X] T033 [US6] Add a clear-formatting button to the toolbar in `frontend/components/rich-note-editor.tsx` that runs `unsetColor` and `unsetHighlight` only (FR-030). Bold, italic, underline, headings, and lists must not change. Depends on T032
- [X] T034 [US6] Confirm the save path in `frontend/app/(app)/notes/[id]/page.tsx` stores color and highlight marks in `content_rich`. Confirm the plain-text `content` derivation still works with the new marks (FR-032, FR-033, FR-034). Depends on T033

---

## Phase 9: User Story 5 - Use Folder Notes as LLM Context (Priority: P3)

**Goal**: Backend retrieval of a folder's notes for future LLM features. No user-visible LLM feature ships in this feature.

- [X] T035 [US5] Add `get_folder_context_notes` to `backend/services/folders.py`. It returns the title and plain-text content of every non-trashed note in a folder, scoped to the owner (FR-027, SC-008). Do not add a route or any LLM call (constitution II). Depends on T015

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T036 Run `npx tsc --noEmit` and ESLint on the changed frontend files. Fix new errors only. The two `set-state-in-effect` errors in `frontend/app/(app)/notes/[id]/page.tsx` were already there and are out of scope
- [ ] T037 Run `alembic upgrade head` from `backend/` and start the API with `uvicorn main:app`. Confirm the app imports cleanly and the folder routes appear. Depends on T004 and T010 and T016 and T024

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories
- **US1 (Phase 3)**: Depends on Foundational. This is the MVP base
- **US2 (Phase 4)**: Depends on US1 (needs the navbar and folder list)
- **US7 (Phase 5)**: Depends on Foundational. Can run alongside US1
- **US3 (Phase 6)**: Depends on US1 (folders must exist to move into)
- **US4 (Phase 7)**: Depends on US3 (uses `moveNote`) and US1 (drop targets are in the navbar)
- **US6 (Phase 8)**: Depends on Setup only. Independent of the folder stories
- **US5 (Phase 9)**: Depends on T015 from US2
- **Polish (Phase 10)**: Depends on the stories being built

### Story independence

- US1, US7, and US6 are independent of each other after Foundational.
- US2 builds on US1's navbar and list. US3 builds on US1's folders. US4 builds on US3 and US1.
- US5 is backend-only.

### Parallel opportunities

- Phase 2: T004, T005, and T008 can run in parallel with each other.
- US1: T012 can run in parallel with T009 to T011.
- US6 (T030 to T034) can run in parallel with the folder stories, since it works in `rich-note-editor.tsx` only.
- Within a story, tasks that share a file run in order and are not marked [P].

---

## Implementation Strategy

### MVP first

1. Phase 1 and Phase 2
2. Phase 3 (US1): create, rename, delete folders
3. Phase 4 (US2): browse notes by folder. Together with US1, this is the first useful release.

### Incremental delivery

1. Add US7 to confirm existing notes are safe (Phase 5)
2. Add US3, then US4, for moving notes (Phases 6 and 7)
3. Add US6 formatting (Phase 8), which can ship on its own
4. Add US5 backend retrieval (Phase 9)
5. Polish (Phase 10)

---

## Notes

- Mobile navigation placement is decided during implementation (T014).
- Trashed notes are hidden from folder views, and they keep their `folder_id` (plan decision 6). This is still an assumption to confirm.
- Each task is limited to the listed file or files so it can be done without more context.
