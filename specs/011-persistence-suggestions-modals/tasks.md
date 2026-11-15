# Tasks: Chat History Persistence, Title Suggestions & Modal Confirmations

**Feature**: 011-persistence-suggestions-modals  
**Status**: Ready for Implementation

---

## Task Dependencies

```
Redis Setup & Dependencies
  ↓
Backend Chat History Service
  ├→ GET /api/chat/history endpoint
  └→ POST /api/chat/history endpoint
    ↓
Frontend: Load and Display Chat History
  ↓
Title Suggestion LLM Tool
  ↓
Title Suggestion Endpoint & Modal UI
  ↓
Delete Confirmation Modal (parallel)
```

---

## Task List

### Phase 1: Foundation (Redis & Dependencies)

#### Task 1.1: Add Redis to Docker Compose
- **Description**: Configure Redis service in docker-compose.yml with persistent storage
- **Files to Create/Modify**: `docker-compose.yml`
- **Acceptance Criteria**:
  - Redis service runs on port 6379
  - Named volume `redis_data` persists data
  - Environment variables for Redis host/port in `.env`
  - Docker Compose starts without errors
- **Time Estimate**: 30 minutes

#### Task 1.2: Add Redis Client Dependency
- **Description**: Install and configure async Redis client in backend
- **Files to Create/Modify**: `backend/pyproject.toml`, `backend/core/config.py`
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - `redis` (async version) added to dependencies
  - Redis connection configuration loaded from environment
  - Connection pooling configured for concurrent use
  - Backend starts without Redis connection errors (graceful fallback)
- **Time Estimate**: 20 minutes

---

### Phase 2: Chat History Persistence

#### Task 2.1: Create Chat History Service
- **Description**: Implement backend service to store/retrieve chat history from Redis
- **Files to Create/Modify**: `backend/services/chat_history.py`
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - `ChatHistoryService` class with methods: `save_message()`, `get_history()`, `clear_history()`
  - Messages stored in Redis with user_id key: `chat:${user_id}`
  - 7-day TTL applied to Redis key on each message save
  - All Redis operations handle exceptions gracefully; errors logged, not raised
  - Service returns empty list if Redis unavailable
- **Time Estimate**: 1 hour

#### Task 2.2: Add GET /api/chat/history Endpoint
- **Description**: Backend endpoint to retrieve chat history for authenticated user
- **Files to Create/Modify**: `backend/routes/chat.py`
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - GET endpoint at `/chat/history`
  - Requires Clerk session token (verify_user middleware)
  - Returns JSON array of messages with id, timestamp, sender, content fields
  - Returns 200 with empty array if no history or Redis unavailable
  - Response time < 100ms for typical history (50-100 messages)
- **Time Estimate**: 45 minutes

#### Task 2.3: Add POST /api/chat/history Endpoint
- **Description**: Backend endpoint to save individual messages to chat history
- **Files to Create/Modify**: `backend/routes/chat.py`
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - POST endpoint at `/chat/history`
  - Accepts JSON: `{ "sender": "user"|"assistant", "content": "..." }`
  - Requires Clerk session token
  - Returns `{ "success": true }` regardless of Redis state
  - Generates UUID for message id and current timestamp automatically
  - Message persists with 7-day TTL
- **Time Estimate**: 45 minutes

#### Task 2.4: Update Frontend Ask Page to Load Chat History
- **Description**: Load and display chat history when ask page mounts
- **Files to Create/Modify**: `frontend/app/(app)/ask/page.tsx`, `frontend/lib/api.ts`
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - On page load, fetch chat history via GET /api/chat/history
  - Display messages in correct chronological order
  - Show loading state while fetching
  - Handle fetch errors gracefully (show empty chat, not error message)
  - New chat messages appended to displayed history
  - Typing indicator shown while awaiting assistant response
- **Time Estimate**: 1 hour

#### Task 2.5: Integrate Message Persistence on Chat Submit
- **Description**: Automatically persist user and assistant messages to Redis
- **Files to Create/Modify**: `frontend/app/(app)/ask/page.tsx`
- **Dependencies**: Task 2.3
- **Acceptance Criteria**:
  - User message saved to history after submission
  - Assistant message saved to history after completion
  - No UI blocking on save failures
  - Messages persist even if Redis temporarily unavailable (retry on next send)
- **Time Estimate**: 45 minutes

---

### Phase 3: Title Suggestion

#### Task 3.1: Create LLM Title Suggestion Tool
- **Description**: Add new tool to LangGraph for generating title suggestions
- **Files to Create/Modify**: `backend/llm.py`
- **Dependencies**: Task 1.1 (foundation)
- **Acceptance Criteria**:
  - Tool accepts note_id, note_content, existing_title (optional)
  - Calls OpenAI with prompt: "Suggest a concise, descriptive title for this note: {content}"
  - Returns title as string (max 100 chars)
  - Tool integrates with existing LangGraph tools
  - Handles OpenAI errors gracefully (returns error message)
- **Time Estimate**: 1 hour

#### Task 3.2: Add Title Suggestion Endpoint
- **Description**: Backend endpoint to request title suggestions
- **Files to Create/Modify**: `backend/routes/notes.py`
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - POST endpoint at `/notes/{id}/suggest-title`
  - Accepts JSON: `{ "content": "...", "existing_title": "..." }`
  - Requires Clerk session token; verify user owns note
  - Returns JSON: `{ "suggested_title": "...", "note_id": "..." }`
  - Handles LLM errors with 500 status and error message
  - Response time < 3 seconds (OpenAI latency)
- **Time Estimate**: 45 minutes

