# Implementation Plan: Clerk Authentication

**Branch**: `001-clerk-auth` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

- Frontend: Clerk sign-up/sign-in/sign-out, all routes protected except `/sign-in` and `/sign-up`.
- Backend: local Clerk JWT verification as a reusable dependency; `GET /api/me` returns the Clerk user ID.
- Frontend calls `/api/me` with the Clerk token and shows the ID.

## Technical Context

- **Language/Version**: TypeScript (Next.js 16, React 19); Python >=3.11
- **Primary Dependencies**: `@clerk/nextjs`; FastAPI (existing), `PyJWT[crypto]`
- **Storage**: N/A (no database changes)
- **Testing**: None (per constitution)
- **Project Type**: Web app (`frontend/` + `backend/`)
- **Constraints**: Config via env vars only; no new dependencies beyond the two above

## Constitution Check

- Frontend talks only to the FastAPI API: PASS
- Clerk user ID is the identity; backend verifies token on every protected request: PASS
- Secrets/settings from environment variables: PASS
- Smallest implementation, few files/deps: PASS
- No tests, no extra documents: PASS
- Styling left to developer; only prebuilt Clerk components: PASS

## Key Design Decisions

- **Next.js 16 uses `proxy.ts` instead of `middleware.ts`**: it is the current convention in this version. Rejected: `middleware.ts` (deprecated).
- **`clerkMiddleware` + public-route matcher**: protects every route by default so new pages are safe. Rejected: per-page auth checks (easy to forget).
- **Clerk prebuilt `SignIn`/`SignUp`/`UserButton`**: least code, no styling work. Rejected: custom forms.
- **Verify JWT locally with PyJWT + Clerk JWKS**: no network call per request after key caching. Rejected: Clerk Backend SDK (extra dependency), per-request Clerk API call (slow).
- **Check issuer, expiry, `azp`**: blocks tokens from other instances/origins. Rejected: signature-only check.
- **Verifier lives in `backend/core/`**: one reusable dependency returning `sub`. Rejected: logic inside routes (violates constitution).
- **Authorization via `Authorization: Bearer` header**: matches spec; cross-origin API. Rejected: cookies (CSRF handling).
- **CORS allows only the configured frontend origin**: least privilege. Rejected: `*`.

## Project Structure

### Documentation

```text
specs/001-clerk-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/me.md
```

### Source Code

```text
backend/
├── main.py              # CORS + include router (edit)
├── core/
│   ├── config.py        # env settings
│   └── auth.py          # get_current_user_id dependency
└── routes/
    └── me.py            # GET /api/me

frontend/
├── proxy.ts             # clerkMiddleware, public: /sign-in, /sign-up
├── lib/api.ts           # apiFetch helper
└── app/
    ├── layout.tsx       # ClerkProvider (edit)
    ├── page.tsx         # UserButton + calls /api/me (edit)
    ├── sign-in/[[...sign-in]]/page.tsx
    └── sign-up/[[...sign-up]]/page.tsx
```

**Structure Decision**: Existing `frontend/` and `backend/` folders; `/api/me` has no business logic, so no service or data layer is added yet.

## Environment Variables

- Frontend: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- Backend: `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES` (frontend origin), `FRONTEND_ORIGIN`

## Complexity Tracking

- None.
