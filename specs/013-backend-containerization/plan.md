# Implementation Plan: Backend Containerization

**Branch**: `013-backend-containerization` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-backend-containerization/spec.md`

## Summary

Containerize the existing FastAPI backend (`main:app` on Uvicorn, port 8000) as a two-stage image built from `backend/`. Dependencies install from `pyproject.toml` + `uv.lock` with `uv sync --frozen`, the runtime stage carries no build tooling, and the app runs as a non-root user. Only `backend/Dockerfile` and `backend/.dockerignore` change; no application code changes.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python >=3.11 (`backend/pyproject.toml`)

**Primary Dependencies**: FastAPI (`fastapi[standard]`, includes Uvicorn), SQLAlchemy, Alembic, psycopg, LangChain/LangGraph, redis (existing lock file; no new dependencies)

**Storage**: External Neon PostgreSQL (pgvector) and Redis, supplied by the operator; not containerized

**Testing**: N/A (constitution forbids test files and testing tasks)

**Target Platform**: Linux container, linux/amd64

**Project Type**: Web service (REST API, plus WebSocket for voice transcription)

**Performance Goals**: API responds within 30 s of container start; source-only rebuild under 30 s (spec SC-002, SC-003)

**Constraints**: No secrets in image; non-root runtime user; no build tooling in runtime image (spec FR-008, FR-010, FR-014)

**Scale/Scope**: Single backend container; Compose out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I–IV (Note, LLM, API boundaries, Data): PASS. No application logic, routes, or schema change; migrations stay Alembic and run outside the image.
- V (Small, spec-driven): PASS. Two existing files edited, no new dependencies, no new docs.
- Technology Stack (FastAPI/Uvicorn, env-var secrets): PASS.
- Agent Working Rules (no tests, short docs, decisions recorded here): PASS. Constitution's "create no extra documents" overrides the template's research/data-model/contracts/quickstart outputs; those are intentionally skipped.

Post-design re-check: PASS (no new violations).

## Project Structure

### Documentation (this feature)

```text
specs/013-backend-containerization/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── Dockerfile           # Rewritten: two-stage build, pinned uv, non-root user
├── .dockerignore        # Extended: build artifacts, local env files, IDE/tool caches
├── pyproject.toml       # Unchanged
├── uv.lock              # Unchanged
└── (application code)   # Unchanged
```

**Structure Decision**: Only `backend/Dockerfile` and `backend/.dockerignore` change. The frontend, root `docker-compose.yml`, and application code are untouched.

## Key Design Decisions

Each decision has a one-line reason and the rejected alternative.

| # | Decision | Reason | Rejected alternative |
|---|----------|--------|----------------------|
| D1 | Base `python:3.11-slim` | Matches `requires-python >=3.11` and the lock file; no runtime change | `python:3.12+` (changes runtime, out of scope); Alpine (musl wheel gaps for psycopg[binary] and LangChain stack) |
| D2 | Copy `uv` from pinned `ghcr.io/astral-sh/uv:0.13.8` | Reproducible builds; official uv Docker method | `pip install uv` (current, unpinned); `:latest` tag |
| D3 | Two stages: `builder` installs `/opt/venv`, `runtime` copies only the venv | Keeps `uv`, build caches, and compilers out of the final image (FR-014) | Single stage (ships build tooling) |
| D4 | Copy `pyproject.toml` + `uv.lock` before source; `uv sync --frozen --no-dev --no-install-project` with BuildKit cache mount | Source edits reuse the dependency layer (FR-004); `--frozen` fails on lock drift (spec edge case) | Copy whole source before install (busts cache every edit); `requirements.txt` export (new file, extra tooling) |
| D5 | `UV_PYTHON_DOWNLOADS=0` | Uses the base image's Python so the copied venv resolves in the runtime stage | Let uv download Python (path mismatch, larger image) |
| D6 | Run as system user `app` (uid 10001) | Non-root requirement (FR-010) | Root (current Dockerfile) |
| D7 | App files owned by root, read-only to `app` | The app writes no files at runtime; least privilege | `chown -R app` (unneeded write access) |
| D8 | Port fixed at 8000 in `EXPOSE` and `CMD` | Matches existing convention and README; no code change needed | Env-driven port (requires verifying Uvicorn env support; deferred) |
| D9 | No Alembic run in `CMD` | Startup stays independent of DB; schema changes stay a separate step (constitution IV) | `alembic upgrade head` on start (couples start to DB) |
| D10 | No secrets or defaults with credentials in Dockerfile; configuration via `docker run -e` / `--env-file` | FR-008, FR-009; `core/config.py` already reads env | `ENV` lines with real values |
| D11 | No `HEALTHCHECK` | `curl` absent from slim image; spec defers probes to later work | Adding curl or a Python probe (extra dependency) |
| D12 | Extend existing `.dockerignore` | Existing file already excludes `.venv`, `.env`, `.git`; only gaps need closing | Rewrite from scratch (churn) |
| D13 | No `.env.example` change | Already lists all 11 variables read by `core/config.py` (constitution V) | Adding new variables (none needed) |

## Complexity Tracking

No constitution violations. No complexity to justify.
