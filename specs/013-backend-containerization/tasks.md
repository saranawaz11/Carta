# Tasks: Backend Containerization

**Input**: Design documents from `/specs/013-backend-containerization/` (plan.md, spec.md)

**Organization**: Tasks are grouped by user story. Only `backend/Dockerfile` and `backend/.dockerignore` change, plus a README update. No application code changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 map to spec.md user stories

---

## Phase 1: Setup

**Purpose**: Confirm the pinned inputs before writing the image

- [X] T001 Confirm `ghcr.io/astral-sh/uv:0.13.8` exists by running `docker pull ghcr.io/astral-sh/uv:0.13.8` (pin used in `backend/Dockerfile`)
- [X] T002 Confirm `backend/uv.lock` is in sync with `backend/pyproject.toml` by running `uv lock --check` in `backend/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Builder stage that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Rewrite the builder stage in `backend/Dockerfile`: `FROM python:3.11-slim AS builder`; set `UV_COMPILE_BYTECODE=1`, `UV_LINK_MODE=copy`, `UV_PYTHON_DOWNLOADS=0`, `UV_PROJECT_ENVIRONMENT=/opt/venv`; copy `/uv` and `/uvx` from `ghcr.io/astral-sh/uv:0.13.8` to `/bin/`; `WORKDIR /app`; `COPY pyproject.toml uv.lock ./`; `RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project`. Remove the old `pip install uv` line.

**Checkpoint**: Builder stage installs locked dependencies into `/opt/venv` with source not yet copied

---

## Phase 3: User Story 1 - Build a runnable backend image (Priority: P1) 🎯 MVP

**Goal**: Image builds from `backend/` and the API responds on port 8000

**Independent Test**: `docker build -t carta-backend ./backend`, then run with `--env-file` and get HTTP 200 from `GET /test` on `localhost:8000`

- [X] T004 [US1] Add runtime stage to `backend/Dockerfile`: `FROM python:3.11-slim AS runtime`; set `PYTHONDONTWRITEBYTECODE=1`, `PYTHONUNBUFFERED=1`, `PATH=/opt/venv/bin:$PATH`; `COPY --from=builder /opt/venv /opt/venv`
- [X] T005 [US1] Copy application source in `backend/Dockerfile` runtime stage: `WORKDIR /app` then `COPY . .`
- [X] T006 [US1] Add `EXPOSE 8000` and `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]` to `backend/Dockerfile`
- [X] T007 [US1] Build the image with `docker build -t carta-backend ./backend` and fix any build failure in `backend/Dockerfile`
- [X] T008 [US1] Start the container with `docker run --rm -p 8000:8000 --env-file backend/.env carta-backend` and confirm `GET http://localhost:8000/test` returns `{"message":"Hello from FastAPI"}`

**Checkpoint**: User Story 1 works. The image builds and serves the API.

---

## Phase 4: User Story 2 - Configure the container without rebuilding (Priority: P2)

**Goal**: Runtime configuration comes only from environment variables; no secrets in the image

**Independent Test**: Run the same image twice with different `FRONTEND_ORIGIN` values and confirm the CORS response header changes

- [X] T009 [US2] Run `docker run -d -p 8000:8000 -e FRONTEND_ORIGIN=https://app-a.example carta-backend`, then `curl -i -H "Origin: https://app-a.example" http://localhost:8000/test` and confirm `access-control-allow-origin: https://app-a.example`. Repeat with a different origin without rebuilding.
- [X] T010 [US2] Confirm `backend/.env.example` lists all 11 variables read by `backend/core/config.py`; make no change unless one is missing
- [X] T011 [US2] Confirm `backend/Dockerfile` has no `ENV` lines with credentials or environment-specific values, and `docker inspect carta-backend` shows only the `PYTHON*`/`PATH` variables

**Checkpoint**: User Story 2 works. Same image, different configuration, no secrets baked in.

---

## Phase 5: User Story 3 - Build a lean, safe image (Priority: P3)

**Goal**: Non-root execution, no build-only tooling, reused dependency cache, excluded local files

**Independent Test**: Inspect the running container's uid, list `/app`, check `uv` is absent, and rebuild after a source-only change to see the `uv sync` step cached

- [X] T012 [P] [US3] Extend `backend/.dockerignore` (keep existing entries) with `.venv/`, `.env.*`, `Dockerfile`, `.dockerignore`, `.mypy_cache`, `.ruff_cache`, `.coverage`, `htmlcov/`, `dist/`, `build/`, `*.egg-info`, `.idea/`, `.vscode/`, `.DS_Store`
- [X] T013 [US3] Add a system user to `backend/Dockerfile` runtime stage: `RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app app`, then `USER app` before `CMD`
- [X] T014 [US3] Verify the running container: `docker run --rm carta-backend id -u` prints `10001`, and `docker run --rm carta-backend ls -a /app` shows no `.env`, `.git`, or `__pycache__`
- [X] T015 [US3] Verify the runtime image has no build tooling: `docker run --rm carta-backend sh -c "command -v uv || echo absent"` prints `absent`
- [X] T016 [US3] Make a whitespace-only change to one Python file under `backend/` and rebuild; confirm the `uv sync` step reports `CACHED` in build output, then revert the change

**Checkpoint**: User Story 3 works. Image runs as non-root, is lean, and rebuilds fast.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation required by spec FR-015 and FR-016, and a final review

- [X] T017 [P] Add a "Docker" section to `backend/README.md` with the exact build and run commands, and a table of all 11 environment variables marking which are required and which have defaults (from `backend/core/config.py`)
- [X] T018 Review `backend/Dockerfile` and `backend/.dockerignore` against spec.md FR-001 through FR-014 and confirm no application code, dependency versions, or Compose files were changed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs a running image)
- **User Story 3 (Phase 5)**: Depends on User Story 1 (T013 edits the runtime stage T004–T006 create); T012 can start any time
- **Polish (Phase 6)**: Depends on all user stories

### Within Each Story

- Dockerfile edits in the same file run in order (T003 → T004 → T005 → T006 → T007 → T008; T013 after T006)
- T012 is the only parallel task in Phase 5 (different file)
- T017 is parallel with T018 once the image works

### Parallel Opportunities

- T001 and T002 can run in parallel
- T012 can run alongside T003–T008 (different file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (T004–T008)
3. **STOP and VALIDATE**: API responds from the container
4. Continue with US2 and US3 if MVP passes

### Incremental Delivery

1. Foundation (T001–T003)
2. US1: runnable image (T004–T008)
3. US2: configuration proof (T009–T011)
4. US3: hardening (T012–T016)
5. Polish (T017–T018)

---

## Notes

- Tasks T007–T009, T014–T016 are build and run checks, not test files; the constitution forbids test tasks
- Use `docker build` with BuildKit (default in current Docker) so the cache mount in T003 works
- Commit after each phase checkpoint
