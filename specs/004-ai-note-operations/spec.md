# Feature Specification: AI Note Operations

**Feature Branch**: `004-ai-note-operations`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "LLM-driven note operations in the existing Ask AI chat (/ask): search, create, update, archive, delete via natural language, with confirmation for destructive changes, and streamed answers."

## User Scenarios

### User Story 1 - Search and create notes by chat (Priority: P1)

- A signed-in user types a request in the Ask AI chat. Questions search their notes (with source links); "create a note about X" creates it immediately and shows a link to `/notes/[id]`.
- **Acceptance Scenarios**:
  1. **Given** a request to create a note, **When** sent, **Then** the note is created at once and shown as a link to `/notes/[id]`.
  2. **Given** a question about existing notes, **When** sent, **Then** the answer cites source notes as links, as before.
  3. **Given** any answer, **When** it is generated, **Then** the text appears progressively as it is produced.

### User Story 2 - Update, archive, delete with confirmation (Priority: P1)

- The user asks to edit, archive, or delete a note. The assistant never acts directly; the chat shows an action card (which note, what change) with Confirm and Cancel.
- **Acceptance Scenarios**:
  1. **Given** an action card, **When** the user clicks Confirm, **Then** the action runs and the result is shown.
  2. **Given** an action card, **When** the user clicks Cancel, **Then** nothing changes and the card is discarded.
  3. **Given** a request that is ambiguous or matches several notes, **When** sent, **Then** the assistant asks which note is meant and shows no card.
  4. **Given** a deleted note, **When** confirmed, **Then** it is soft-deleted exactly as in the manual feature.

### User Story 3 - Lists stay in sync (Priority: P2)

- **Acceptance Scenarios**:
  1. **Given** an executed action, **When** it completes, **Then** the notes gallery, Archive, Deleted lists and the sidebar show the change without a full page reload.

### Edge Cases

- Users can only act on their own notes; identity comes from the signed-in session, never from model output.
- A proposed action whose note was changed or deleted before Confirm fails with a clear message.
- Chat history is not stored; reloading clears messages and pending cards.
- Restoring and permanently deleting notes are not available through chat.

## Requirements

### Functional Requirements

- **FR-001**: The existing `/ask` chat MUST accept natural-language requests to search, create, update, archive, and delete notes; no new page or button.
- **FR-002**: The assistant MUST choose the matching operation itself from the request.
- **FR-003**: Search and create MUST run immediately; created notes MUST appear as links to `/notes/[id]`; search answers MUST keep source links.
- **FR-004**: Update, archive, and delete MUST NOT execute from the assistant's request; the chat MUST show an action card naming the note and the change, with Confirm and Cancel.
- **FR-005**: Only Confirm MUST execute the action; Cancel MUST discard it.
- **FR-006**: Ambiguous or multi-match requests MUST produce a clarifying question, not a card.
- **FR-007**: All operations MUST act only on the signed-in user's notes, with identity taken from the authenticated request.
- **FR-008**: Operations MUST reuse the existing notes behavior (ownership rules, embedding sync, soft delete).
- **FR-009**: After any executed action, the gallery, Archive, Deleted lists, and sidebar MUST reflect it without a full reload.
- **FR-010**: Chat MUST remain stateless; history is sent from the frontend with each request. No server-side history storage is needed. Empty messages MUST never be sent to the LLM.
- **FR-011**: Assistant answers MUST stream to the chat as they are generated. A proposal MUST always produce a visible confirmation message, and a stream failure MUST show a chat error instead of a network error.
- **FR-013**: When a proposal is pending, the frontend MUST send it with the next chat request; a clear "yes" in chat MUST execute it and "no" MUST discard it (same stale-note check as the Confirm button), and the assistant MUST NOT re-ask or re-propose. The card's Confirm/Cancel remain available.
- **FR-012**: Out of scope: slash-command menu, summaries and deadlines, restore, permanent delete, styling.

### Key Entities

- **Chat message**: Role and text; may carry source links, a created-note link, or an action card.
- **Action card**: Proposed update, archive, or delete: target note, described change, and state (pending, confirmed, cancelled).

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of update, archive, and delete changes occur only after an explicit Confirm.
- **SC-002**: A created note appears as a link in the chat within 5 seconds of the request.
- **SC-003**: Answer text starts appearing within 3 seconds of sending.
- **SC-004**: Executed actions show in all note lists without a manual reload.
- **SC-005**: No request ever changes or reveals another user's notes.

## Assumptions

- Builds on the finished auth, notes CRUD, and Ask AI features.
- Pending action cards live only on the page and are lost on reload.
- Streaming applies to answer text; cards and links appear when the response completes.
