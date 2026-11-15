# Data Model: Folder Management and Enhanced Note Formatting

## Folder (new table `folders`)

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID, PK | `gen_random_uuid()` |
| `clerk_user_id` | Text, not null | Owner; indexed |
| `name` | Text, not null | Trimmed; 1 to 60 characters |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()`; bumped on rename and on note move in or out |

Constraints:
- Unique index on `(clerk_user_id, lower(name))`. Enforces case-insensitive uniqueness (FR-005).

## Note (existing table `notes`, one new column)

| Field | Type | Rules |
|-------|------|-------|
| `folder_id` | UUID, nullable | FK to `folders.id`, `ON DELETE SET NULL`; must belong to the same `clerk_user_id` |

Index: `(clerk_user_id, folder_id)`.

## State Rules

- A note has zero or one folder (FR-014).
- Archived notes can be moved and stay archived. Trashed notes cannot be moved (FR-018). A trashed note keeps its `folder_id`, so restoring it returns it to its folder.
- Deleting a folder removes the row only. Its notes get `folder_id = NULL` (FR-009).
- Moving a note changes only `folder_id` and bumps `updated_at` on the old and new folder (FR-002, FR-016).

## Migration

`backend/alembic/versions/0007_folders.py`, revision `0007_folders`, down_revision `0006_intelligent_capture`.
