# Feature Specification: Frontend Containerization

**Feature Branch**: `014-frontend-containerization` (no branch created; spec directory only)

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Now I want to containerize the frontend application. Inspect the frontend project (framework and version, runtime version, package manager, scripts, build process, environment variables, SSR/static/standalone output), then create an optimized production-ready Dockerfile in the frontend root with a .dockerignore. Requirements: official Node.js base image; correct package manager and lockfile; efficient dependency caching; multi-stage build; production build; production startup command; exposed port; environment variables configured without hardcoded secrets; non-root user; small final image; preserve server-side functionality; frontend must reach the backend from inside the Docker network; no application logic changes; no Docker Compose yet."

## Project Context (from inspection)

- **Framework**: Next.js 16.3.8 (App Router, `app/` directory) with React 19.2.8 and TypeScript 5.
- **Runtime**: Node.js 24 (the existing `frontend/Dockerfile` already targets `node:24`).
- **Package manager**: npm, with `frontend/package-lock.json` as the lockfile.
- **Scripts**: `dev` (`next dev`), `build` (`next build`), `start` (`next start`), `lint` (`eslint`).
- **Rendering**: Server-side features are in use. `frontend/proxy.ts` runs Clerk authentication middleware on every non-static request, and the app uses dynamic routes. The app is not a pure static export.
- **Output mode**: `frontend/next.config.ts` sets no `output` option, so the default `next start` server is used. Standalone output is not configured.
- **Environment variables**:
  - `NEXT_PUBLIC_API_URL`: backend base URL, read in browser-executed code (`frontend/lib/api.ts`, `frontend/lib/voice.ts`, `frontend/app/(app)/ask/page.tsx`). It is inlined at build time.
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: public Clerk settings, inlined at build time.
  - `CLERK_SECRET_KEY`: server-only secret, read at runtime by the Clerk server SDK. It must never be baked into the image.
- **Existing container artifacts**: `frontend/Dockerfile` (two-stage, `node:24` builder and `node:24-alpine` runtime, copies all of `node_modules`, runs `npm start` as a non-root user) and `frontend/.dockerignore` (already excludes `node_modules`, `.next`, `.env*`, and `.git`). Both need to be reviewed and hardened against this spec.
- **Backend container**: `backend/Dockerfile` serves FastAPI on port 8000. The backend is not yet defined in a Compose file, and this feature must not add one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a production frontend image (Priority: P1)

A developer or CI job builds a production image of the frontend from the `frontend/` directory without installing anything on the host beyond Docker. The build reproduces the same dependency versions recorded in the lockfile and produces a working production build.

**Why this priority**: Without a buildable image nothing else in the feature can be used. It is the foundation for every run and deployment scenario.

**Independent Test**: Run the build command from the `frontend/` directory on a clean checkout. The build completes with exit code 0 and the resulting image is listed by Docker.

**Acceptance Scenarios**:

1. **Given** a clean checkout with no `node_modules` or `.next` directories, **When** the operator runs the documented build command, **Then** the image builds successfully and `next build` completes inside the build.
2. **Given** only a source file has changed and the lockfile is unchanged, **When** the image is rebuilt, **Then** the dependency installation step is served from cache and is not re-downloaded.
3. **Given** `.env*` files, `node_modules`, `.next`, or `.git` exist on the host, **When** the image is built, **Then** none of those files are copied into the image build context.

---

### User Story 2 - Run the container as a production server (Priority: P1)

An operator starts the image with runtime environment variables and the application serves its pages and server-side features on the documented port, without needing the source code or dev dependencies.

**Why this priority**: A production image that does not start, or that drops server-side behaviour, delivers no value. This is required for the MVP.

**Independent Test**: Start the container with the documented run command, then request the home page and a protected route over HTTP. The home page returns a successful response and the protected route redirects or responds according to existing authentication behaviour.

**Acceptance Scenarios**:

1. **Given** a built image and the required runtime variables, **When** the operator starts the container with the documented run command, **Then** the application listens on the documented port and responds to HTTP requests within 30 seconds.
2. **Given** the container is running, **When** a request is made to a route protected by the existing authentication middleware, **Then** the middleware still runs and behaves exactly as it does outside the container.
3. **Given** the container is running, **When** the process is inspected, **Then** it runs as a non-root user.
4. **Given** the container is stopped, **When** the operator starts it again with the same command, **Then** it starts without rebuilding.

