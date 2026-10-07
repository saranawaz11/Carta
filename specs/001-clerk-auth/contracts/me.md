# Contract: GET /api/me

- **Auth**: `Authorization: Bearer <Clerk session token>`
- **200**: `{ "user_id": "user_..." }`
- **401**: `{ "detail": "..." }` for missing, malformed, invalid, or expired token; `WWW-Authenticate: Bearer`
- **CORS**: allows only `FRONTEND_ORIGIN`; headers `Authorization`, `Content-Type`

## Dependency

- `get_current_user_id` (in `backend/core/auth.py`): returns `sub` as `str`; raises 401 on any verification failure.