#### Task 3.3: Create Title Suggestion Modal Component
- **Description**: Frontend React component for title suggestion UI
- **Files to Create/Modify**: `frontend/components/title-suggestion-modal.tsx`
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Uses shadcn/ui Dialog component
  - Shows suggested title in editable form field
  - Three buttons: Confirm (primary), Dismiss (secondary), Regenerate (tertiary)
  - Button states: disabled during regeneration
  - Close on Escape key
  - ARIA labels for accessibility
  - Accessible by keyboard tab/enter navigation
- **Time Estimate**: 1.5 hours

#### Task 3.4: Integrate Title Suggestion Modal into Chat Flow
- **Description**: Wire suggestion modal to chat interface; trigger on title change request
- **Files to Create/Modify**: `frontend/app/(app)/ask/page.tsx`, `frontend/components/title-suggestion-modal.tsx`
- **Dependencies**: Task 3.3
- **Acceptance Criteria**:
  - Modal appears when user sends message like "suggest a title for this note"
  - Modal does not block chat interface
  - Confirm button calls PATCH /api/notes/{id} to update title
  - Dismiss button closes modal without changing title
  - Regenerate button calls title suggestion endpoint again
  - Modal closes automatically after Confirm or Dismiss
- **Time Estimate**: 1.5 hours

---

### Phase 4: Delete Confirmation Modal

#### Task 4.1: Create Delete Confirmation Modal Component
- **Description**: Frontend React component for delete confirmation
- **Files to Create/Modify**: `frontend/components/delete-confirmation-modal.tsx`
- **Dependencies**: Task 1.1 (foundation, no actual dependency)
- **Acceptance Criteria**:
  - Uses shadcn/ui AlertDialog component
  - Shows note title as heading
  - Shows note preview (first 100 characters)
  - Two buttons: Delete (red/destructive), Cancel (secondary)
  - Close on Escape key
  - ARIA labels for accessibility
  - Focused Delete button is visually distinctive
  - Accessible by keyboard tab/enter navigation
- **Time Estimate**: 1 hour

#### Task 4.2: Replace window.confirm() in Notes Delete Flow
- **Description**: Integrate delete modal into existing note delete operations
- **Files to Create/Modify**: `frontend/app/(app)/notes/page.tsx`, `frontend/app/(app)/notes/[id]/page.tsx`
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Delete button initiates modal instead of window.confirm()
  - Modal receives note title and content preview as props
  - Cancel button closes modal without deleting
  - Delete button calls DELETE /api/notes/{id} endpoint
  - Success removes note from UI; error shows toast notification
  - Works for single note delete and bulk delete in list (one at a time)
  - Escape key dismisses modal without deleting
- **Time Estimate**: 1.5 hours

#### Task 4.3: Add Delete Confirmation to Note Detail Page
- **Description**: Ensure delete modal works in note detail view
- **Files to Create/Modify**: `frontend/app/(app)/notes/[id]/page.tsx`
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Delete button on note detail page opens modal
  - Successful delete redirects to notes list
  - Preview shows full note content if available
  - Keyboard navigation works
- **Time Estimate**: 45 minutes

---

### Phase 5: Integration & Testing

#### Task 5.1: Test Chat History Persistence End-to-End
- **Description**: Manual testing of chat history across page navigation
- **Files Modified**: None (testing task)
- **Dependencies**: Task 2.5
- **Acceptance Criteria**:
  - Submit 3-5 messages on ask page
  - Navigate away and return
  - All messages appear in correct order
  - New message appends to history
  - Old conversation (8+ days) does not appear
  - Clear history via developer tools confirms expiration
- **Time Estimate**: 1 hour

#### Task 5.2: Test Title Suggestion Modal Functionality
- **Description**: Manual testing of suggestion modal interactions
- **Files Modified**: None (testing task)
- **Dependencies**: Task 3.4
- **Acceptance Criteria**:
  - Request title suggestion appears
  - Confirm updates note title
  - Dismiss closes without changing title
  - Regenerate produces different suggestion
  - Keyboard navigation (Tab, Enter, Escape) works
  - Suggestion appears for various note types (short, long, empty)
- **Time Estimate**: 1 hour

#### Task 5.3: Test Delete Confirmation Modal Functionality
- **Description**: Manual testing of delete modal interactions
- **Files Modified**: None (testing task)
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - Delete button opens modal with title and preview
  - Cancel closes modal without deleting
  - Delete removes note and closes modal
  - Escape key dismisses without deleting
  - Keyboard navigation works (Tab, Enter, Escape)
  - Modal appears for delete in notes list and detail view
  - Works with various note titles and content lengths
- **Time Estimate**: 1 hour

#### Task 5.4: Test Redis Unavailability Graceful Degradation
- **Description**: Verify chat and app work without Redis
- **Files Modified**: None (testing task)
- **Dependencies**: Task 2.5
- **Acceptance Criteria**:
  - Stop Redis container
  - Chat interface remains functional
  - No error messages shown to user
  - Backend logs show connection failures
  - Restart Redis; messages persist normally
  - No data loss or corruption
- **Time Estimate**: 45 minutes

---

## Summary

| Phase | Tasks | Estimate | Dependencies |
|-------|-------|----------|--------------|
| 1: Foundation | 2 tasks | 50 min | None |
| 2: Chat Persistence | 5 tasks | 4 hours | Phase 1 |
| 3: Title Suggestion | 4 tasks | 5 hours | Phase 1 |
| 4: Delete Modal | 3 tasks | 3 hours | Phase 1 |
| 5: Testing | 4 tasks | 4 hours | Phases 2-4 |
| **Total** | **18 tasks** | **~16.5 hours** | — |

---

## Ready for Implementation

All tasks are defined with clear acceptance criteria and time estimates. Begin with Phase 1 (Redis setup), then proceed sequentially through Phases 2-4 in parallel where possible. Phase 5 validates the complete feature integration.

