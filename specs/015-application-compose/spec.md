# Feature Specification: Application Compose Deployment

**Feature Branch**: `main` (no feature branch created)

**Created**: 2026-11-15

**Status**: Draft

**Input**: Configure the whole application with Compose, retain Redis, remove the unused local PostgreSQL service when the application uses Neon, preserve functionality and existing environment settings, and document and validate deployment without changing business logic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start the application together (Priority: P1)

An operator builds and starts the frontend, backend, and cache as one application while continuing to use the hosted database.

**Why this priority**: A coordinated, usable application is the core outcome.

**Independent Test**: With valid configuration and existing images, start the application and open the home page and backend endpoint.

**Acceptance Scenarios**:

1. **Given** valid external service settings, **When** the operator builds and starts the application, **Then** the frontend, backend, and cache start and their applicable health states become visible.
2. **Given** the hosted database is configured, **When** the application starts, **Then** the backend uses that database and no local PostgreSQL service is started.
3. **Given** the cache is not ready, **When** the application starts, **Then** its readiness is not inferred solely from its start order and the operator can identify the unhealthy service.

### User Story 2 - Connect application services and users (Priority: P1)

A user accesses the frontend and its existing backend-powered features, while operators can check connectivity between services.

**Why this priority**: The application is not useful if its existing requests cannot reach the backend.

**Independent Test**: From a browser, access a backend-backed feature; separately probe each application service from the other service's network.

**Acceptance Scenarios**:

1. **Given** a browser-reachable backend address and correct origin and authentication settings, **When** a signed-in user loads backend data, **Then** the request succeeds.
2. **Given** the services are running, **When** the operator probes the backend from the frontend container and the frontend from the backend container, **Then** each service can reach the other by its internal service name.
3. **Given** a browser outside the container network, **When** it makes an application request or voice connection, **Then** it uses a browser-reachable address rather than relying on an internal service name.

### User Story 3 - Protect configuration and existing data (Priority: P2)

An operator supplies environment-specific settings without committing credentials or losing existing cache or database data.

**Why this priority**: Credentials and stored user data must remain protected across deployment changes.

**Independent Test**: Inspect the example configuration and deployment definition, then restart services with a configured cache and confirm its existing unexpired data remains.

**Acceptance Scenarios**:

1. **Given** existing environment files, **When** the deployment is configured, **Then** their contents remain unchanged and a separate example lists necessary names with safe placeholders.
2. **Given** an existing Redis data volume and unexpired chat history, **When** services are stopped and started normally, **Then** the same history remains available.
3. **Given** an existing PostgreSQL volume, **When** its unused service is removed from configuration, **Then** the volume and its data are not deleted or migrated automatically.
4. **Given** missing mandatory settings, **When** an operator builds or starts the application, **Then** the failure or warning identifies the missing setting without revealing its value.
5. **Given** local secret files and generated artifacts, **When** images are built, **Then** those files are excluded from their build contexts.

### User Story 4 - Operate and diagnose the deployment (Priority: P2)

An operator can validate configuration, inspect service status and logs, rebuild changes, and safely stop the application.

**Why this priority**: Repeatable operation and clear failure diagnosis are necessary for maintenance.

**Independent Test**: Follow the documented commands from a clean checkout and observe service status, logs, stopping, and rebuilding.

**Acceptance Scenarios**:

1. **Given** a valid example-derived configuration, **When** the operator validates it, **Then** the resolved configuration is accepted without requiring actual credentials to be printed.
2. **Given** a service failure, **When** the operator inspects status and logs, **Then** the affected service and its health or failure are visible.
3. **Given** a source change, **When** the operator follows the rebuild instructions, **Then** the changed service is rebuilt and restarted without deleting persistent data.
4. **Given** an unexpected exit or host restart, **When** the deployment recovers, **Then** previously running services restart while deliberately stopped services remain stopped.

### Edge Cases

