# Data Model

## Note (`notes`)

- `id` uuid PK, default `gen_random_uuid()`
- `clerk_user_id` text, not null, indexed
- `title` text, not null, default `''`
- `content` text, not null, default `''`
- `archived_at` timestamptz, nullable
- `deleted_at` timestamptz, nullable
- `created_at` timestamptz, not null, default now
- `updated_at` timestamptz, not null, default now, refreshed on every update

## States

- **active**: `archived_at` null and `deleted_at` null
- **archived**: `archived_at` set and `deleted_at` null
- **deleted**: `deleted_at` set

## Transitions

- archive: active -> archived (sets `archived_at`)
- unarchive: archived -> active
- delete: active or archived -> deleted (sets `deleted_at`)
- restore: deleted -> active (clears `deleted_at` and `archived_at`)
- permanent delete: deleted only; row removed
- purge: deleted rows with `deleted_at` older than 15 days
- edit (PATCH): not allowed on deleted notes (409)
