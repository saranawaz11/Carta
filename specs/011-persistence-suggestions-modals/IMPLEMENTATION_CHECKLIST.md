# Implementation Checklist: 011-persistence-suggestions-modals

## PHASE 1: Foundation (Est. 50 minutes)

### Task 1.1: Add Redis to Docker Compose
- [ ] Update `docker-compose.yml` with Redis service
- [ ] Configure Redis port (6379)
- [ ] Set up named volume `redis_data` for persistence
- [ ] Add Redis environment variables to `.env`
- [ ] Test: `docker-compose up redis` starts successfully
- [ ] Verify: Redis CLI can connect to running container

### Task 1.2: Add Redis Client Dependency
- [ ] Add `redis` package to `backend/pyproject.toml`
- [ ] Update `backend/core/config.py` with Redis configuration
- [ ] Configure async connection pooling
- [ ] Add `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` to `.env`
- [ ] Add `CHAT_HISTORY_TTL=604800` to `.env`
- [ ] Test: Backend starts without Redis connection errors
- [ ] Verify: Graceful fallback if Redis unavailable

---

## PHASE 2: Chat Persistence (Est. 4 hours)

### Task 2.1: Create ChatHistoryService
- [ ] Create `backend/services/chat_history.py`
- [ ] Implement `ChatHistoryService` class
- [ ] Add method: `save_message(user_id, sender, content) -> dict`
  - [ ] Generate UUID for message id
  - [ ] Use current server time for timestamp
  - [ ] Store in Redis with 7-day TTL
  - [ ] Handle Redis errors gracefully (log, don't raise)
- [ ] Add method: `get_history(user_id) -> list`
  - [ ] Fetch from Redis key `chat:{user_id}`
  - [ ] Return empty list if not found or Redis unavailable
  - [ ] Return messages in ascending timestamp order
- [ ] Add method: `clear_history(user_id) -> bool`
  - [ ] Delete Redis key
  - [ ] Return success/failure
- [ ] Add error handling: Log all Redis exceptions, never surface to user
- [ ] Test: Service works with mock Redis

### Task 2.2: Add GET /api/chat/history Endpoint
- [ ] Add route to `backend/routes/chat.py`
- [ ] Implement `GET /chat/history` handler
- [ ] Add Clerk authentication verification
- [ ] Call `ChatHistoryService.get_history(user_id)`
- [ ] Return JSON: `{ "messages": [...] }`
- [ ] Response time should be < 100ms
- [ ] Test with curl: `curl -H "Authorization: Bearer {token}" localhost:8000/api/chat/history`

### Task 2.3: Add POST /api/chat/history Endpoint
- [ ] Add route to `backend/routes/chat.py`
- [ ] Implement `POST /chat/history` handler
- [ ] Add Clerk authentication verification
- [ ] Accept JSON: `{ "sender": "user"|"assistant", "content": "..." }`
- [ ] Call `ChatHistoryService.save_message(user_id, sender, content)`
- [ ] Return JSON: `{ "success": true, "id": "uuid", "timestamp": "iso8601" }`
- [ ] Return 200 regardless of Redis state (graceful degradation)
- [ ] Test with curl: Multiple POST requests

### Task 2.4: Update Frontend Ask Page to Load Chat History
- [ ] Modify `frontend/app/(app)/ask/page.tsx`
- [ ] Add `useEffect` hook on component mount
- [ ] Fetch chat history: `GET /api/chat/history`
- [ ] Handle fetch errors gracefully (show empty chat, no error message)
- [ ] Display messages in chat thread in chronological order
- [ ] Show loading state while fetching history
- [ ] Test: Navigate to ask page, verify previous messages load
- [ ] Test: Error case - mock API 500, verify chat still works

### Task 2.5: Integrate Message Persistence on Chat Submit
- [ ] Modify `frontend/app/(app)/ask/page.tsx` chat submission logic
- [ ] After user submits message:
  - [ ] Save user message: `POST /api/chat/history` with sender="user"
  - [ ] Add to local state for immediate display
- [ ] After assistant responds:
  - [ ] Save assistant message: `POST /api/chat/history` with sender="assistant"
  - [ ] Add to local state
- [ ] No UI blocking on save failures
- [ ] Test: Submit 3-5 messages, navigate away and back, verify all persist
- [ ] Test: Simulate network error, verify chat continues

---

## PHASE 3: Title Suggestions (Est. 5 hours)

### Task 3.1: Create LLM Title Suggestion Tool
- [ ] Modify `backend/llm.py`
- [ ] Add function: `suggest_title_tool(note_id, note_content, existing_title=None)`
- [ ] Prompt engineering:
  - [ ] Accept note content (max 500 tokens)
  - [ ] Include existing_title for context if provided
  - [ ] Prompt: "Suggest a concise (max 100 chars), descriptive title..."
  - [ ] Return only title string, no explanation
- [ ] Call OpenAI API with function parameters
- [ ] Handle API errors gracefully (return error message)
- [ ] Integrate with existing LangGraph tools pattern
- [ ] Test: Call with various note contents

### Task 3.2: Add Title Suggestion Endpoint
- [ ] Modify `backend/routes/notes.py`
- [ ] Add route: `POST /notes/{id}/suggest-title`
- [ ] Add Clerk authentication verification
- [ ] Verify user owns the note
- [ ] Accept JSON: `{ "content": "...", "existing_title": "..." }`
- [ ] Call title suggestion tool
- [ ] Return JSON: `{ "suggested_title": "...", "note_id": "..." }`
- [ ] Handle errors:
  - [ ] 400: Invalid note ID
  - [ ] 401: Unauthorized
  - [ ] 403: Forbidden (doesn't own note)
  - [ ] 404: Note not found
  - [ ] 500: LLM error
- [ ] Response time should be < 3 seconds
- [ ] Test with curl

### Task 3.3: Create Title Suggestion Modal Component
- [ ] Create `frontend/components/title-suggestion-modal.tsx`
- [ ] Use shadcn/ui Dialog component
- [ ] Component props:
  - [ ] `isOpen: boolean`
  - [ ] `suggestedTitle: string`
  - [ ] `noteId: string`
  - [ ] `onConfirm: (title: string) => void`
  - [ ] `onDismiss: () => void`
  - [ ] `onRegenerate: () => Promise<void>`
  - [ ] `isLoading?: boolean`
- [ ] UI elements:
  - [ ] Dialog header: "Suggested Title"
  - [ ] Input field showing suggested title (read-only or editable)
  - [ ] Three buttons: Dismiss, Regenerate, Confirm
  - [ ] Disable buttons during regeneration
- [ ] Accessibility:
  - [ ] ARIA labels on all buttons
  - [ ] Close on Escape key
  - [ ] Tab navigation between buttons
  - [ ] Focus management
- [ ] Test: Open/close modal, button states, keyboard nav

### Task 3.4: Integrate Title Suggestion Modal into Chat Flow
- [ ] Modify `frontend/app/(app)/ask/page.tsx`
- [ ] Add state for title suggestion modal
- [ ] Listen for title suggestion responses from chat
- [ ] Trigger modal when title suggestion tool is called
- [ ] Implement onConfirm handler:
  - [ ] Call `PATCH /api/notes/{id}` with new title
  - [ ] Close modal
  - [ ] Update note in UI
- [ ] Implement onDismiss handler:
  - [ ] Close modal without changing title
- [ ] Implement onRegenerate handler:
  - [ ] Call title suggestion endpoint again
  - [ ] Update modal with new suggestion
  - [ ] Keep modal open
- [ ] Test: Full flow - request title, confirm/dismiss/regenerate

---

## PHASE 4: Delete Modal (Est. 3 hours)

### Task 4.1: Create Delete Confirmation Modal Component
- [ ] Create `frontend/components/delete-confirmation-modal.tsx`
- [ ] Use shadcn/ui AlertDialog component
- [ ] Component props:
  - [ ] `isOpen: boolean`
  - [ ] `noteTitle: string`
  - [ ] `notePreview: string` (first 100 chars)
  - [ ] `onConfirm: () => Promise<void>`
  - [ ] `onDismiss: () => void`
  - [ ] `isLoading?: boolean`
- [ ] UI elements:
  - [ ] AlertDialog header: "Delete Note?"
  - [ ] Description: "This action cannot be undone."
  - [ ] Note preview box showing title + first 100 chars of content
  - [ ] Two buttons: Cancel (secondary), Delete (destructive/red)
- [ ] Styling:
  - [ ] Delete button has destructive color (red/warning)
  - [ ] Preview box has muted background
  - [ ] Clear visual hierarchy
- [ ] Accessibility:
  - [ ] ARIA labels
  - [ ] Close on Escape key
  - [ ] Tab navigation
  - [ ] Focus on Delete button (warning)
- [ ] Test: Modal appearance, accessibility, button states

### Task 4.2: Replace window.confirm() in Notes List Delete
- [ ] Modify `frontend/app/(app)/notes/page.tsx`
- [ ] Find delete button/handler in notes list
- [ ] Add state for delete confirmation modal
- [ ] Replace `window.confirm()` with modal:
  - [ ] Capture note data (id, title, content)
  - [ ] Extract preview (first 100 chars of content)
  - [ ] Open DeleteConfirmationModal
- [ ] Implement onConfirm handler:
  - [ ] Call `DELETE /api/notes/{id}`
  - [ ] On success: Remove from list, close modal, show toast
  - [ ] On error: Show error toast, keep modal open
- [ ] Implement onDismiss handler:
  - [ ] Close modal without deleting
- [ ] Test:
  - [ ] Click delete, modal appears with correct preview
  - [ ] Cancel button closes modal
  - [ ] Delete button removes note
  - [ ] Escape key dismisses modal

### Task 4.3: Replace window.confirm() in Note Detail Delete
- [ ] Modify `frontend/app/(app)/notes/[id]/page.tsx`
- [ ] Find delete button/handler in note detail view
- [ ] Add state for delete confirmation modal
- [ ] Replace `window.confirm()` with modal (same as 4.2)
- [ ] Implement onConfirm handler:
  - [ ] Call `DELETE /api/notes/{id}`
  - [ ] On success: Redirect to notes list
  - [ ] On error: Show error toast, keep modal open
- [ ] Implement onDismiss handler:
  - [ ] Close modal without deleting
- [ ] Test:
  - [ ] On note detail page, click delete
  - [ ] Modal appears with note content
  - [ ] Confirm deletes and redirects to list
  - [ ] Cancel/Escape dismisses and stays on detail page

---

## PHASE 5: Testing & Validation (Est. 4 hours)

### Task 5.1: Test Chat History Persistence End-to-End
- [ ] Test: Load ask page, send 3-5 messages
- [ ] Test: Navigate away (to notes page) and return
- [ ] Verify: All messages appear in correct chronological order
- [ ] Test: New message appends to history correctly
- [ ] Test: Old conversation (8+ days old) doesn't appear
- [ ] Test: Manually check Redis expiration:
  - [ ] Use Redis CLI: `KEYS chat:*`
  - [ ] Check TTL: `TTL chat:{user_id}`
  - [ ] Verify: TTL shows ~604800 seconds (7 days)
- [ ] Test: Redis unavailability
  - [ ] Stop Redis container
  - [ ] Try to send message - chat should work
  - [ ] No error shown to user
  - [ ] Backend logs show connection error
  - [ ] Restart Redis - history loads again

### Task 5.2: Test Title Suggestion Modal Functionality
- [ ] Test: Open note with substantive content
- [ ] Test: Request title suggestion in chat
- [ ] Verify: Modal appears with relevant suggestion
- [ ] Test: Click Confirm - title updates on note
- [ ] Test: Request again, click Dismiss - title unchanged
- [ ] Test: Request again, click Regenerate multiple times
  - [ ] Verify: Different suggestions generated
  - [ ] Verify: Modal stays open during regeneration
  - [ ] Verify: Loading state shown
- [ ] Test: Modal keyboard navigation
  - [ ] Tab between buttons
  - [ ] Enter to activate
  - [ ] Escape to dismiss
- [ ] Test: Various note types
  - [ ] Short notes
  - [ ] Long notes
  - [ ] Empty notes (should still generate title)
  - [ ] Notes with special characters

### Task 5.3: Test Delete Confirmation Modal Functionality
- [ ] Test: Notes list, click delete
- [ ] Verify: Modal shows title + preview
- [ ] Verify: Preview is accurate (first 100 chars)
- [ ] Test: Click Cancel - note NOT deleted
- [ ] Test: Delete again, click Delete button - note deleted
- [ ] Test: Modal closes after successful delete
- [ ] Test: Keyboard navigation
  - [ ] Tab to buttons
  - [ ] Enter to activate
  - [ ] Escape to dismiss (no delete)
- [ ] Test: On note detail page (same flow)
- [ ] Test: After delete, redirect to notes list
- [ ] Test: Error handling - mock API 500
  - [ ] Error toast appears
  - [ ] Modal stays open
  - [ ] Can try again or dismiss

### Task 5.4: Test Redis Unavailability Graceful Degradation
- [ ] Stop Redis container: `docker-compose down redis`
- [ ] Backend should still start
- [ ] Chat should work (no persistence, no error)
- [ ] Title suggestions should work
- [ ] Delete should work
- [ ] Verify backend logs:
  - [ ] Redis connection errors logged
  - [ ] No 500 errors in response
- [ ] Check frontend: No error messages shown
- [ ] Restart Redis: `docker-compose up redis`
- [ ] Verify: New messages persist again
- [ ] Verify: No data loss or corruption

### Task 5.5: Integration & Edge Cases
- [ ] Test: Multiple rapid messages - all persist
- [ ] Test: Very long messages (10000 chars)
- [ ] Test: Messages with special characters/emojis
- [ ] Test: Empty content edge cases
- [ ] Test: Concurrent requests to same endpoint
- [ ] Test: Network latency simulation
- [ ] Test: Browser back/forward navigation
- [ ] Test: Multiple browser tabs with same user

### Task 5.6: Performance & Monitoring
- [ ] Measure: Chat history load time (should be < 100ms)
- [ ] Measure: Title suggestion latency (should be < 3s)
- [ ] Measure: Redis memory usage with 100+ conversations
- [ ] Check: No N+1 queries in API endpoints
- [ ] Check: Backend logs for errors/warnings
- [ ] Monitor: Error rates and response times

---

## Dependency Tracking

```
Phase 1 (Redis Setup)
    ↓
Phase 2 (Chat Persistence)
    ↓
Phase 3 & 4 (Can run in parallel)
    ↓
Phase 5 (Testing)
```

### Critical Path
1. Phase 1: Redis setup (required for everything)
2. Phase 2: Chat service (primary feature)
3. Phase 5: Testing (validation)

### Parallelization Opportunities
- Phase 3 (title suggestions) can start after Phase 1.2
- Phase 4 (delete modal) can start anytime (no dependencies)
- Backend and frontend can work in parallel within each phase

---

## Sign-Off Criteria

- [ ] All 18 tasks completed
- [ ] All acceptance criteria met
- [ ] Phase 5 testing passed
- [ ] No user-visible errors
- [ ] Existing functionality unaffected
- [ ] Code reviewed and merged
- [ ] Feature deployed to staging
- [ ] Feature documentation updated

---

## Notes & Progress Tracking

```
Phase 1: [________] 0%
Phase 2: [________] 0%
Phase 3: [________] 0%
Phase 4: [________] 0%
Phase 5: [________] 0%

Overall: [________] 0%
```

Start date: ____________
End date: ____________
