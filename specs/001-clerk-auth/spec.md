# Feature Specification: Clerk Authentication

**Feature Branch**: `001-clerk-auth`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "Clerk authentication for Carta: sign-up, sign-in, sign-out, protected pages, backend token verification, reusable user-ID dependency, GET /api/me."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up, sign in, sign out (Priority: P1)

- A visitor can create an account, sign in, and sign out.
- **Independent Test**: Complete each flow and confirm session state changes.
- **Acceptance Scenarios**:
  1. **Given** a visitor, **When** they sign up, **Then** they are signed in.
  2. **Given** a registered user, **When** they sign in, **Then** they reach the app.
  3. **Given** a signed-in user, **When** they sign out, **Then** they are signed out and sent to sign-in.

### User Story 2 - Protected pages (Priority: P2)

- All pages except sign-in and sign-up require a signed-in user.
- **Independent Test**: Open a page while signed out.
- **Acceptance Scenarios**:
  1. **Given** a signed-out user, **When** they open any protected page, **Then** they are redirected to sign-in.
  2. **Given** a signed-out user, **When** they open sign-in or sign-up, **Then** the page loads.

### User Story 3 - Verified identity from the backend (Priority: P3)

- The frontend calls GET /api/me with the user's token and shows the returned Clerk user ID.
- **Independent Test**: Sign in and view the displayed ID; call GET /api/me without a valid token.
- **Acceptance Scenarios**:
  1. **Given** a signed-in user, **When** the page loads, **Then** their Clerk user ID is shown.
  2. **Given** a missing, invalid, or expired token, **When** a protected request is made, **Then** it is rejected with 401.

### Edge Cases

- Expired session while on a protected page: user is sent to sign-in.
- Malformed Authorization header: rejected with 401.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to sign up, sign in, and sign out via Clerk.
- **FR-002**: All frontend pages except sign-in and sign-up MUST redirect signed-out users to sign-in.
- **FR-003**: Backend MUST verify the Clerk session token (Bearer header) on every protected request.
- **FR-004**: Backend MUST respond 401 for missing, invalid, or expired tokens.
- **FR-005**: Backend MUST provide one reusable dependency that returns the Clerk user ID.
- **FR-006**: GET /api/me MUST return the current user's Clerk user ID.
- **FR-007**: Frontend MUST call GET /api/me with the Clerk token and display the result.
- **FR-008**: The Clerk user ID is the sole identity; no users table.

### Key Entities

- **User identity**: The Clerk user ID; not stored locally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can sign up and reach the app in under 2 minutes.
- **SC-002**: 100% of signed-out visits to protected pages end at sign-in.
- **SC-003**: 100% of requests with missing, invalid, or expired tokens are rejected with 401.
- **SC-004**: A signed-in user sees their own user ID on first page load.

## Assumptions

- Out of scope: notes, LLM features, database changes, roles, styling.
- Clerk account and keys are provided via environment settings.
