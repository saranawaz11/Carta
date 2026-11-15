# Feature Specification: Backend Containerization

**Feature Branch**: `013-backend-containerization`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "I want to containerize the backend application. Inspect the backend, then create an optimized, production-ready Dockerfile inside the backend root directory, with a .dockerignore, using official base image matching the runtime version, cached dependency installation, a non-root user, no hardcoded secrets, environment-variable configuration, and a container that starts successfully. Do not create Docker Compose yet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a runnable backend image (Priority: P1)

A developer can build a container image of the backend from the backend root directory, without any local Python setup, and start it so the API responds on its documented port.

**Why this priority**: Without a buildable and startable image, none of the other containerization goals (deployment, consistency, CI use) are possible.

**Independent Test**: From the backend root, run the documented build command, then run the image with the required configuration supplied as environment variables. The API responds to a request on the exposed port.

**Acceptance Scenarios**:

1. **Given** a clean checkout of the repository and Docker available, **When** the developer runs the documented build command from the backend root, **Then** the build completes without errors and produces a single image.
2. **Given** the built image, **When** the developer runs it with the documented environment variables, **Then** the backend starts and serves requests on the documented port within a reasonable startup time.
3. **Given** the built image, **When** the developer runs it without any environment variables, **Then** the container either starts with safe defaults or fails with a clear, human-readable message naming the missing setting; it does not crash silently.

---

### User Story 2 - Configure the container without rebuilding (Priority: P2)

An operator can change configuration (database location, cache location, AI service keys, model names, frontend origins, authentication settings) by passing environment variables at run time, without editing files or rebuilding the image.

**Why this priority**: The same image must be promotable across environments; secrets and environment-specific values must never be baked into the image.

**Independent Test**: Build the image once, then run it twice with different environment variable values and confirm the application reflects each value (e.g., a different allowed frontend origin in responses).

**Acceptance Scenarios**:

1. **Given** the image, **When** an operator supplies a value for each setting the backend reads, **Then** the running backend uses those values.
2. **Given** the image's file system and history, **When** a reviewer searches it, **Then** no credentials, API keys, or environment-specific secrets are present.
3. **Given** a local secrets file exists in the backend folder, **When** the image is built, **Then** that file is not copied into the image.

---

### User Story 3 - Build a lean, safe image (Priority: P3)

A maintainer can rebuild the image quickly after source-only changes and trust that it runs with limited privileges and without unnecessary files.

**Why this priority**: Faster rebuilds and reduced attack surface improve day-to-day development and production hygiene, but the image is usable without them.

**Independent Test**: Change one application source file and rebuild; confirm dependency installation is reused from cache. Inspect the running container's user and confirm it is not the root user.

**Acceptance Scenarios**:

1. **Given** a previously built image and only application source changes, **When** the developer rebuilds, **Then** the dependency installation step is served from cache.
2. **Given** the running container, **When** the process user is inspected, **Then** the application runs as a non-root user.
3. **Given** the backend folder contains virtual environments, caches, version-control history, or local secret files, **When** the image is built, **Then** none of these are included in the image.

---

### Edge Cases

- What happens when the required database or Redis service is unreachable at startup? The container should still start the web server and surface connection errors through the application's normal error handling, not crash the image build or hang indefinitely.
- What happens when the build runs on a machine with a stale local virtual environment? The stale environment must not leak into the image.
- How does the system handle a dependency lock file that is out of date with the dependency list? The build should fail rather than silently install unpinned versions.
- What happens when the container is started with a port already in use on the host? The operator can map a different host port without rebuilding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backend MUST be buildable into a container image from the backend root directory using a single documented command.
- **FR-002**: The image MUST use an official, publicly available runtime base image whose language version matches the backend's declared minimum supported version.
- **FR-003**: Backend dependencies MUST be installed from the repository's existing dependency declarations and lock file, without changing any dependency version.
- **FR-004**: The build MUST reuse cached dependency installation when only application source files change.
- **FR-005**: The image MUST start the backend web server automatically on container start, using the application's existing entry point.
- **FR-006**: The backend MUST listen on a documented port inside the container, and that port MUST be declared in the image.
- **FR-007**: The backend MUST bind to all network interfaces inside the container so that it is reachable from the host.
- **FR-008**: The image MUST NOT contain any secret, credential, API key, or environment-specific value.
- **FR-009**: All runtime configuration MUST be supplied through environment variables at container start.
- **FR-010**: The container MUST run the application as a non-root user.
- **FR-011**: The build context MUST exclude virtual environments, caches, version-control metadata, local environment and secret files, test artifacts, and local build outputs.
- **FR-012**: The image MUST NOT include the application's frontend code or unrelated project folders.
- **FR-013**: The application's behavior and source logic MUST NOT be modified by the containerization work.
- **FR-014**: The image MUST NOT include build-only tooling that the running application does not need.
- **FR-015**: The documentation MUST list every environment variable the backend reads, which ones are required, and which have defaults.
- **FR-016**: The documentation MUST provide the exact commands to build the image and run the container with environment variables.

### Key Entities *(include if feature involves data)*

- **Backend Container Image**: A self-contained, versioned package of the backend runtime, its dependencies, and application source. Built from the backend root and identified by a tag.
- **Runtime Configuration**: The set of environment variables the backend reads at startup (database connection, cache connection, authentication issuer and parties, AI service credentials and model names, allowed frontend origins, voice-input tuning). Supplied per run, never stored in the image.
- **Build Context Exclusion Set**: The list of files and folders kept out of the image build, such as local environments, caches, version-control history, and local secrets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with only a container runtime installed can build and start the backend with no more than two commands, documented in the backend README or equivalent.
- **SC-002**: The running backend responds to a basic request on its documented port within 30 seconds of container start.
- **SC-003**: Rebuilding after a change to one application source file completes in under 30 seconds on a machine that has previously built the image.
- **SC-004**: A search of the built image finds zero credential or secret values and zero copies of local secret files.
- **SC-005**: The running application process is not owned by the root user in 100% of container starts.
- **SC-006**: The same image runs in two different configurations (different frontend origin and database address) without rebuilding, and each configuration is reflected in behavior.
- **SC-007**: The image size is no larger than what the runtime base and locked dependencies require, with no build-only tools or development dependencies present.

## Assumptions

- The backend's current entry point, framework, and start command are discovered from the repository during planning; this spec assumes they remain the existing web application served on port 8000.
- The backend declares Python 3.11 as its minimum supported version; the official Python 3.11 slim base image is the target runtime.
- Dependency management continues to use the existing project metadata and lock file; no new dependency manager is introduced.
- PostgreSQL (with vector support), Redis, and external AI/authentication services are provided by the operator and are not containerized in this feature.
- Docker Compose orchestration is explicitly out of scope and will be a separate feature.
- Database schema migrations are out of scope for the image build and are run separately by the operator.
- The frontend is not containerized in this feature.
- A reasonable default for the exposed port is 8000, matching the backend's existing development convention.
- Production hardening beyond non-root execution, minimal image content, and secret-free configuration (for example, TLS termination, health probes, resource limits) is out of scope for this feature.
