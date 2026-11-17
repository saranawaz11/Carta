# Tasks: Application Compose Deployment

**Input**: Design documents in `specs/015-application-compose/`

**Organization**: Tasks are grouped by user story. No test files or testing tasks are included, per the project constitution.

## Phase 1: Setup

The existing Compose project and frontend/backend build contexts require no initialization tasks.

## Phase 2: Foundational

No separate foundation is needed; tasks operate on the existing root deployment and documentation.

## Phase 3: User Story 1 - Start the application together (Priority: P1)

**Goal**: Start frontend, backend, and Redis together while using Neon and exposing service health.

**Independent test criteria**: With valid environment files, Compose starts all three services, Redis reports healthy, the frontend and backend respond on their host ports, and no PostgreSQL service starts.

- [X] T001 [US1] Configure frontend and backend builds, Redis, shared network, host ports, health checks, Redis health-gated backend dependency, `unless-stopped` restart policies, environment sources, and the `redis-data` volume in `docker-compose.yml`; remove the PostgreSQL service, port, and volume declaration without deleting existing resources.

## Phase 4: User Story 2 - Connect application services and users (Priority: P1)

**Goal**: Preserve browser-to-backend requests and voice connections while allowing service-name probes in both directions.

**Independent test criteria**: The browser uses a resolvable backend URL for API and WebSocket requests; frontend-to-backend and backend-to-frontend service-name probes both succeed; a signed-in user can load backend data when external services are available.

- [X] T002 [US2] Align `specs/015-application-compose/quickstart.md` with the Compose configuration and document browser-facing API/WebSocket URL checks, both internal service-name probes, and signed-in backend access; state which checks are blocked when external services are unavailable.

## Phase 5: User Story 3 - Protect configuration and existing data (Priority: P2)

**Goal**: Provide safe example settings and preserve secrets, Redis data, and existing PostgreSQL resources.

**Independent test criteria**: The root example contains setting names and safe placeholders only; existing environment files are unchanged; build contexts exclude secrets and generated artifacts; normal stop/restart preserves unexpired Redis data.

- [X] T003 [P] [US3] Add a root `.env.example` with the frontend public build settings and Clerk runtime secret name using safe placeholders; confirm `.gitignore` permits this example and retain the existing secret/artifact exclusions in `frontend/.dockerignore` and `backend/.dockerignore` without reading or changing real environment files.

## Phase 6: User Story 4 - Operate and diagnose the deployment (Priority: P2)

**Goal**: Document safe configuration, deployment operations, health limitations, and recovery.

**Independent test criteria**: An operator can follow the documented config, build, start, status, logs, stop, and rebuild commands; failures and health are inspectable; normal stopping does not remove volumes or orphaned PostgreSQL resources.

- [X] T004 [US4] Add an application deployment section to `README.md` covering services and networking, build-time public versus runtime secret settings, volumes, health-check limits, local versus production addresses, host-port conflicts, exact Compose operation commands, and avoiding automatic removal of the old PostgreSQL container or volumes.

## Dependencies and Execution Order

- **Setup and foundational phases**: No tasks; the project and service Dockerfiles already exist.
- **US1**: No story dependency; implement the Compose definition first.
- **US2**: Depends on US1 so the quickstart reflects the final service names, ports, and configuration.
- **US3**: Independent of US1 and can proceed in parallel; T003 touches the example and ignore files only.
- **US4**: Depends on US1-US3 so operator instructions match the completed deployment and configuration.

## Parallel Opportunities

- T003 can run in parallel with T001.
- T002 and T004 should follow T001; they update separate documentation files and can then run in parallel.

## Implementation Strategy

1. Implement T001 as the deployable MVP for starting the three services.
2. Complete T002 and T003 to cover service connectivity and safe configuration/data handling.
3. Complete T004 so the deployment can be operated and diagnosed from the README.
