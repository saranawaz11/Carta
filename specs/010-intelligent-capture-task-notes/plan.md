# Implementation Plan: Intelligent Capture, Task Management, and Rich Notes

**Branch**: `010-intelligent-capture-task-notes` (planning target; no branch created) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-intelligent-capture-task-notes/spec.md`

## Summary

Improve mixed-content Quick Capture and share task title/date interpretation across capture and direct entry; add editable task deadlines and seven-day completed-task cleanup; add Tiptap note editing while retaining a plain-text projection for existing search, summaries, and embeddings.

## Technical Context

**Language/Version**: Python 3.11+; TypeScript with Next.js 16 and React 19.

**Primary Dependencies**: FastAPI, SQLAlchemy, LangGraph/LangChain, OpenAI (backend only), Tiptap (frontend addition), SWR.

**Storage**: Neon PostgreSQL; Alembic migrations; current note text and task date/completion fields retained.

**Validation**: Repository has frontend lint/build scripts but no configured automated test runner. Follow the constitution; use the feature quickstart's manual acceptance checks and available lint/build commands.

**Target Platform**: Existing web application and backend deployment; deployment scheduler provider is not configured in this repository.

**Project Type**: Web application (Next.js frontend + FastAPI backend).

**Performance Goals**: Keep autosave behavior responsive; cleanup completes at least daily and within 24 hours after retention expires. No additional latency target was specified.

**Constraints**: Preserve per-user authorization, API/service/repository boundaries, plain-text note integrations, provider boundary, and idempotent cleanup. No new test files or testing tasks.

**Scale/Scope**: Existing notes/tasks application; no new user population or throughput target specified.

## Constitution Check

| Principle | Gate |
|---|---|
| Note ownership and operations | Pass: every user-facing note/task operation remains scoped to Clerk user ID; scheduled cleanup is limited to expired completed tasks. |
| LLM note assistance | Pass: LangGraph/LangChain remain in use and OpenAI calls remain backend-only in `backend/llm.py`. |
| API/backend boundaries | Pass: frontend uses REST; routes delegate to services and repositories; no browser database or LLM access. |
| Data/schema changes | Pass: PostgreSQL changes use additive Alembic migrations; no manual database edits. |
| Small, spec-driven changes | Pass with requested Tiptap integration, additive rich content, and deadline range fields; reuse existing services and components where possible. |
| Agent working rules | Pass: no test files, testing tasks, or testing section are planned. The Speckit-required `quickstart.md` is a short manual validation guide, not a test suite. Plan decisions include a reason and rejected alternative. |

**Pre-research gate**: Pass. The scope follows the existing application architecture and no unresolved user clarification remains.

**Post-design gate**: Pass. Schema changes are additive; plain text remains canonical for existing consumers; scheduling is an external deployment concern with an idempotent backend command; no constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/010-intelligent-capture-task-notes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md             # Created by /speckit-tasks, not this command
```

### Source Code (repository root)

```text
backend/
├── llm.py
├── models.py
├── schemas.py
├── routes/
├── repositories/
├── services/
└── alembic/versions/
frontend/
├── app/(app)/notes/[id]/page.tsx
├── app/(app)/tasks/page.tsx
├── components/quick-capture.tsx
└── lib/
```

**Structure Decision**: Extend existing backend route/service/repository layers and the existing Next.js pages/components. Add one Alembic migration and one backend one-shot cleanup entry point; do not introduce a new application or worker service.

## Design Decisions

- **Shared task interpretation** — one structured backend interpretation path serves task title cleanup and date resolution in both entry points; rejected duplicating prompts in capture and task routes because results would diverge.
- **Structured mixed capture** — validate an extraction result containing optional note content and multiple task candidates before persistence; preserve existing note-operation confirmation; rejected treating every capture as one tool result because it cannot represent mixed notes and tasks.
- **Inclusive task ranges** — keep `due_at` as the start and add nullable `due_end_at` for an inclusive date range; rejected converting a week to one date because the user explicitly chose full ranges.
- **Plain-text note compatibility** — add nullable Tiptap document JSON while retaining canonical plain `content`; derive/validate a deterministic text projection for search, embeddings, summaries, and existing AI tools; rejected replacing `content` with HTML/JSON because existing consumers expect readable text.
- **External scheduled cleanup** — expose an idempotent backend cleanup command for the deployment's periodic job, using `completed_at` and UTC; rejected a request-triggered cleanup or in-process timer because cleanup must run without user traffic and survive restarts.
- **Manual deadline precedence** — explicitly selected user dates override extracted dates; clearing a manual deadline stores no date; rejected silently reinterpreting a user's manual change during unrelated AI processing.
- **Existing provider and authorization** — retain LangGraph/OpenAI backend boundaries and Clerk ownership checks; rejected a new AI provider or browser-side processing as unnecessary and constitution-inconsistent.

## Complexity Tracking

No constitution violations or additional project/service boundaries are introduced.
