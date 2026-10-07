# Tasks: AI Note Operations

**Input**: [plan.md](./plan.md), [spec.md](./spec.md). No test tasks (per constitution). No setup phase: no new packages, env vars, or migration.

Format: `- [ ] ID [P] [Story] Description with path` (paths under repo root).

## Phase 1: Foundational (blocks all stories)

- [X] T001 Add schemas in `backend/schemas.py`: `PendingAction` (`action` in update/archive/delete, `note_id`, `note_title`, `changes`), `CreatedNote` (`note_id`, `title`), extend `ChatResponse` with nullable `pending_action` and `created_note`, add `ConfirmRequest` (`action`, `note_id`, `changes`) and `ConfirmResponse` (`message`, `note`)
- [X] T002 Replace the fixed graph in `backend/llm.py` with a tool-calling `StateGraph` (`messages` state): `model` node (`ChatOpenAI(OPENAI_CHAT_MODEL).bind_tools`), `tools` node, conditional edge back to `model` until no tool calls; end right after a `propose_*` call. Tools take callables (search, create, get-note) and the Clerk user ID from `config["configurable"]`, never from tool arguments
- [X] T003 Define tools in `backend/llm.py` with typed Pydantic args and clear descriptions: `search_notes(query)` (embed, top 5, return note IDs, titles, snippets), `create_note(title, content)`, `propose_update_note(note_id, title, content)`, `propose_archive_note(note_id)`, `propose_delete_note(note_id)`; `propose_*` execute nothing, return an error string to the model if the note is not the user's (or is deleted), else a pending action `{action, note_id, note_title, changes}`
- [X] T004 Update the system prompt in `backend/llm.py`: search before proposing changes, ask the user when several notes match, never claim an action is done before confirmation, answer only from notes, don't invent sources
- [X] T005 Add a streaming runner in `backend/llm.py` (`stream_mode="messages"` for answer tokens) that yields token events then a final result with answer, sources (deduplicated by note ID, from search results), `pending_action`, `created_note`

## Phase 2: User Story 1 - Search and create by chat, streamed (P1) 🎯 MVP

**Independent check**: ask a question → streamed answer with source links; "create a note about X" → note created at once with a link to `/notes/[id]`.

- [X] T006 [US1] Update `ask` in `backend/services/chat.py`: keep the pre-chat embedding sync, supply callables (`similar_chunks`, `notes_service.create_note` with `BackgroundTasks`, `get_note`), pass the user ID in graph config, stream events from the T005 runner
- [X] T007 [US1] Update `POST /api/chat` in `backend/routes/chat.py` to return a `StreamingResponse` of newline-delimited JSON (`{"token": ...}` events, then `{"done": {answer, sources, pending_action, created_note}}`), accepting `BackgroundTasks`; keep the auth dependency
- [X] T008 [P] [US1] Add an `invalidateNotes` helper in `frontend/lib/notes.ts` that revalidates all SWR keys starting with `/api/notes`
- [X] T009 [US1] Update `frontend/app/(app)/ask/page.tsx`: call `/api/chat` with `fetch` plus the Clerk token (last 6 messages as history), read the NDJSON stream and append tokens to the assistant message, on the final event set sources and `created_note` link to `/notes/[id]`, call `invalidateNotes` after a create; keep loading and error states

## Phase 3: User Story 2 - Update, archive, delete with confirmation (P1)

**Independent check**: "delete note X" → action card, nothing changes until Confirm; Cancel discards; ambiguous request → assistant asks which note.

- [X] T010 [US2] Add `confirm(db, user_id, action, note_id, changes, background)` in `backend/services/chat.py`: re-validate ownership, then call `notes_service.update_note` / `archive_note` / `delete_note`; unknown action → HTTP 400
- [X] T011 [US2] Add `POST /api/chat/confirm` in `backend/routes/chat.py` (thin, auth dependency, `BackgroundTasks`) returning `{message, note}`
- [X] T012 [US2] In `frontend/app/(app)/ask/page.tsx` render the action card from `pending_action` (note title, change description, Confirm and Cancel); Confirm calls `/api/chat/confirm` via `apiFetch`, shows the result as a chat message, and calls `invalidateNotes`; Cancel dismisses the card; show confirm errors as a chat message

## Phase 4: User Story 3 - Lists stay in sync (P2)

**Independent check**: after create or a confirmed action, gallery, Archive, Deleted, and sidebar update without reload.

- [X] T013 [US3] Verify `invalidateNotes` is called after both create and confirmed actions in `frontend/app/(app)/ask/page.tsx` and that the gallery, Archive, Deleted pages and sidebar read from the same SWR keys; fix any list that doesn't refresh

## Dependencies

- Phase 1 → US1 → US2 (T010–T011 can start after T001; T012 needs T009) → US3.
- Parallel: T008 with T006–T007.
- MVP: Phases 1–2.
