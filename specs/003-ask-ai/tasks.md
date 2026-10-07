# Tasks: Ask AI

**Input**: [plan.md](./plan.md), [spec.md](./spec.md). No test tasks (per constitution).

Format: `- [ ] ID [P] [Story] Description with path` (paths under repo root).

## Phase 1: Setup

- [x] T001 Add `langchain`, `langchain-openai`, `langchain-text-splitters`, `langgraph`, `pgvector` to `backend/pyproject.toml` and update `backend/uv.lock` (`uv add`)
- [x] T002 [P] Add `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`), `OPENAI_CHAT_MODEL` to `backend/core/config.py` and `backend/.env`

## Phase 2: Foundational (blocks all stories)

- [x] T003 Add `content_hash`, `embedded_hash` (nullable text) to `Note` and a `NoteChunk` model (`id`, `note_id` FK ON DELETE CASCADE, `clerk_user_id` indexed, `chunk_index`, `content`, `embedding` Vector(1536), `created_at`) in `backend/models.py`
- [x] T004 Create Alembic migration `backend/alembic/versions/0002_note_embeddings.py`: `CREATE EXTENSION IF NOT EXISTS vector`, add the two note columns, create `note_chunks`; no vector index
- [x] T005 [P] Create `backend/llm.py` (only OpenAI/LangChain importer): `embed_texts`, `embed_query` (OpenAIEmbeddings), `split_note(title, content)` (RecursiveCharacterTextSplitter 1000/150, title prepended to each chunk)
- [x] T006 [P] Create `backend/repositories/note_chunks.py`: `replace_chunks(note_id, chunks)` (delete + insert, one transaction), `delete_chunks(note_id)`, `similar_chunks(user_id, vector, k)` (filter `clerk_user_id`, join notes with `deleted_at IS NULL`, cosine distance order, return chunk + note id/title), `notes_needing_sync(user_id, limit)` (`content_hash` differs from `embedded_hash` or `content_hash IS NULL` for pre-existing notes, `deleted_at IS NULL`)
- [x] T007 Create `backend/services/embedding.py` `sync_note(note_id)`: hash(title + content); equal to `embedded_hash` → return without OpenAI; empty note → no chunks; else embed first, then one transaction replacing chunks and setting `embedded_hash` and `content_hash`; on embed failure leave old vectors (depends on T005, T006)

## Phase 3: User Story 1 - Ask questions about my notes (P1) 🎯 MVP

**Independent check**: ask a question via `/ask`; answer and source links to `/notes/[id]` appear; unknown topics give "I don't know" with no sources.

- [x] T008 [US1] Add LangGraph `StateGraph` to `backend/llm.py` with state `{question, history, chunks, answer}`: `retrieve` (embed question, call injected retrieval function for top 5) → `generate` (ChatOpenAI from `OPENAI_CHAT_MODEL`; prompt: answer only from provided notes, say you don't know otherwise, don't invent sources)
- [x] T009 [US1] Add `ChatRequest` (`question`, `history` max 6) and `ChatResponse` (`answer`, `sources: [{note_id, title}]`) in `backend/schemas.py`
- [x] T010 [US1] Create `backend/services/chat.py`: sync up to a small batch (5) of `notes_needing_sync` via `sync_note`, run graph with `similar_chunks`, return answer and sources deduplicated by note id with titles (no sources if no chunks)
- [x] T011 [US1] Create `backend/routes/chat.py` `POST /api/chat` using the existing auth dependency, delegating to the chat service; register the router in `backend/main.py`
- [x] T012 [P] [US1] Add an "Ask AI" link to `frontend/components/sidebar.tsx`
- [x] T013 [US1] Create `frontend/app/ask/page.tsx`: local state (messages, input, send button), call `apiFetch` on `/api/chat` with last 6 messages as history, loading state, error message, sources rendered as links to `/notes/[id]`; no styling

## Phase 4: User Story 2 - Answers stay current (P2)

**Independent check**: edit a note and ask → new content only; delete → never a source; archive → still a source.

- [x] T014 [US2] In `backend/services/notes.py` set `content_hash` (hash of title + content) on create/update so mismatches are detectable, then schedule `sync_note` with FastAPI `BackgroundTasks` (own DB session) after create and update; pass `BackgroundTasks` from `backend/routes/notes.py`
- [x] T015 [US2] In `backend/services/notes.py` call `delete_chunks` on soft delete; leave archive untouched

## Phase 5: Polish

- [x] T016 Run `alembic upgrade head` against Neon and manually verify the quickstart flow: ask, edit then ask, delete then ask

## Dependencies

- T001 → T003–T007 → US1 → US2 (US2 needs only Phase 2, so it can run in parallel with US1 after T007).
- Parallel: T002; T005 ∥ T006; T012 ∥ T008–T011.
- MVP: Phases 1–3 (pre-existing notes are embedded lazily by the pre-chat reconcile).
