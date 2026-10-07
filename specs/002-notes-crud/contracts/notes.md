# Contract: /api/notes

- **Auth**: `Authorization: Bearer <Clerk token>` on all; 401 if invalid.
- **Scope**: every query filtered by the caller's Clerk user ID; another user's note id returns 404.
- **Note**: `{ id, title, content, archived_at, deleted_at, created_at, updated_at }`
- **Errors**: 404 not found/not owned; 409 invalid state transition; 422 invalid body.

## Endpoints

- `POST /api/notes` -> 201 Note (empty title and content)
- `GET /api/notes?status=active|archived|deleted&q=` -> 200 Note[], newest `updated_at` first; `status` defaults to `active`; `q` is an ILIKE match on title or content; `status=deleted` first purges notes deleted over 15 days ago
- `GET /api/notes/{id}` -> 200 Note
- `PATCH /api/notes/{id}` body `{ title?, content? }` -> 200 Note; 409 if deleted
- `POST /api/notes/{id}/archive` -> 200 Note; 409 unless active
- `POST /api/notes/{id}/unarchive` -> 200 Note; 409 unless archived
- `POST /api/notes/{id}/delete` -> 200 Note (soft delete); 409 if already deleted
- `POST /api/notes/{id}/restore` -> 200 Note; 409 unless deleted
- `DELETE /api/notes/{id}` -> 204; 409 unless already soft-deleted
