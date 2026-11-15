# Quickstart: Folder Management and Enhanced Note Formatting

## Prerequisites

- Neon PostgreSQL URL and Clerk keys set in the existing environment files. Add any new variables to `.env` files (constitution V).
- Backend venv at `backend\.venv`.

## Setup

```powershell
cd D:\Projects\carta\backend
.\.venv\Scripts\activate
alembic upgrade head
uvicorn main:app --reload
```

```powershell
cd D:\Projects\carta\frontend
npm install
npm run dev
```

## Validation Scenarios

1. **Create, rename, delete folder (US1)**: Expand Folders in the navbar, create a folder, rename it, then delete it. Confirm the notes remain in the main list as unassigned.
2. **Duplicate name (FR-005)**: Create "Work", then try " work ". Expect a duplicate message.
3. **Folder view (US2)**: Open a folder. Expect its notes only, the folder name as heading, and an empty state for an empty folder.
4. **Move from note page (US3)**: Open a note, use "Move to folder" to move it, then remove it from the folder. Title and content stay the same.
5. **Trashed note (FR-018)**: Trash a note and confirm "Move to folder" is unavailable. The API returns 409.
6. **Drag and drop (US4)**: Drag a note onto a navbar folder. The folder highlights, the note is assigned, and the page does not navigate.
7. **Ownership (FR-026)**: Request another user's folder ID with `GET /api/folders/{id}/notes`. Expect 404.
8. **Formatting (US6)**: Apply a text color and a highlight, save, reopen, and confirm both persist. Use Clear formatting and confirm bold and italic remain.
9. **Existing notes (US7)**: Open a note created before this feature. Its content is unchanged and it has no folder.

Contract details are in [contracts/folders-api.md](./contracts/folders-api.md). Entities are in [data-model.md](./data-model.md).
