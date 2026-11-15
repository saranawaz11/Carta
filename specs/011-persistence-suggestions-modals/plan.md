# Implementation Plan: Chat History Persistence, Title Suggestions & Modal Confirmations

**Status**: In Progress

**Date**: 2026-11-12

## Technical Context

### Current Architecture
- **Backend**: FastAPI, LangGraph, OpenAI, PostgreSQL (Neon), Uvicorn
- **Frontend**: Next.js, TypeScript, shadcn/ui, Clerk authentication
- **Infrastructure**: Docker Compose, Alembic (migrations)
- **Chat Module**: `routes/chat.py`, `app/(app)/ask/page.tsx`
- **Notes Module**: `routes/notes.py`, `app/(app)/notes/[id]/page.tsx`

### Tech Stack for Features
- **Redis**: In-memory data store for chat history with TTL support
- **LangGraph Tools**: Extend existing tool ecosystem for title suggestions
- **shadcn/ui Modals**: AlertDialog or Dialog component for delete confirmation

### Key Dependencies & Integrations
- **Redis Client**: `redis-py` or `aioredis` for async support
- **Docker Compose**: Add Redis service definition
- **Chat Service**: Extend existing chat route to load/save history
- **LLM Integration**: New tool in LangGraph for title suggestion
- **UI Components**: Modal dialog for delete confirmation

---

## Constitution Check

**Applied Principles**:
1. ✅ **Note Ownership & Operations**: Delete modal integrates with existing note delete flow.
2. ✅ **LLM Note Assistance**: Title suggestion tool uses LangGraph pattern.
3. ✅ **API and Backend Boundaries**: Chat history service in backend; frontend calls REST endpoint.
4. ✅ **Data and Schema Changes**: No PostgreSQL changes needed; Redis is separate store.
5. ✅ **Small, Spec-Driven Changes**: Minimal files; reuse shadcn/ui components; focus on three features only.

**Potential Concerns**: None identified.

---

## Phase 0: Research

### Unknowns & Research Tasks

1. **Redis persistence strategy** (NEEDS CLARIFICATION)
   - RDB snapshots vs AOF for production
   - Docker Compose Redis image and volume configuration
   - **Resolution**: Use Redis 7+ with RDB snapshots and named volume for persistence; simple, proven approach.

2. **LLM title suggestion prompt design** (NEEDS CLARIFICATION)
   - How to structure context input (full text, summary, structured fields)
   - Token budget and response format
   - **Resolution**: Accept truncated note content (max 500 tokens) + title if exists; return single best title.

3. **Chat history storage schema** (NEEDS CLARIFICATION)
   - Key structure (user_id:session_id or user_id only)
   - Data format (JSON, serialized list, or individual message keys)
   - **Resolution**: Use key `chat:${user_id}` with JSON array of messages; simplest for single active session.

4. **Error handling for Redis unavailability** (NEEDS CLARIFICATION)
   - Graceful degradation strategy; should UI show "offline" indicator?
   - **Resolution**: Log errors silently; chat works without persistence; no user-facing error message.

5. **Modal accessibility requirements** (NEEDS CLARIFICATION)
   - ARIA labels, focus management, keyboard navigation
   - **Resolution**: Use shadcn/ui AlertDialog with built-in accessibility features.

### Research Resolution

**Decision**: Redis + JSON, straightforward async service, shadcn/ui AlertDialog for modal.

**Rationale**: Minimal dependencies, leverages existing patterns, proven technologies.

