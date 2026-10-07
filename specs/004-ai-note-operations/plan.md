# Implementation Plan: AI Note Operations

**Branch**: `004-ai-note-operations` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

The Ask AI chat becomes a single tool-calling agent. Search and create run immediately; update, archive, and delete are only proposed, then executed by a separate confirm endpoint. Answers stream to the page.

## Technical Context

- **Backend**: FastAPI, SQLAlchemy, LangChain/LangGraph/OpenAI (no new packages, no new env vars, no migration).
- **Frontend**: Next.js, SWR notes cache, existing `apiFetch`, minimal shadcn.
- **Storage**: unchanged (notes, note_chunks).

## Constitution Check

- OpenAI/LangChain/LangGraph only in `backend/llm.py` ✅
- routes -> services -> data access; routes thin ✅
- No schema change, no tests, no extra docs, no styling ✅

## Design

**`backend/llm.py`** (only LLM importer): replace the fixed graph with a tool-calling `StateGraph` (`messages` state): `model` node (`ChatOpenAI(OPENAI_CHAT_MODEL).bind_tools(...)`) -> conditional edge -> `tools` node -> back to `model`; ends when there are no tool calls, or right after a `propose_*` call.
- Tools with typed Pydantic args and clear descriptions: `search_notes(query)`, `create_note(title, content)`, `propose_update_note(note_id, title, content)`, `propose_archive_note(note_id)`, `propose_delete_note(note_id)`.
- The user ID is never a tool argument: the graph is invoked with `config={"configurable": {"user_id", ...}}` and tools read it from there.
- `llm.py` stays free of database code: the chat service passes callables (search, create, get-note) in the config; tools only call them.
- `search_notes`: embeds the query, returns note IDs, titles, snippets (existing `similar_chunks`, top 5).
- `create_note`: calls the callable that wraps the notes service; returns `{note_id, title}` to the model.
- `propose_*`: call the get-note callable to check ownership (error text to the model if not found/deleted), execute nothing, return pending action `{action, note_id, note_title, changes}`.
- System prompt: search before proposing, ask the user when several notes match, never claim an action is done before confirmation, answer only from notes.
- Streaming: the graph is run with `stream_mode="messages"` to yield answer tokens, then a final result (sources, pending_action, created_note).

**Services**
- `services/chat.py`: `ask(...)` keeps the pre-chat embedding sync, supplies the callables (`similar_chunks`, `notes_service.create_note` with `BackgroundTasks`, `get_note`), runs the graph, collects sources (deduplicated by note ID), `pending_action`, `created_note`. `confirm(db, user_id, action, note_id, changes, background)`: re-validates ownership, then `notes_service.update_note` / `archive_note` / `delete_note`; unknown action -> 400.

**API** (`routes/chat.py`, thin)
- `POST /api/chat` `{question, history[≤6]}`: streamed as newline-delimited JSON — `{"token": "..."}` events, then a final `{"done": {answer, sources, pending_action|null, created_note|null}}`.
- `POST /api/chat/confirm` `{action: update|archive|delete, note_id, changes}` -> `{message, note}`. Both use the existing auth dependency. Schemas in `schemas.py`.

**Frontend** (`app/(app)/ask/page.tsx` only)
- Chat call uses `fetch` with the Clerk token (plain `apiFetch` cannot stream) and appends tokens to the last message; the final event adds sources, `created_note` link to `/notes/[id]`, and the action card.
- Action card: describes note and change, Confirm (calls `/api/chat/confirm` via `apiFetch`, shows result as a chat message) and Cancel (dismisses).
- After create or a confirmed action, revalidate the notes list cache (SWR `mutate` over keys starting with `/api/notes`, via a small helper in [notes.ts](../../frontend/lib/notes.ts)), so gallery, Archive, Deleted, and sidebar refresh without reload.

## Project Structure

```text
backend/
├── llm.py                 # edit: tool-calling graph, tools, streaming
├── schemas.py             # edit: chat/confirm schemas
├── services/chat.py       # edit: ask (tools wiring), confirm
├── routes/chat.py         # edit: streaming chat, confirm
frontend/
├── lib/notes.ts           # edit: invalidate-notes helper
└── app/(app)/ask/page.tsx # edit: streaming, action card, created link
```

## Key Decisions

| Decision | Reason | Rejected |
|---|---|---|
| One agent with tools | Model picks the operation; one loop is the smallest design | Separate agents per operation |
| Tools call the notes service | Same ownership, vector sync, and soft-delete rules as REST | Tools writing to the database directly |
| User ID injected from auth via graph config | Model output can never change whose notes are touched | Letting the model pass a user ID |
| Propose, then confirm for update/archive/delete | Destructive changes need explicit user consent | Executing destructive actions immediately |
| Stateless confirm endpoint | Chat is stateless; confirm re-validates ownership itself | LangGraph interrupt with a Postgres checkpointer |
| Search as a tool | Only searches when needed; same tool serves "find note X" | Always retrieving before every answer |
| Natural language only for now | Smallest scope; the model already routes requests | Slash-command menu |
| Streamed NDJSON from `/api/chat` | Tokens stream while the final object keeps the agreed shape | Separate streaming endpoint / SSE library |
