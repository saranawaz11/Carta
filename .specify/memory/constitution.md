<!--
Sync Impact Report
Version change: unversioned scaffold -> 1.0.0 (initial constitution)
Modified principles: added five project principles
Added sections: Technology Stack; Agent Working Rules
Removed sections: none
Follow-up TODOs: ratification date; amendment procedure; compliance review expectations
-->
# Carta Constitution

## Core Principles

### I. Note Ownership and Operations
- Users can create, view, delete, and archive notes.
- Each note belongs to a user identified by Clerk user ID.
- Users can access only their own notes.

### II. LLM Note Assistance
- LangChain provides LLM chat for questionnaires about notes.
- LangChain and LangGraph select tools to perform note CRUD operations.
- LangChain and LangGraph summarize notes within the notes page and separate deadlines in each summary.
- OpenAI is called only from the backend.

### III. API and Backend Boundaries
- The frontend communicates only with the FastAPI REST API, never directly with the database or LLM.
- Backend layers are routes -> services -> data access; routes contain no business logic.
- LLM calls are kept in one dedicated module.

### IV. Data and Schema Changes
- Notes are stored in Neon serverless PostgreSQL; the backend is the only database client.
- Use Alembic for every schema change; never edit the database by hand.
- Vector search using pgvector will be added.

### V. Small, Spec-Driven Changes
- Implement the smallest solution that satisfies the spec, with few files and dependencies.
- Reuse existing code and shadcn/ui components before adding anything.
- Keep md files short, precise, minimal within few lines
- Add variables name in .env file as well

## Technology Stack
- Frontend: Next.js with TypeScript and shadcn/ui components.
- Backend: Python with FastAPI, served by Uvicorn.
- Authentication: Clerk handles frontend sign-in/sign-up; the backend verifies Clerk session tokens on every protected request.
- Secrets and settings come from environment variables, never hardcoded.

## Agent Working Rules
- Spec-driven work covers backend logic, the API contract, and basic frontend wiring to call the API and show data.
- Styling, CSS, and UI interactions are implemented manually by the developer.
- Generate only minimal shadcn/ui components.
- Do not write test files, testing tasks, or a testing section.
- Keep generated spec, plan, and task files short; create no extra documents.
- In plan.md, record each key design decision with a one-line reason and the rejected alternative.

## Governance
- Amendment procedure: TBD.
- Versioning: MAJOR for incompatible removals or redefinitions; MINOR for new or materially expanded principles; PATCH for clarifications and non-semantic refinements.
- Compliance review expectations: TBD.

**Version**: 1.0.0 | **Ratified**: TBD | **Last Amended**: 2026-10-06
