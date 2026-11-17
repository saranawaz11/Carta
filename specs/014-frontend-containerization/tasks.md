# Tasks: Frontend Containerization

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [container contract](./contracts/container.md), [quickstart.md](./quickstart.md)

**Scope**: Preserve existing frontend behavior and untracked container files; do not modify application logic, backend, or Compose. Do not add test files.

## Phase 1: Setup

- [X] T001 Record the original `frontend/Dockerfile` image build outcome, elapsed time, and image size before editing; if the baseline fails, record the error rather than claiming a size comparison. Baseline failed after 361 seconds: production-only installation omitted `@tailwindcss/postcss`; no image size is available.
- [X] T002 Inspect `frontend/package.json`, `frontend/package-lock.json`, `frontend/next.config.ts`, `frontend/Dockerfile`, and `frontend/.dockerignore`; identify the existing settings and preserve unrelated work.

## Phase 2: Foundational

- [X] T003 Update `frontend/.dockerignore` to exclude host dependencies, `.next`, `.env*`, Git metadata, build/test artifacts, editor/OS files, and generated type build info without exposing secrets or removing useful existing exclusions.

## Phase 3: US1 — Build a production image (P1, MVP)

**Goal**: Reproducibly build the frontend from the lockfile with cached dependencies.

**Independent verification**: Build from a clean checkout with public build settings and no secret; confirm `next build` succeeds, excluded files do not enter the context, and a source-only rebuild reuses the dependency layer. Measure clean and cached elapsed times against SC-002's under-50% target.

- [X] T004 [P] [US1] Add only the tentative `output: "standalone"` setting to `frontend/next.config.ts`; retain it only if the runtime and size gates in US2 and US5 pass.
- [X] T005 [P] [US1] Replace the dependency stage in `frontend/Dockerfile` with a matching official Node 24 slim base, manifest-and-lockfile-first copy, and `npm ci` including build-time development dependencies; do not set production-only installation before `npm ci`.
- [X] T006 [US1] Add a build stage to `frontend/Dockerfile` that copies source after dependencies, accepts `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` as non-secret build arguments, and runs `npm run build`; build without `CLERK_SECRET_KEY` and stop for resolution if it is required rather than baking it into the image.

## Phase 4: US2 — Run the production server (P1)

**Goal**: Serve existing pages and server functionality as a non-root production process.

**Independent verification**: Start the image with a real runtime Clerk secret; within 30 seconds request `/`, `/pcm-capture-worklet.js`, and protected `/notes`, compare protection with the existing production server, inspect the UID and cache permissions, then stop and restart without rebuilding.

- [X] T007 [US2] Add a runtime stage to `frontend/Dockerfile` using the same Node 24 slim family, copying standalone traced files plus `.next/static` and `public`, excluding build-only dependencies and preserving server-rendered and Clerk middleware behavior.
- [X] T008 [US2] Configure `frontend/Dockerfile` to bind `0.0.0.0:3000`, expose port 3000, run the production server as a non-root user with only necessary Next cache paths writable, and forward termination signals using `exec`; confirm startup, assets, middleware, UID, cache writes, and restart behavior.

## Phase 5: US3 — Configure without embedding secrets (P2)

**Goal**: Separate public build-time settings from runtime-only secrets.

**Independent verification**: Build with a public URL and no secret, start using a private env file, inspect image history and exported filesystem with a synthetic sentinel, confirm authentication, and confirm runtime changes cannot replace embedded public values. Missing Clerk secret must fail clearly; a build missing the API URL must succeed and the running container must warn.

- [X] T009 [P] [US3] Update `frontend/Dockerfile` startup configuration so `CLERK_SECRET_KEY` is accepted only at runtime and its absence fails clearly; warn when the API URL baked into the build is missing, even if a runtime public variable is supplied, without a localhost fallback.
- [X] T010 [P] [US3] Add `frontend/.env.example` with the four public variable names and `CLERK_SECRET_KEY` using empty or non-secret placeholders only; keep real `.env*` files excluded from the build context and do not stage ignored files automatically.
- [X] T011 [US3] Document in `frontend/README.md` the public build arguments, rebuild requirement, private runtime env file, missing-value behavior, and distinction between public and secret values; never include actual credentials.

## Phase 6: US4 — Reach the backend (P2)

**Goal**: Preserve browser API and WebSocket calls while allowing container-network connectivity.

**Independent verification**: With a separately configured backend on the same user-defined network, probe its `/test` endpoint from the frontend container by network name; from a browser, sign in and load backend data using the browser-reachable URL, including CORS, streaming, and voice WebSocket behavior.

- [X] T012 [US4] Document in `frontend/README.md` the separately created Docker network, a container-side backend-name probe, the distinct browser-reachable `NEXT_PUBLIC_API_URL`, backend `FRONTEND_ORIGIN` and Clerk authorized parties, and local versus remote address examples; do not add a server-side API flow or Compose service.

## Phase 7: US5 — Minimize and document the image (P3)

**Goal**: Keep only required runtime files and provide complete operator instructions.

**Independent verification**: Compare image sizes in bytes to the original baseline and inspect final files for build tools, dev dependencies, source-only files and secrets; follow the README on a clean checkout. Report an unavailable baseline or an unmet SC-002/SC-008 target explicitly.

- [X] T013 [US5] Review and minimize the final `frontend/Dockerfile` runtime contents; compare it with the T001 baseline and retain standalone only if the image is smaller and US2 functionality passes. Otherwise use a production `next start` alternative and record any unmet size criterion rather than claim success. Original baseline unavailable; user approved standalone based on a reconstructed full-dependency reference (1,241,550,353 bytes versus 392,241,573 bytes). Authenticated integration remains unverified.
- [X] T014 [US5] Complete `frontend/README.md` with each Dockerfile stage, exact build and run commands, port mapping, prerequisites, production-container checks, backend reachability and troubleshooting, aligned with the actual implementation and `specs/014-frontend-containerization/quickstart.md`.

## Phase 8: Cross-cutting completion

- [ ] T015 Reconcile `frontend/Dockerfile`, `frontend/next.config.ts`, `frontend/.dockerignore`, `frontend/.env.example`, and `frontend/README.md` with `specs/014-frontend-containerization/quickstart.md`; complete its manual validation, report unavailable credentials/services or failed metrics, and preserve the existing application and Compose configuration. Authenticated Clerk and real backend/voice validation remain outstanding; Docker DNS was checked with an isolated mock backend.

## Dependencies and Parallel Opportunities

- Setup T001–T002 precedes T003; T001 must run before changes to the build context.
- US1 follows the foundation. T004 and T005 are independent edits and can run together; T006 requires both.
- US2 follows US1. T007 precedes T008; both edit the Dockerfile and must be sequential.
- US3 follows US1 and US2. T009 and T010 can run together because they edit different files; T011 follows them.
- US4 follows US3 for the runnable configuration; T012 edits the same README as T011, so serialize them.
- US5 follows US2–US4; T013 finalizes the image before T014 documents it. T015 follows all stories.
- Within US1 run T004/T005 in parallel; within US3 run T009/T010 in parallel. US2, US4 and US5 have no safe same-story parallel edits; their checkpoints can be run independently after their prerequisites.

## Implementation Strategy

Deliver US1 first as the buildable-image MVP, then US2 for the minimum runnable P1 release, US3 for secure configuration, US4 for connectivity guidance, and US5 for size and complete documentation. Validate each checkpoint before continuing; standalone remains conditional until the runtime and size gates pass.
