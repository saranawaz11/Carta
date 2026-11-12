# Implementation Plan: AI Task Date Parsing

**Branch**: `009-ai-task-dates` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

## Summary

Resolve task text into a cleaned title and optional local due date with one backend LangGraph-based date interpreter shared by direct task entry and Quick Capture. Keep date interpretation, model calls, and task creation on the backend; preserve existing capture intent routing and task ownership.

## Technical Context

**Language/Version**: Python 3.11+; TypeScript in the existing Next.js frontend
**Primary Dependencies**: Existing FastAPI, LangGraph/LangChain, OpenAI chat model, Pydantic, Clerk client
**Storage**: Existing PostgreSQL Task fields (`title`, nullable `due_at`, `due_has_time`); no schema change
**Target Platform**: Existing Carta web application and backend
**Project Type**: Web application with Python API and Next.js frontend
**Performance Goals**: Date interpretation completes within the existing task submission flow; no separate numeric latency target is specified
**Constraints**: Use browser-provided current date/time and IANA timezone; no guessed dates; no new dependencies or database fields; preserve Clerk ownership and existing note/capture behavior
**Scale/Scope**: Direct task quick-add and task creation via Quick Capture; other task creation paths retain their existing behavior

## Constitution Check

- **Pass** — OpenAI and LangGraph remain backend-only; frontend sends raw task text and date context.
- **Pass** — Reuse the existing route → service → repository boundary and Task entity; no migration is needed.
- **Pass** — Reuse existing dependencies and avoid unrelated UI/styling changes.
- **Pass** — Do not add automated test files or testing tasks; provide manual runnable validation steps.
- **Pass** — Record design decisions and rejected alternatives below.

## Design Decisions

- Use one shared backend date-resolution graph for task text; this keeps direct entry and capture consistent. Rejected separate frontend parsing because it duplicates behavior and cannot reliably interpret period phrases.
- Resolve only after capture intent is classified as a task; this avoids changing note and note-operation routing. Rejected parsing every capture statement because non-task text has no task date to resolve.
- Keep date resolution separate from persistence and validate structured output before calling the existing task service. Rejected allowing the model to write task records because it bypasses existing duplicate and ownership rules.
- Use the user's local date/timezone and return date-only values without an invented time. For period-only phrases, use the final day of the period per the spec. Rejected server-local time because it can change relative-date results for the user.
- Preserve the existing Task response and storage shape; carry date context in the create request. Rejected schema migrations because current task fields already represent the required outcome.
- On ambiguous input, return a visible error/message and create no task. Rejected silently falling back to today's date or an LLM guess.

## Project Structure

### Documentation

```text
specs/009-ai-task-dates/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── tasks.md
```

### Source Code

```text
backend/
├── llm.py                    # Shared LangGraph date interpretation
├── schemas.py                # Task request context and validated result shape
├── routes/tasks.py           # Direct task request integration
├── services/tasks.py         # Resolve before existing task persistence
├── services/capture.py       # Resolve task captures with the same graph
└── routes/capture.py         # Existing capture API contract remains

frontend/
├── app/(app)/tasks/page.tsx  # Submit raw quick-add text and local date context
├── lib/tasks.ts              # Send the extended task request
└── lib/parsequickadd.ts      # Remove the obsolete client-side date parser
```

**Structure Decision**: Extend existing task and capture flows in their current backend service/LLM modules and frontend callers; do not add a new package or persistence layer.

## Constitution Check (Post-Design)

- **Pass** — The graph is a backend LLM concern and uses the existing LLM module.
- **Pass** — Existing task service/repository remains responsible for task persistence and duplicate handling.
- **Pass** — No new data store, dependency, automated test file, or styling work is introduced.
- **Pass** — Direct task entry and capture share the same date rules; capture note behavior is unchanged.

## Complexity Tracking

No constitution violations or additional project structures are required.