**Alternatives Considered**: 
- IndexedDB (frontend-only, doesn't meet persistence requirement)
- Session-based storage (loses data on logout)
- PostgreSQL for chat (overkill; Redis is simpler for ephemeral data)

---

## Phase 1: Design & Contracts

### Data Model

#### Chat History
```
redis key: chat:${user_id}
value: JSON array of message objects

Message Object:
{
  id: string (uuid),
  timestamp: ISO 8601 datetime,
  sender: 'user' | 'assistant',
  content: string
}
```

#### Note Model (No changes)
Existing PostgreSQL note schema remains unchanged.

#### Title Suggestion Request
```
Input:
{
  note_id: string (uuid),
  note_content: string (max 500 chars),
  existing_title?: string
}

Output:
{
  suggested_title: string,
  reasoning?: string
}
```

### Service Contracts (API Endpoints)

#### 1. Chat History Endpoints

**GET** `/api/chat/history`
- **Purpose**: Retrieve chat history for the current user
- **Auth**: Requires Clerk session token
- **Response**: 
  ```json
  {
    "messages": [
      {
        "id": "uuid",
        "timestamp": "2026-11-12T15:25:41Z",
        "sender": "user|assistant",
        "content": "..."
      }
    ]
  }
  ```
- **Error**: 200 with empty array if Redis unavailable

**POST** `/api/chat/history`
- **Purpose**: Save a message to chat history
- **Auth**: Requires Clerk session token
- **Request**:
  ```json
  {
    "sender": "user|assistant",
    "content": "..."
  }
  ```
- **Response**: `{ "success": true }`
- **Error**: 200 with `{ "success": true }` even if Redis fails (graceful degradation)

#### 2. Title Suggestion Endpoint

**POST** `/api/notes/{id}/suggest-title`
- **Purpose**: Request LLM title suggestion for a note
- **Auth**: Requires Clerk session token
- **Request**:
  ```json
  {
    "content": "...",
    "existing_title": "..."
  }
  ```
- **Response**:
  ```json
  {
    "suggested_title": "...",
    "note_id": "uuid"
  }
  ```
- **Error**: 500 with error message if LLM fails

#### 3. Delete Confirmation (No new endpoint)
- Delete endpoint exists; modal is frontend-only with existing `/api/notes/{id}` DELETE endpoint

### UI Contracts

#### 1. Chat History Loading
- On `ask` page load, fetch chat history
- Display messages in conversation thread
- New messages saved to history automatically

#### 2. Title Suggestion Modal
- Triggered when user requests title change in chat (LangGraph tool call)
- Shows: suggested title, three buttons (Confirm, Dismiss, Regenerate)
- On Confirm: apply title via existing note update endpoint
- On Regenerate: call title suggestion endpoint again

#### 3. Delete Confirmation Modal
- Replaces `window.confirm()` in note delete flow
- Shows: note title, preview (first 100 chars), two buttons (Delete, Cancel)
- On Delete: call existing DELETE endpoint
- On Cancel/Escape: close modal without action

### Quickstart: Validation Scenarios

**Scenario 1: Chat History Persistence**
1. User navigates to `/ask`
2. Type message "What's the weather?" → See assistant response
3. Navigate away (e.g., to `/notes`)
4. Return to `/ask` → Previous messages visible
5. Send new message → Appends to history

**Scenario 2: Title Suggestion**
1. Open note with content "Deployed new version to production"
2. In chat, type "suggest a title" → Modal appears with "Deploy new version"
3. Click Confirm → Note title updated
4. Click Regenerate → Different title generated
5. Click Dismiss → Modal closes, title unchanged

**Scenario 3: Delete Confirmation**
1. On notes page, click delete for a note
2. Modal appears showing title and preview
3. Click Cancel → Modal closes, note intact
4. Initiate delete again, click Delete → Note deleted, modal closes

---

## Implementation Phases

### Phase 1: Redis Setup & Chat Persistence
1. Add Redis to Docker Compose
2. Create `services/chat_history.py` service
3. Add `/api/chat/history` GET and POST endpoints
4. Update `ask/page.tsx` to load and display history
5. Hook chat submission to persist messages

### Phase 2: Title Suggestion Tool & Modal
1. Create LLM tool for title suggestion in backend
2. Add title suggestion endpoint `/api/notes/{id}/suggest-title`
3. Create frontend `TitleSuggestionModal` component
4. Integrate modal into chat flow
5. Handle Confirm/Dismiss/Regenerate actions

### Phase 3: Delete Confirmation Modal
1. Create `DeleteConfirmationModal` component
2. Replace `window.confirm()` in notes delete flow
3. Integrate with existing DELETE endpoint
4. Test keyboard accessibility and Escape key

---

## Design Decisions

| Decision | Reason | Alternative |
|----------|--------|-------------|
| Redis for chat history | Ephemeral, TTL support, fast retrieval | PostgreSQL (overkill), IndexedDB (frontend-only) |
| JSON array in single key | Simplest schema for single session | Multiple keys per message (verbose) |
| Graceful Redis failure | Chat must work without persistence | Return error (blocks chat) |
| LangGraph tool for titles | Consistent with existing tools pattern | Direct OpenAI call (breaks abstraction) |
| shadcn/ui AlertDialog | Built-in accessibility, matches design | Custom modal (requires more work) |
| Modal for delete | Better UX than browser confirm | Keep `window.confirm()` (poor UX) |

---

## Dependencies & Constraints

- Redis client library (async): `redis` or `aioredis`
- No breaking changes to existing chat or note endpoints
- Chat history expires after 7 days (Redis TTL)
- Title suggestion requires active OpenAI connection
- Modal accessibility must pass WCAG AA

---

## Success Criteria

- [ ] Chat history loads on ask page; persists across sessions
- [ ] Title suggestion generates relevant titles; regenerate works
- [ ] Delete modal shows preview; keyboard navigation works
- [ ] Redis unavailability doesn't block chat
- [ ] All features integrated with existing flows
- [ ] No new dependencies added beyond Redis client

