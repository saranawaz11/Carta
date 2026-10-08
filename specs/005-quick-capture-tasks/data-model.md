# Data Model

**Task** (`tasks`): `id` uuid pk; `clerk_user_id` text, indexed; `title` text; `due_at` timestamptz null; `due_has_time` bool (false = date only); `completed_at` timestamptz null (null = not done); `created_at` timestamptz.

State: not done (`completed_at` null) <-> done (set); delete is a hard delete. Ownership: all access scoped by `clerk_user_id`; other users' tasks return 404.
