# Configuration Model

| Entity | Fields and rules | Lifecycle |
|---|---|---|
| Image | Node runtime, production server, traced dependencies, public/static assets | Built from the locked dependency graph; immutable after build. |
| Public build settings | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Non-secret; embedded at build time; rebuild to change. Missing API URL permits build but produces a startup warning. |
| Runtime settings | `CLERK_SECRET_KEY`; `PORT` and `HOSTNAME` defaults | Secret supplied only at startup; never committed or baked. Missing Clerk secret causes a clear startup failure. |
| Backend endpoint | Browser-reachable HTTP(S) base URL; separate container network name | Browser URL drives REST, streaming and WebSocket origin; the Docker name is for container-side connectivity only. |

No persistent data or schema changes are introduced.
