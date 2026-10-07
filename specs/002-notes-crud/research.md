# Research

- **Driver**: Decision: sync SQLAlchemy 2.x + `psycopg[binary]`. Alternative: async + asyncpg.
- **Migrations**: Decision: Alembic, `env.py` reads `DATABASE_URL`, one revision. UUID default `gen_random_uuid()` (built in on Neon). Alternative: `create_all` (violates constitution).
- **Search**: Decision: `ILIKE` on title and content with `%`, `_`, `\` escaped in `q`. Alternative: full-text search (overkill; vector search is a later feature).
- **Purge**: Decision: on Deleted list read, delete the caller's notes with `deleted_at` older than 15 days. Known gap: an expired note can still be fetched by id until that list is read.
- **SWR optimism**: Decision: `mutate(key, fn, { optimisticData, rollbackOnError, populateCache: false, revalidate: true })`. Alternative: `useOptimistic` (not shared across pages).
- **Auth**: reuse `get_current_user_id`; token via `useAuth().getToken` passed to `apiFetch`.
- **shadcn**: init plus `button` and `input` only.
- **Unknowns**: none remaining.
