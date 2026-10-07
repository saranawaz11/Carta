# Feature Specification: Ask AI

**Feature Branch**: `003-ask-ai`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Ask AI for Carta: question answering over the user's own notes with source references, building on the finished auth and notes CRUD steps."

## User Scenarios

### User Story 1 - Ask questions about my notes (Priority: P1)

- A signed-in user opens "Ask AI" from the sidebar, types a question, and gets an answer based only on their own notes. Each answer lists its source notes as links to `/notes/[id]`.
- **Acceptance Scenarios**:
  1. **Given** notes that contain the answer, **When** the user asks, **Then** the answer is shown with links to the source notes.
  2. **Given** no relevant notes, **When** the user asks, **Then** the assistant says it doesn't know and shows no sources.
  3. **Given** a follow-up question, **When** it is sent, **Then** the last few messages are sent with it as context.

### User Story 2 - Answers stay current with notes (Priority: P2)

- Edited, archived, and deleted notes are reflected in answers without user action.
- **Acceptance Scenarios**:
  1. **Given** a saved note, **When** it is edited, **Then** later answers use the new content only.
  2. **Given** an archived note, **When** the user asks, **Then** it can still be used as a source.
  3. **Given** a deleted or permanently deleted note, **When** the user asks, **Then** it is never used as a source.

### Edge Cases

- Users never retrieve another user's notes.
- Unchanged notes are never re-embedded; a note never has duplicate or stale vectors.
- A note saved but not yet embedded is embedded before the next question is answered.
- Chat history is not stored; reloading the page clears it.

## Requirements

### Functional Requirements

- **FR-001**: The sidebar MUST include an "Ask AI" link opening a chat page with a message input and message list (no styling).
- **FR-002**: Each answer MUST show its source notes as links to `/notes/[id]`.
- **FR-003**: The frontend MUST call only the FastAPI API and send the last few messages with each question; chat history MUST NOT be stored.
- **FR-004**: Notes MUST be split into chunks, embedded with OpenAI, and stored in Neon PostgreSQL with pgvector, created through an Alembic migration.
- **FR-005**: Retrieval MUST be scoped to the signed-in user's Clerk user ID.
- **FR-006**: Answers MUST be generated only from retrieved notes; if nothing relevant is found, the assistant MUST say it doesn't know.
- **FR-007**: A LangGraph graph with retrieve and generate steps MUST produce the answer and its source note list, using LangChain and OpenAI.
- **FR-008**: Each note MUST store a content hash. Embeddings MUST be created or replaced only when the hash changes, never for unchanged notes.
- **FR-009**: A note's old vectors MUST be removed in the same transaction that stores its new ones.
- **FR-010**: Embedding MUST run in the background after a note is saved. Notes whose hash differs from their embedded hash MUST be re-embedded before chat retrieval.
- **FR-011**: Deleting a note MUST remove its vectors. Archived notes MUST stay searchable; soft-deleted notes MUST be excluded.
- **FR-012**: OpenAI MUST be called only from the backend, and all LLM and embedding calls MUST live in one dedicated module.
- **FR-013**: API keys and model names MUST come from environment variables.

### Key Entities

- **Note**: Existing note plus a content hash and the hash last embedded.
- **Note chunk**: Note reference, owner Clerk user ID, chunk text, and embedding vector.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Answers use only the asking user's notes; no other user's content ever appears.
- **SC-002**: 100% of answers with content show at least one working source link; unanswerable questions get "I don't know" with no sources.
- **SC-003**: After a note edit, the next answer reflects the new content and never the old.
- **SC-004**: Saving an unchanged note triggers zero embedding calls.
- **SC-005**: Deleted notes never appear as sources; archived notes can.

## Assumptions

- Existing Clerk authentication supplies the user identity; notes CRUD is unchanged.
- "Last few messages" is a small fixed number (about 6).
- Out of scope: note CRUD via the LLM, summaries and deadlines, streaming, stored chat history, styling.