---

### User Story 3 - Configure the image without secrets in it (Priority: P2)

An operator supplies environment-specific values in two distinct ways: public values that the browser needs are provided at build time, and secret values are provided only at container start time. No secret value appears in the Dockerfile, the image layers, or the build context.

**Why this priority**: Clear separation of build-time and runtime configuration is required for security and for using one image across environments. It is essential but depends on Story 1 and Story 2 being in place.

**Independent Test**: Inspect the image history and filesystem for the secret value. Confirm the value is absent. Confirm the value is present in the running container's environment only.

**Acceptance Scenarios**:

1. **Given** the image has been built, **When** the operator searches the image history and filesystem for `CLERK_SECRET_KEY`, **Then** the secret value is not found.
2. **Given** the operator provides a different `NEXT_PUBLIC_API_URL` at build time, **When** the browser loads the app, **Then** requests go to that URL.
3. **Given** the operator provides `CLERK_SECRET_KEY` only at run time, **When** the container starts, **Then** server-side authentication works.

---

### User Story 4 - Reach the backend from the container network (Priority: P2)

The existing frontend calls the backend API from the browser, so the public API address must be reachable from the user's machine. The frontend container and backend can also share a Docker network, where the backend is reachable by its network name; this does not add a new server-side application flow.

**Why this priority**: Communication with the backend is the core function of the frontend. It depends on Stories 1 to 3.

**Independent Test**: With the backend running on the same Docker network, start the frontend container and trigger a backend call from a page. The call succeeds and returns data.

**Acceptance Scenarios**:

1. **Given** the backend is reachable at the configured address, **When** a browser-side page makes an API call, **Then** the call reaches the backend and the response is shown.
2. **Given** the backend is on the same user-defined Docker network as the frontend, **When** an operator probes the backend from inside the frontend container by its network name, **Then** the connection succeeds.
3. **Given** no backend address is configured, **When** the container starts, **Then** the failure is visible in logs and is not silently pointed at `localhost` inside the container.

---

### User Story 5 - Keep the final image small and documented (Priority: P3)

The final image contains only what the production server needs. The operator has written instructions for building, running, and testing the container.

**Why this priority**: Image size and documentation improve operations but do not block the core function.

**Independent Test**: Inspect the final image size and file list. Follow the documented steps on a clean machine.

**Acceptance Scenarios**:

1. **Given** the final image is built, **When** its size and contents are inspected, **Then** build tools, source files, test files, `.git`, and dev dependencies are absent.
2. **Given** the README instructions, **When** a new operator follows them step by step, **Then** the image builds and runs without additional guidance.

---

### Edge Cases

