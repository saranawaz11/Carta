# Tasks: Streaming Voice Input

**Input**: Design documents from `/specs/008-streaming-voice-input/`

**Prerequisites**: `plan.md`, `spec.md`

**Organization**: Tasks are grouped by user story. No test tasks are included, per the constitution.

## Phase 1: Setup

**Purpose**: Configure transcription-specific settings without adding dependencies or secrets.

- [X] T001 Add `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-transcribe`), `VOICE_VAD_THRESHOLD` (default `0.4`), and `VOICE_SILENCE_MS` (default `1000`) in `backend/core/config.py`, and document their names/defaults in `backend/README.md` without editing secret values.

## Phase 2: Foundational

**Purpose**: Implement the authenticated relay and shared browser audio/transcription layer required by both user stories.

- [X] T002 [P] Extract a reusable Clerk token-to-user verifier in `backend/core/auth.py`; preserve the current REST dependency's issuer, signature, expiry, subject, and authorized-party checks while making the verifier callable by a WebSocket route.
- [X] T003 [P] Add an async Realtime transcription session helper in `backend/llm.py` using `OPENAI_API_KEY`, the configured model, PCM16 24 kHz input, near-field noise reduction, the instruction to transcribe faithfully without inventing words, and server VAD with 300 ms prefix padding and configured threshold/silence.
- [X] T004 Implement the authenticated session relay lifecycle in `backend/services/transcription.py`: require the first text message to be `{"type":"auth","token":"..."}` within five seconds; reject invalid or missing auth with close code 4401; enforce one active session per Clerk user and a five-minute limit; accept only binary mono PCM16 24 kHz frames up to 64 KiB; relay audio as OpenAI `input_audio_buffer.append`; order transcript events by committed `item_id`/`previous_item_id`; handle stop by committing buffered audio and waiting for completion; notify on limits; release resources and never log or store audio/transcript.
- [X] T005 Add the thin `/ws/transcribe` WebSocket route in `backend/routes/transcription.py`, authenticating before calling the relay service, and register it in `backend/main.py`.
- [X] T006 [P] Add the PCM16 mono capture/downsampling AudioWorklet in `frontend/public/pcm-capture-worklet.js` and the shared `useVoiceInput` hook/voice button in `frontend/lib/voice.ts`; request audio with echo cancellation, noise suppression, and auto gain control; send Clerk `getToken` auth before ~100 ms binary frames to the `NEXT_PUBLIC_API_URL` WebSocket; on stop, stop microphone frames, send the stop control message, wait for the final phrase, and then close; expose idle/connecting/listening/error, finalized phrases plus replaceable live text, and cleanup on unmount, navigation, disconnect, and five-minute limit.
- [X] T007 [P] Replace simulated recording, sample playback, and placeholder transcript behavior in `frontend/components/voice-note.tsx` with the shared live voice control; display connecting/listening/error states and live phrase replacement, preserve the existing visual design, and pass finalized and in-progress text to each caller without adding playback.

**Checkpoint**: Shared backend relay and frontend capture layer are ready for each UI story.

## Phase 3: User Story 1 - Dictate Quick Capture (Priority: P1) MVP

**Goal**: Dictate into the Quick Capture text state, then submit the finalized text through the existing capture flow.

**Independent Test**: Open Quick Capture, dictate a sentence, and confirm text updates while speaking, remains editable only after dictation stops and the final phrase completes, and submits through the existing agent flow. Verify the 500-character limit and visible permission/connection/session-limit errors.

- [X] T008 [US1] Wire dictation into the existing Quick Capture text state in `frontend/components/quick-capture.tsx`; append committed text and the current live phrase up to 500 characters, stop with a limit message, make the textarea read-only during dictation, disable Capture until stop and phrase completion, submit via the current capture flow, and stop dictation when the dialog closes.

## Phase 4: User Story 2 - Dictate Note Content (Priority: P1)

**Goal**: Insert finalized and live dictation into note content at the cursor position captured when dictation starts, without dictating the title or saving partial phrases.

**Independent Test**: Place the content cursor between existing text, dictate a phrase, and confirm it is inserted at that position; confirm the title is unchanged, typing is blocked while dictating, and autosave resumes only when no phrase is in progress.

- [X] T009 [US2] Wire the shared live voice control into `frontend/app/(app)/notes/[id]/page.tsx`; capture `contentRef.current.selectionStart` on start, splice committed text and the live preview at that original offset via `setContent`, keep the content textarea read-only while listening, gate the existing 800 ms autosave until dictation and the in-progress phrase are complete, restore the caret after inserted content, and stop resources on page leave.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: T001 is required before backend transcription configuration is used.
- **Foundational**: T002, T003, and T006 can proceed in parallel after T001. T004 depends on T002 and T003; T005 depends on T004. T007 depends on T006. All foundation tasks must finish before either story's page wiring.
- **User stories**: US1 and US2 both depend on the foundational phase. T008 and T009 touch separate page files and may proceed in parallel.

### User Story Dependencies

- **US1 (P1)**: Begins after foundational work; does not depend on US2.
- **US2 (P1)**: Begins after foundational work; does not depend on US1.

### Parallel Opportunities

- After T001, T002, T003, and T006 touch separate files and can run concurrently.
- T007 can proceed after T006 while backend service and route work proceeds.
- After the foundation is complete, T008 and T009 touch separate page files and can be implemented concurrently.

## Implementation Strategy

### MVP First

1. Complete T001-T007 to provide shared auth, relay, capture, and voice control.
2. Complete T008 for the Quick Capture MVP.
3. Complete T009 for note dictation and phrase-safe autosave.

### Incremental Delivery

1. Validate Quick Capture independently after Phase 3.
2. Add note-page dictation after Phase 4 without changing the capture behavior.

## Notes

- Each task includes the exact affected file path(s); `[P]` marks work that can proceed concurrently in separate files.
- No tests, test files, database changes, styling changes, or additional documents are in scope.