- A running process does not prove that Neon, authentication, AI, or cache dependencies are available; document what each health check does and does not verify.
- The backend's existing basic endpoint establishes process responsiveness, not database or cache readiness.
- If the public backend address or frontend origin changes, browser requests and authentication must use matching configuration; build-time public values require rebuilding.
- A host port already in use must produce a visible error; document how to choose another host port and update browser-facing settings.
- Missing secrets must not be replaced with committed credentials or exposed in diagnostic output.
- Removing the local PostgreSQL configuration must not delete existing containers, images, or volumes automatically.
- Normal stop and restart must not remove Redis data; its existing expiration policy still applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The root deployment definition MUST build and run separate frontend and backend services from their respective existing container definitions, alongside the existing Redis service.
- **FR-002**: The deployment MUST use the configured hosted database and remove the unused local PostgreSQL service, its port mapping, and its volume declaration from the deployment definition; it MUST NOT delete existing data or resources automatically.
- **FR-003**: The backend MUST address Redis by its internal service name rather than its own loopback address, and existing persistent Redis storage and history expiration behavior MUST be preserved.
- **FR-004**: The services MUST share an internal network where frontend and backend can each be reached by service name, without adding application-level calls that do not already exist.
- **FR-005**: The browser MUST receive a backend address it can resolve for existing requests, streaming, and voice connections; an internal-only service name MUST NOT be assumed to resolve in the browser.
- **FR-006**: The deployment MUST publish the frontend and backend ports needed by the browser and MUST NOT publish the cache port by default; document an explicit local-development option if host access is needed.
- **FR-007**: Configuration MUST support appropriate frontend origin and authentication settings so existing cross-origin requests and protected routes continue to work.
- **FR-008**: The deployment MUST provide health checks where applicable and use dependencies only for actual startup needs; service start order alone MUST NOT be represented as readiness.
- **FR-009**: Service restart behavior MUST support recovery after an unexpected exit and host restart without restarting a service that was deliberately stopped.
- **FR-010**: Public frontend settings MUST be supplied at image-build time, while secret settings MUST be injected without embedding credentials in the deployment definition or image.
- **FR-011**: A root example environment file MUST list relevant required and optional setting names with non-secret placeholders or safe defaults; existing real environment files MUST remain unchanged.
- **FR-012**: The implementation MUST evaluate whether a root ignore file is needed for the chosen build contexts and retain the existing service-specific exclusions for secrets and local artifacts.
- **FR-013**: Documentation MUST explain services, networking, configuration timing, volumes, health checks and their limits, local versus production considerations, and exact commands to validate configuration, build, start, list, inspect logs, stop and rebuild.
- **FR-014**: Validation MUST cover configuration resolution, service health, internal connectivity in both directions, browser-to-backend requests, existing authentication, cache access and persistence, and report checks blocked by unavailable external services.
- **FR-015**: The feature MUST NOT modify application business logic, introduce another orchestrator, alter hosted data, or remove persistent volumes as part of normal operation.

### Key Entities

- **Application services**: Frontend and backend processes with distinct configuration, network identities and health status.
- **External dependencies**: The hosted database, authentication provider and AI provider, configured outside the deployment definition.
- **Cache data**: Redis-backed chat history retained in the existing persistent storage subject to its expiration policy.
- **Deployment configuration**: Public build settings and private runtime settings supplied by the operator without overwriting existing files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With valid settings and images already built, an operator can start all three application services and reach the home page and backend response within 2 minutes.
- **SC-002**: A signed-in user can retrieve existing backend data, and an operator can complete both service-to-service connectivity probes, in one deployment session.
- **SC-003**: One unexpired chat-history entry remains available after a normal stop and restart, with no hosted database data or existing local database volume deleted.
- **SC-004**: An operator can perform all six documented operations—build, start, list, inspect logs, stop and rebuild—without an undocumented configuration step.
- **SC-005**: All required settings are represented in the example without actual credentials, and each missing required setting produces an identifiable failure or warning.

## Assumptions

- The inspected `DATABASE_URL` points to hosted Neon; local PostgreSQL is therefore unnecessary for this deployment. Existing local volumes are left untouched.
- The frontend and backend currently listen on ports 3000 and 8000 respectively; operators may choose different host mappings.
- Redis currently stores chat history and uses a persistent volume; this feature preserves that volume rather than changing the data model.
- Frontend data, streaming and voice requests originate in the browser. Internal service-name connectivity is verified separately rather than introducing a new server-side flow.
- The default target is local use with production-built applications; internet-facing production deployment requires externally reachable addresses, transport security and protected secrets.
- Operators provide working database, authentication and AI service settings and an allowed browser origin. Actual external-service integration may require a separately provisioned test account.