- What happens when `NEXT_PUBLIC_API_URL` is not provided at build time? The build should still complete, but the browser-side API calls will be broken. The build must not silently fall back to `localhost` for a production image; this should be documented and visible.
- What happens when `CLERK_SECRET_KEY` is missing at container start? The container should fail fast with a clear message rather than serving broken authentication.
- What happens when the lockfile and `package.json` disagree? The install step must fail rather than silently resolving different versions (use the lockfile strictly).
- What happens when the container is run as a non-root user but writes to the filesystem? Only directories the runtime needs for Next.js cache must be writable; the application code must remain read-only to that user.
- What happens when the host port is already in use? The operator can map a different host port without rebuilding the image.
- What happens when the backend is down? The frontend container must still start and serve its pages; API failures are surfaced by the existing error handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a production Dockerfile in the `frontend/` directory.
- **FR-002**: The Dockerfile MUST use an official Node.js base image that matches the project's runtime (Node.js 24 line).
- **FR-003**: The build MUST install dependencies strictly from `frontend/package-lock.json` using npm, failing if the lockfile and manifest disagree.
- **FR-004**: The build MUST cache dependency installation so that changes to application source alone do not re-download dependencies.
- **FR-005**: The build MUST use a multi-stage process so that build-only tools and development dependencies are not present in the final image.
- **FR-006**: The build MUST run `next build` and produce a production output inside the image.
- **FR-007**: The final image MUST start the production server (not the development server) by default.
- **FR-008**: The final image MUST expose the port the production server listens on and document it.
- **FR-009**: The final image MUST run the application process as a non-root user.
- **FR-010**: No secret value (including `CLERK_SECRET_KEY`) MUST be written into the Dockerfile, any image layer, or the build context.
- **FR-011**: Public values that the browser needs (`NEXT_PUBLIC_*`) MUST be supplied at build time because Next.js inlines them into client code; this MUST be documented.
- **FR-012**: Server-only values (for example `CLERK_SECRET_KEY`) MUST be supplied at container run time only.
- **FR-013**: The system MUST preserve all existing server-side behaviour, including the authentication middleware in `frontend/proxy.ts` and server rendering of dynamic routes.
- **FR-014**: The system MUST NOT change application logic, routes, components, or the feature set of the frontend.
- **FR-015**: The browser-facing backend address MUST be configurable without rebuilding the source; because it is inlined at build time, the build argument MUST be documented. The default MUST NOT be a `localhost` address that is unreachable from the user's browser in a production image.
- **FR-016**: The frontend container MUST be able to reach a separately networked backend by its Docker network name; the design MUST NOT require `localhost` to reach the backend from inside the container. No new server-side application flow is required.
- **FR-017**: The `.dockerignore` file MUST exclude `node_modules`, `.next`, `.env*` files, `.git`, editor and OS files, test artifacts, and generated type build info.
- **FR-018**: The system MUST document exact build and run commands, how to verify the container is serving, and how to test that the frontend reaches the backend.
- **FR-019**: The feature MUST NOT add a Docker Compose file or change the existing `docker-compose.yml`.
- **FR-020**: The system SHOULD evaluate Next.js standalone output and adopt it only if it preserves server-side behaviour and reduces image size; any `next.config.ts` change MUST be limited to the output setting.

### Key Entities *(include if feature involves data)*

- **Frontend image**: The built, runnable artifact containing the production Next.js server, its runtime dependencies, and the minimal files required to serve the app.
- **Build-time configuration**: Public values (`NEXT_PUBLIC_API_URL`, Clerk publishable key and public sign-in/sign-up URLs) passed when the image is built and baked into client code.
- **Runtime configuration**: Values supplied when the container starts, including `CLERK_SECRET_KEY`, and kept out of the image.
- **Backend endpoint**: The address the browser uses for API calls and the Docker-network address available to container-side connections.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The frontend image builds from a clean checkout in a single documented command with zero manual steps beyond providing the build values.
- **SC-002**: A rebuild after a source-only change reuses the cached dependency installation and completes in under 50% of the time of a clean build.
- **SC-003**: The final image contains no build-only tools, no source-only files excluded by `.dockerignore`, and no secret values, verified by inspection.
- **SC-004**: The running container serves the home page successfully and responds to the first request within 30 seconds of start.
- **SC-005**: The application process inside the running container runs as a non-root user in 100% of starts.
- **SC-006**: A page that calls the backend displays backend data when the frontend container and backend are both running; a separate container-side probe reaches the backend by its Docker network name.
- **SC-007**: Authentication-protected routes behave the same inside the container as they do when the frontend is run directly with the production server.
- **SC-008**: The final image is materially smaller than the existing `frontend/Dockerfile` output, which copies the full `node_modules` tree into the runtime stage.

## Assumptions

- The production server is served by `next start` unless the standalone output evaluation (FR-020) shows it is both safe and smaller; if standalone output is adopted, the change is limited to the output setting in `frontend/next.config.ts`.
- Clerk authentication behaves identically inside the container as it does with the existing local setup; no change to Clerk configuration is required.
- The backend is reachable from the browser at a public or host-published address that is supplied as a build argument; the Docker-network name is reachable from containers but is not assumed to be browser-resolvable.
- The backend will be started separately and placed on the same user-defined Docker network as the frontend; defining that network and the backend service is out of scope (Compose is excluded by FR-019).
- Node.js 24 is supported by all current dependencies, as the existing `frontend/Dockerfile` already uses it.
- Operators have Docker installed and can pass environment values via command-line flags or an env file that is not committed.
- The existing `frontend/.dockerignore` is a sound starting point and will be extended rather than replaced.
- Changes to the existing `frontend/Dockerfile` are in scope because it is the artifact this feature replaces or hardens.
