# Research

- **Next.js 16 routing hook**: Decision: `proxy.ts` with `clerkMiddleware`. Rationale: `middleware.ts` renamed in Next 16. Verify against `frontend/node_modules/next/dist/docs/` during implementation.
- **Token verification**: Decision: PyJWT with `PyJWKClient` on `{CLERK_ISSUER}/.well-known/jwks.json`, RS256. Rationale: local verification, cached keys. Alternatives: Clerk Backend SDK, Clerk API call.
- **Claims checked**: signature, `iss` equals `CLERK_ISSUER`, `exp`, `azp` in `CLERK_AUTHORIZED_PARTIES`; `sub` required. Rationale: Clerk's documented manual-verification checklist. Alternative: signature-only.
- **Clerk components**: Decision: `SignIn`, `SignUp`, `UserButton`. Alternative: custom forms.
- **Token on frontend**: Decision: `useAuth().getToken()` in a client component. Alternative: server-side `auth().getToken()`.
- **Unknowns**: none remaining.
