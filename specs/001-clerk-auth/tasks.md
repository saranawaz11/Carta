# Tasks: Clerk Authentication

**Input**: [plan.md](./plan.md), [spec.md](./spec.md), [contracts/me.md](./contracts/me.md)
**Tests**: None (per constitution).

## Phase 1: Setup

- [X] T001 [P] Add `@clerk/nextjs` in `frontend/package.json` (`npm install @clerk/nextjs`)
- [X] T002 [P] Add `PyJWT[crypto]` in `backend/pyproject.toml` (`uv add "pyjwt[crypto]"`)
- [X] T003 [P] Create `frontend/.env.local` and `backend/.env` with the env vars listed in plan.md; confirm both are gitignored

## Phase 2: Foundational

- [X] T004 Wrap the app in `ClerkProvider` in `frontend/app/layout.tsx`
- [X] T005 [P] Create env settings (`CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `FRONTEND_ORIGIN`) in `backend/core/config.py`

## Phase 3: User Story 1 - Sign up, sign in, sign out (P1)

**Goal**: Visitor can sign up, sign in, and sign out.
**Independent Test**: Complete each flow and confirm session state changes.

- [X] T006 [P] [US1] Add prebuilt `SignIn` page in `frontend/app/sign-in/[[...sign-in]]/page.tsx`
- [X] T007 [P] [US1] Add prebuilt `SignUp` page in `frontend/app/sign-up/[[...sign-up]]/page.tsx`
- [X] T008 [US1] Add `UserButton` (sign-out) to `frontend/app/page.tsx`

## Phase 4: User Story 2 - Protected pages (P2)

**Goal**: Signed-out users are redirected to sign-in on every page except sign-in/sign-up.
**Independent Test**: Open `/` signed out; confirm redirect. Open `/sign-in` and `/sign-up`; confirm they load.

- [X] T009 [US2] Create `frontend/proxy.ts` with `clerkMiddleware` protecting all routes except `/sign-in(.*)` and `/sign-up(.*)` (check `node_modules/next/dist/docs/` for the Next 16 convention)

## Phase 5: User Story 3 - Verified identity from the backend (P3)

**Goal**: Backend verifies the token; frontend shows the Clerk user ID from `GET /api/me`.
**Independent Test**: `GET /api/me` returns 401 without a valid token; signed-in page shows the user ID.

- [X] T010 [US3] Implement `get_current_user_id` in `backend/core/auth.py`: parse Bearer header, verify RS256 signature via `PyJWKClient` on `{CLERK_ISSUER}/.well-known/jwks.json`, check `iss`, `exp`, `azp`, require `sub`, return `sub`; any failure raises 401 with `WWW-Authenticate: Bearer`
- [X] T011 [US3] Add `GET /api/me` returning `{"user_id": ...}` using the dependency in `backend/routes/me.py`
- [X] T012 [US3] Register the router and CORS (only `FRONTEND_ORIGIN`; headers `Authorization`, `Content-Type`) in `backend/main.py`
- [X] T013 [P] [US3] Create `apiFetch` helper (Bearer token to `NEXT_PUBLIC_API_URL`) in `frontend/lib/api.ts`
- [X] T014 [US3] Call `/api/me` via `apiFetch` and display the user ID in `frontend/app/page.tsx`

## Phase 6: Polish

- [ ] T015 Run the checks in [quickstart.md](./quickstart.md) end to end

## Dependencies

- Setup -> Foundational -> US1, US2, US3.
- US1 and US2 are independent of each other; US3 backend (T010-T012) is independent of frontend stories.
- T014 depends on T008 (same file) and T010-T013.

## Parallel Examples

- T001, T002, T003 together.
- T006 and T007 together.
- Backend T010-T012 in parallel with frontend T006-T009.

## Strategy

- MVP: Phases 1-3 (US1), then US2, then US3.
