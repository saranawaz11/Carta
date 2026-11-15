# Implementation Plan Summary: Chat History Persistence, Title Suggestions & Delete Modal

**Feature**: 011-persistence-suggestions-modals  
**Status**: Planning Complete - Ready for Development  
**Created**: 2026-11-12  
**Estimated Effort**: ~16.5 hours  

---

## Three Features at a Glance

### 1️⃣ Chat History Persistence with Redis
**Goal**: Preserve chat conversations with 7-day auto-expiration  
**User Benefit**: Return to ask page and pick up where you left off  
**Tech**: Redis + async Python client + Next.js state management

**Key Components**:
- Redis service in Docker Compose with persistent volume
- `ChatHistoryService` backend service (save/retrieve messages)
- GET `/api/chat/history` + POST `/api/chat/history` endpoints
- Frontend hooks to load history on ask page mount and persist on chat submit
- Graceful fallback if Redis unavailable (chat works, just no persistence)

---

### 2️⃣ Intelligent Title Suggestions
**Goal**: Suggest relevant note titles based on content via LLM  
**User Benefit**: Quick note organization without manual typing  
**Tech**: LangGraph tool + OpenAI + shadcn/ui Modal

**Key Components**:
- New LLM tool in `llm.py` for title suggestion
- POST `/api/notes/{id}/suggest-title` endpoint
- `TitleSuggestionModal` component with Confirm/Dismiss/Regenerate buttons
- Integration into chat flow (triggered by user request)
- Modal state management and button handlers

---

### 3️⃣ Modal-Based Delete Confirmation
**Goal**: Replace browser `window.confirm()` with styled modal showing preview  
**User Benefit**: Clearer, safer deletion with content preview  
**Tech**: shadcn/ui AlertDialog + existing note delete flow

**Key Components**:
- `DeleteConfirmationModal` component showing title + preview
- Replace `window.confirm()` in notes delete flows (list & detail views)
- Keyboard accessibility (Tab, Enter, Escape)
- Integration with existing DELETE `/api/notes/{id}` endpoint

---

## Task Breakdown by Phase

### Phase 1: Foundation (50 minutes)
- ✅ Add Redis to Docker Compose
- ✅ Install Redis client library & configure async connection

### Phase 2: Chat Persistence (4 hours)
- ✅ Create `ChatHistoryService` with save/retrieve/clear methods
- ✅ Build GET `/api/chat/history` endpoint
- ✅ Build POST `/api/chat/history` endpoint
- ✅ Load history on ask page mount
- ✅ Persist messages on chat submit

### Phase 3: Title Suggestions (5 hours)
- ✅ Create LLM tool for title generation
- ✅ Build POST `/api/notes/{id}/suggest-title` endpoint
- ✅ Create `TitleSuggestionModal` component
- ✅ Integrate modal into chat flow with state management

### Phase 4: Delete Modal (3 hours)
- ✅ Create `DeleteConfirmationModal` component
- ✅ Replace confirm() in notes list delete
- ✅ Replace confirm() in note detail delete

### Phase 5: Testing & Validation (4 hours)
- ✅ End-to-end chat history testing
- ✅ Title suggestion functionality testing
- ✅ Delete modal interaction testing
- ✅ Redis unavailability graceful degradation testing

---

## Quick Reference: Files to Create/Modify

### Backend Files
```
backend/
├── core/config.py                 [MODIFY] Add Redis config
├── services/chat_history.py       [CREATE] ChatHistoryService
├── routes/chat.py                 [MODIFY] Add history endpoints
├── routes/notes.py                [MODIFY] Add title suggestion endpoint
├── llm.py                         [MODIFY] Add title suggestion tool
└── pyproject.toml                 [MODIFY] Add redis dependency
```

### Frontend Files
```
frontend/
├── app/(app)/ask/page.tsx         [MODIFY] Load & persist chat history
├── app/(app)/notes/page.tsx       [MODIFY] Integrate delete modal
├── app/(app)/notes/[id]/page.tsx  [MODIFY] Integrate delete modal
├── components/
│   ├── title-suggestion-modal.tsx [CREATE] Suggestion UI
│   └── delete-confirmation-modal.tsx [CREATE] Delete confirmation UI
└── lib/api.ts                     [MODIFY] Add API call helpers
```

### Docker Files
```
docker-compose.yml                 [MODIFY] Add Redis service
.env                               [MODIFY] Add Redis env vars
```

---

## Implementation Strategy

### Recommended Order
1. **Start with Phase 1** (Foundation): Get Redis running first
2. **Then Phase 2** (Chat Persistence): Visible progress on main feature
3. **Parallel Phases 3 & 4**: Title suggestion and delete modal are independent
4. **Finish with Phase 5** (Testing): Comprehensive end-to-end validation

### Parallelization Opportunities
- Title suggestion (Phase 3) can be built in parallel with chat persistence once Redis is ready
- Delete modal (Phase 4) is completely independent and can be built anytime
- Backend and frontend work can be parallelized if working in teams

---

## Key Design Decisions

| What | Why | Alternative |
|------|-----|-------------|
| **Redis** for chat history | Fast, TTL support, perfect for ephemeral data | PostgreSQL (overkill), IndexedDB (frontend-only) |
| **Single JSON array** in Redis | Simplest schema, single active session per user | Multiple keys per message (too granular) |
| **Graceful Redis failure** | Chat must always work | Return error (breaks UX) |
| **LangGraph tool** for titles | Consistent with existing tool pattern | Direct OpenAI call (loses abstraction) |
| **shadcn/ui components** | Accessible, matches design system | Custom modals (more code, same result) |
| **7-day TTL** | Reasonable retention without DB bloat | Longer (wastes storage), shorter (loses history) |

---

## Success Criteria Checklist

- [ ] Redis container starts and persists data across restarts
- [ ] Chat history loads within 100ms on ask page mount
- [ ] Messages persist even if Redis briefly unavailable
- [ ] Title suggestions are relevant and generated in <3 seconds
- [ ] Regenerate button produces different suggestions
- [ ] Delete modal shows title and preview correctly
- [ ] All modals are keyboard accessible (Tab, Enter, Escape)
- [ ] No errors surface to users (all logged server-side)
- [ ] Existing chat/note/task flows unaffected

---

## API Contracts Summary

### Chat History
- `GET /api/chat/history` → `{ "messages": [...] }` (200, empty array if Redis down)
- `POST /api/chat/history` → `{ "success": true }` (200 regardless of Redis state)

### Title Suggestions
- `POST /api/notes/{id}/suggest-title` → `{ "suggested_title": "...", "note_id": "..." }` (200)

### Delete (Existing)
- `DELETE /api/notes/{id}` → `{ "success": true }` (200)

---

## Documentation Files

- **spec.md**: Feature specification with user stories, requirements, acceptance scenarios
- **plan.md**: Technical design, data models, contracts, design decisions
- **tasks.md**: Detailed task list with dependencies, acceptance criteria, time estimates
- **IMPLEMENTATION_SUMMARY.md**: This file (quick reference)

---

## Next Steps

1. Read `spec.md` to understand the full requirements
2. Review `plan.md` for technical design and contracts
3. Open `tasks.md` and start implementing from Phase 1
4. Use this summary as a quick reference during development

Good luck! 🚀
