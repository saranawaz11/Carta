# API Contract: Folders

All endpoints require the Clerk bearer token. Each user sees only their own folders and notes.

## Shapes

- **FolderOut**: `{ id, name, note_count, created_at, updated_at }`. `note_count` counts non-trashed notes.
- **NoteOut**: existing shape plus `folder_id: UUID | null`.

## Endpoints

| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| GET | `/api/folders` | none | 200 `FolderOut[]`, ordered by `updated_at` desc | |
| POST | `/api/folders` | `{ name }` | 201 `FolderOut` | 400 empty or over 60 characters; 409 duplicate name |
| PATCH | `/api/folders/{id}` | `{ name }` | 200 `FolderOut` | 400; 404 not found or not owned; 409 duplicate |
| DELETE | `/api/folders/{id}` | none | 204 | 404 not found or not owned |
| GET | `/api/folders/{id}/notes?limit=50&offset=0` | none | 200 `NoteOut[]`, excludes trashed notes | 404 not found or not owned; `limit` max 100 |
| PUT | `/api/notes/{id}/folder` | `{ folder_id: UUID \| null }` | 200 `NoteOut` | 404 note or folder not owned; 409 note is trashed |

## Notes

- A 404 is returned for folders owned by someone else, so existence is not revealed (FR-026, SC-009).
- `folder_id: null` removes the note from its folder.
- Renaming, deleting, and moving follow the rules in [data-model.md](../data-model.md).
