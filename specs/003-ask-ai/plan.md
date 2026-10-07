# Implementation Plan: Ask AI

**Branch**: `003-ask-ai` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

RAG over the user's own notes: notes are chunked and embedded (OpenAI) into pgvector in Neon; `POST /api/chat` retrieves the top 5 chunks for the user and a LangGraph answers from them, returning sources. Frontend gets an Ask AI sidebar link and a stateless `/ask` page.

## Technical Context

- **Backend**: Python, FastAPI, SQLAlchemy, Alembic; add `langchain`, `langchain-openai`, `langchain-text-splitters`, `langgraph`, `pgvector`.
- **Frontend**: Next.js, TypeScript, minimal shadcn, existing `apiFetch`.
- **Storage**: Neon PostgreSQL + pgvector (exact cosine search, no vector index).
- **Env** (backend `.env` + `.env.example` if present): `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`), `OPENAI_CHAT_MODEL`.
- **Scale**: small per-user note sets.

## Constitution Check

- OpenAI only from backend, only in `app/llm.py` ✅
- routes -> services -> data access ✅
- Alembic migration for schema; pgvector ✅
- Smallest change, minimal shadcn, no styling, no tests, no extra docs ✅

## Design

**Migration** (one Alembic file): `CREATE EXTENSION IF NOT EXISTS vector`; `notes.content_hash`, `notes.embedded_hash` (nullable text); `note_chunks(id, note_id FK notes ON DELETE CASCADE, clerk_user_id indexed, chunk_index, content, embedding vector(1536), created_at)`. No vector index.

**`app/llm.py`** (sole OpenAI/LangChain importer):
- `embed_texts` / `embed_query` via `OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL)`.
- `split_note(title, content)`: `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)`, title prepended to each chunk.
- LangGraph `StateGraph` state `{question, history, chunks, answer}`: `retrieve` (embed question, call repository `similar_chunks(user_id, vector, 5)`) -> `generate` (`ChatOpenAI(OPENAI_CHAT_MODEL)`; system prompt: answer only from provided notes, say "I don't know" if absent, never invent sources).
- Graph receives the retrieval function from the chat service (no DB import in llm.py).

**Data access** (`repositories/note_chunks.py`): `replace_chunks(note_id, chunks)` (delete + insert, one transaction); `delete_chunks(note_id)`; `similar_chunks(user_id, vector, k)` filtered by `clerk_user_id`, joined to notes with `deleted_at IS NULL`, ordered by cosine distance, returns chunk + note id/title; `notes_needing_sync(user_id, limit)` where `content_hash IS DISTINCT FROM embedded_hash` and `deleted_at IS NULL`.

**Services**:
- `services/embedding.py` `sync_note(note_id)`: hash(title + content); equal to `embedded_hash` -> return; empty note -> clear chunks, set hashes; else embed first, then one transaction: replace chunks, set `embedded_hash` and `content_hash`. Embedding failure leaves old vectors.
- `services/notes.py`: after create/update, schedule `sync_note` via `BackgroundTasks` with its own DB session; soft delete calls `delete_chunks`; archive untouched.
- `services/chat.py`: sync up to a small batch (e.g. 5) of mismatched notes, run graph, dedupe sources by note id with titles.

**Route** (`routes/chat.py`): `POST /api/chat` `{question, history[≤6]}` -> `{answer, sources:[{note_id,title}]}`; existing auth dependency; delegates to the chat service. Schemas in `schemas.py`.

**Frontend**: sidebar "Ask AI" link ([sidebar.tsx](../../frontend/components/sidebar.tsx)); `app/ask/page.tsx` with local state (messages, input, send), `apiFetch("/api/chat")` sending last 6 messages as history, loading and error text, sources rendered as links to `/notes/[id]`. No streaming, no persistence, no styling.

## Project Structure

```text
backend/
├── alembic/versions/0002_note_embeddings.py   # new
├── llm.py                                     # new (backend has no app/ package; this is its app/llm.py)
├── models.py, schemas.py                      # edit
├── repositories/note_chunks.py                # new
├── services/embedding.py, chat.py             # new
├── services/notes.py                          # edit
├── routes/chat.py, main.py                    # new / edit
├── core/config.py, .env, pyproject.toml       # edit
frontend/
├── components/sidebar.tsx                     # edit
└── app/ask/page.tsx                           # new
```

## Key Decisions

| Decision | Reason | Rejected |
|---|---|---|
| Content hash to skip unchanged notes | Avoids paid, pointless OpenAI calls | Re-embedding on every save |
| Replace a note's chunks in one transaction | Simple and never leaves stale/duplicate vectors | Incremental per-chunk diffing |
| Background embedding + pre-chat reconcile | Saves stay fast; hash mismatch guarantees freshness | Blocking the save on OpenAI |
| pgvector in Neon | Already our database; one store, user filter in SQL | A separate vector database |
| No vector index yet | Data is small; exact cosine is fast and exact | HNSW now |
| Stateless chat, history sent from frontend | No storage needed; spec says history is not kept | LangGraph checkpointer storage |
| Single `app/llm.py` module | One place for OpenAI/LangChain, per constitution | LLM calls spread across services |
