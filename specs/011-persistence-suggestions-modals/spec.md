# Feature Specification: Chat History Persistence, Title Suggestions & Modal Confirmations

**Feature Branch**: `011-persistence-suggestions-modals`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Implement three features: (1) Chat History Persistence with Redis, (2) Intelligent Title Suggestions via LLM, and (3) Modal-based Delete Confirmation."

## Problem Statement

The current application lacks persistent chat history, making it difficult for users to recall previous conversations when returning to the ask page. Title suggestions require manual input even when the LLM can infer appropriate titles from context. Delete operations use browser prompts, which are not visually integrated with the UI and don't provide preview context. These features improve user experience by preserving conversation state, reducing manual input, and providing clear confirmation flows.

## Existing System Context (Repository Review)

- The application uses FastAPI backend with LangGraph and OpenAI for AI operations.
- Frontend is Next.js with TypeScript and shadcn/ui components.
- Authentication is handled by Clerk; backend verifies session tokens on protected requests.
- Chat functionality exists in `routes/chat.py` and `app/(app)/ask/page.tsx`.
- Notes and tasks are stored in Neon serverless PostgreSQL; Alembic manages schema changes.
- UI confirms actions with shadcn/ui components where available.
- Docker is used for deployment infrastructure.

## Requirements & Acceptance Criteria

### Requirement 1: Chat History Persistence with Redis

**Purpose**: Store chat conversations with automatic expiration to reduce manual conversation recovery burden.

**Acceptance Criteria**:

1. **Redis setup**: Docker Compose includes a Redis service with persistent storage configuration.
2. **Chat storage service**: Backend service stores chat sessions with 1-week (7-day) TTL.
3. **Message format**: Each message includes timestamp, sender (user/assistant), and content.
4. **Error handling**: If Redis is unavailable, chat continues without persistence; errors are logged, not surfaced to user.
5. **Frontend integration**: Ask page loads previous chat history on mount; users see their conversation context.
6. **Data retrieval**: Chat history is keyed by user ID and loads automatically when user navigates to ask page.

### Requirement 2: Intelligent Title Suggestions

**Purpose**: Suggest note titles based on context, reducing manual input and improving note organization.

**Acceptance Criteria**:

1. **LLM tool**: Backend exposes an LLM tool that accepts note context and returns title suggestions.
2. **Trigger**: Title suggestion modal appears only when user invokes "change title" without providing a name.
3. **Modal UI**: Shows suggested title with three buttons: Confirm, Dismiss, Regenerate.
4. **Regenerate**: Calls LLM again to generate an alternative title suggestion.
5. **Integration**: Flows through existing chat interface; title is applied to the note after confirmation.
6. **Context**: Tool accepts note text/summary and previous note context to generate contextually appropriate titles.

### Requirement 3: Modal-based Delete Confirmation

**Purpose**: Replace browser prompt with a styled modal that provides preview context and better UX.

**Acceptance Criteria**:

1. **Modal component**: Styled modal replaces `window.confirm()` for delete operations.
2. **Preview content**: Shows note title and first few lines (50-100 chars) of note content.
3. **Buttons**: Maintain confirm/dismiss buttons; dismiss closes modal without deleting.
4. **Integration**: Works with existing note delete flow in notes page and note detail page.
5. **Accessibility**: Modal is keyboard-navigable and has proper ARIA labels.
6. **Visual clarity**: Delete button is clearly indicated (e.g., red/warning color).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persistent Chat Context (Priority: P1)

As a user, I want my chat history to persist when I leave the ask page and return later, so that I can continue conversations without losing context.

**Why this priority**: Chat is a primary interaction point; losing conversation context reduces productivity.

**Independent Test**: Start a chat, leave the page, return to ask page, verify previous messages are loaded.

**Acceptance Scenarios**:

1. **Given** the user is on the ask page and submits multiple chat messages, **When** they leave and return to the ask page, **Then** all previous messages are displayed in the correct order.
2. **Given** the user has a conversation from 8 days ago, **When** they return to the ask page, **Then** the old conversation is no longer available (expired after 7 days).
3. **Given** Redis is unavailable, **When** the user refreshes the ask page, **Then** the chat interface remains functional with an empty history; no error message is shown to the user.
4. **Given** the user submits a message while Redis is temporarily unavailable, **When** Redis recovers, **Then** new messages are persisted normally.

### User Story 2 - Title Suggestions (Priority: P2)

As a user, I want the AI to suggest note titles based on the note content, so that I can quickly organize notes without manual input.

**Why this priority**: Improves note management efficiency; users often spend time choosing titles.

**Independent Test**: Request a title suggestion for a note; verify suggestion is relevant; test regenerate function.

**Acceptance Scenarios**:

1. **Given** the user has a note with content "Deployed the new microservice to production and updated monitoring alerts", **When** they request a title suggestion, **Then** a relevant title like "Deploy microservice and update monitoring" is suggested.
2. **Given** the suggestion modal is open, **When** the user clicks Regenerate, **Then** a different title suggestion is generated without closing the modal.
3. **Given** the suggestion modal is open, **When** the user clicks Dismiss, **Then** the modal closes and the note title remains unchanged.
4. **Given** the suggestion modal is open, **When** the user clicks Confirm, **Then** the modal closes and the note title is updated to the suggested title.
5. **Given** the user requests a title suggestion without changing the title manually, **When** the chat completes, **Then** the suggestion modal automatically appears.

### User Story 3 - Modal Delete Confirmation (Priority: P2)

As a user, I want to see a clear, contextual confirmation when deleting a note so that I can avoid accidental deletions.

**Why this priority**: Prevents data loss; improves UX with visual feedback.

**Independent Test**: Attempt to delete a note; verify modal appears with preview; test confirm and dismiss actions.

**Acceptance Scenarios**:

1. **Given** the user initiates a delete action on a note titled "Meeting Notes" with content "Discussed Q4 roadmap...", **When** the delete modal appears, **Then** the note title and first few lines are visible in the modal.
2. **Given** the delete modal is open, **When** the user clicks Dismiss, **Then** the modal closes and the note is not deleted.
3. **Given** the delete modal is open, **When** the user clicks the delete button, **Then** the note is deleted and the modal closes.
4. **Given** the delete modal is open, **When** the user presses Escape, **Then** the modal closes without deleting the note.

## Out of Scope

- Complex Redis configurations (master-slave, clustering); single-instance for this feature.
- Advanced LLM prompt engineering; use straightforward context-to-title prompts.
- Batch operations on delete (one note at a time for now).
- Chat analytics or logging beyond basic persistence.

## Success Metrics

- ✅ Chat history persists for 7 days and is available on ask page load.
- ✅ Title suggestion modal appears when requested and provides relevant suggestions.
- ✅ Delete confirmation modal replaces `window.confirm()` with styled UI and preview.
- ✅ All three features have zero user-visible errors; backend errors are logged only.
- ✅ Features integrate smoothly with existing chat, note, and task flows.
