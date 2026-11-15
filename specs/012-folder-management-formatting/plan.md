# Implementation Plan: Folder Management and Enhanced Note Formatting

**Branch**: `012-folder-management-formatting` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-folder-management-formatting/spec.md`

## Summary

Add single-level, user-owned folders (new `folders` table and nullable `notes.folder_id`), folder endpoints, a navbar Folders section with native drag-and-drop, a "Move to folder" control on the note page, and Tiptap color, highlight, and clear-formatting controls. Backend follows routes -> services -> repositories. Styling and UI interaction are left to the developer per the constitution; this plan covers logic, API, and frontend wiring.

**Key design decisions** (one-line reason and rejected alternative each):

| # | Decision | Reason | Rejected alternative |
|---|----------|--------|----------------------|
| 1 | Separate `folders` table plus nullable `notes.folder_id` (FK, ON DELETE SET NULL) | Enforces one folder per note; folder delete keeps notes | Text `folder` column on notes: no folder entity for rename, ordering, or uniqueness |
| 2 | Case-insensitive unique index on `(clerk_user_id, lower(name))` | DB enforces FR-005 even under concurrent renames | Application-only check: race condition |
| 3 | Recency sort uses `folders.updated_at`, bumped on rename and on note move in or out | Matches the clarified definition of "changed" (FR-002) | Max of folder notes' `updated_at`: note content edits would reorder folders |
| 4 | Dedicated `PUT /api/notes/{id}/folder` | Moving never touches title, content, or embeddings (FR-016) | Adding `folder_id` to `PATCH /api/notes/{id}`: goes through `update_note` content logic |
| 5 | Trash rule enforced in the service (409 for trashed notes) | Holds for every API caller, not only the UI (FR-018, FR-021) | UI-only disabling |
| 6 | Folder view and folder-notes endpoint exclude trashed notes; trashed notes keep `folder_id` | Trash stays hidden from list views; restore returns the note to its folder | Showing trashed notes in folder view (assumption, confirm before tasks) |
| 7 | Folder notes paginated (`limit` default 50, max 100) | Edge case for very large folders | Loading all notes at once |
| 8 | Native HTML5 drag-and-drop with a custom MIME type | No new dependency; only note-to-folder drop is needed | `@dnd-kit` (new dependency for one drop type) |
| 9 | Tiptap `text-style`, `color`, `highlight` at `^2.9.2` | Official marks that persist inside existing `content_rich` JSON | Custom Tiptap mark (re-implements existing extensions) |
| 10 | Clear formatting runs `unsetColor` and `unsetHighlight` only | Clarified in spec (FR-030) | `unsetAllMarks` (would remove bold, italic, underline) |
| 11 | Native `<select>` for "Move to folder" | Avoids adding a shadcn component (constitution V) | New shadcn Select component |
| 12 | Main notes list unchanged; folder notes still appear there | US7 keeps existing list behavior; spec does not ask to hide them | Excluding folder notes from main list |

## Technical Context

**Language/Version**: Python 3.11 (backend); TypeScript with Next.js 16.3.8 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy, Alembic (backend); Tiptap 2.9.x, shadcn/ui (frontend)

**Storage**: Neon PostgreSQL via Alembic migration `0007_folders`; Tiptap JSON stays in `notes.content_rich`

**Testing**: None planned (constitution forbids test files and testing tasks). Manual checks in [quickstart.md](./quickstart.md).

**Target Platform**: Web browser (desktop and narrow screens); Linux container for the backend

**Project Type**: Web application (FastAPI web service plus Next.js frontend)

**Performance Goals**: Folder notes returned in pages of 50 (max 100); no numeric latency target beyond spec SC-001 to SC-003

**Constraints**: Routes hold no business logic; frontend calls REST only; no new shadcn components; no test files

**Scale/Scope**: Up to 100 folders and 10,000 notes per user (assumed, see [research.md](./research.md)); single-level folders

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|-----------|--------|------|
| I. Note ownership | PASS | Folder and note queries filter by `clerk_user_id` |
| II. LLM note assistance | PASS | No LLM call added; folder-notes retrieval supports future use (FR-027); OpenAI stays backend-only |
| III. API and backend boundaries | PASS | Frontend calls REST only; routes -> services -> repositories |
| IV. Data and schema changes | PASS | Alembic `0007_folders`; no manual database edits |
| V. Small, spec-driven changes | PASS | Reuses `DeleteConfirmModal`, `ui/dialog.tsx`, and note-list views; three new packages justified below |
| Agent working rules | PASS | No test files or testing tasks; styling left to developer; plan kept short |

Post-design re-check (after Phase 1): PASS, no change.

## Project Structure

### Documentation (this feature)

```text
specs/012-folder-management-formatting/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
```text
backend/
├── alembic/versions/0007_folders.py     # new: folders table, notes.folder_id
├── models.py                            # + Folder model, Note.folder_id
├── schemas.py                           # + folder schemas, NoteOut.folder_id
├── repositories/folders.py              # new: folder and note-folder data access
├── services/folders.py                  # new: name rules, ownership, trash rule
├── routes/folders.py                    # new: /api/folders endpoints
├── routes/notes.py                      # + PUT /api/notes/{id}/folder
└── main.py                              # register folders router

frontend/
├── lib/folders.ts                       # new: folder API calls
├── components/folders-nav.tsx           # new: navbar Folders section, drop targets
├── components/folder-dialog.tsx         # new: create and rename dialog (ui/dialog.tsx)
├── components/folder-move.tsx           # new: "Move to folder" select on note page
├── components/note-list.tsx             # + draggable notes; views reused by folder page
├── components/rich-note-editor.tsx      # + color, highlight, clear-formatting controls
├── components/delete-confirm-modal.tsx  # reused for folder delete
├── components/sidebar.tsx               # + FoldersNav
├── app/(app)/folders/[id]/page.tsx      # new: folder view
└── app/(app)/notes/[id]/page.tsx        # + FolderMove and current folder display
```

**Structure Decision**: Web application using the existing `backend/` (routes -> services -> repositories) and `frontend/` (Next.js App Router). No new top-level directories. Mobile navigation placement is confirmed during implementation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Three new Tiptap packages (`@tiptap/extension-text-style`, `-color`, `-highlight`) | Colors and highlights must be real Tiptap marks saved in `content_rich` | Custom marks would re-implement these extensions and risk breaking existing content |
