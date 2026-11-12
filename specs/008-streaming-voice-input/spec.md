# Feature Specification: Streaming Voice Input

**Created**: 2026-10-14
**Status**: Draft
**Input**: Add streaming dictation to Quick Capture and note content, using the existing voice controls without changing their design.

## User Scenarios

### User Story 1 - Dictate Quick Capture (Priority: P1)

A signed-in user dictates a capture in the existing dialog, reviews the transcript, and presses Capture. The agent continues to decide whether it is a task or note.

**Acceptance Scenarios**:

1. **Given** the dialog is idle, **When** the user starts dictation, **Then** it shows connecting and listening states and displays the evolving transcript in the text box.
2. **Given** a phrase is in progress, **When** the user pauses for about one second, **Then** dictation does not cut off the sentence; after the phrase finishes, the transcript is refined and Capture becomes available.
3. **Given** dictation is active, **When** the user stops it or reaches 500 characters, **Then** any in-progress phrase is completed before submission is allowed; at the limit dictation stops and a message explains why.
4. **Given** the finalized transcript, **When** the user presses Capture, **Then** the existing agent handles it as usual; the text box cannot be edited while dictating.

### User Story 2 - Dictate note content (Priority: P1)

A signed-in user starts dictation from the existing note control. Finalized phrases are inserted into note content at the cursor position from when dictation started, and the cursor continues after the inserted text.

**Acceptance Scenarios**:

1. **Given** a note is open and the user starts dictation, **When** phrases finish, **Then** their text is inserted at the starting cursor position and the title remains unchanged.
2. **Given** dictation is active, **When** the user stops it, **Then** the final in-progress phrase completes before typing is enabled again.
3. **Given** a phrase is unfinished, **When** the note is saved, **Then** saving waits for that phrase to finish so partial words are never saved.

### Edge Cases

- Permission denied, unsupported browser, connection loss, and session-limit responses show an error or limit message without discarding finalized text.
- After connection loss, the user can start a new session; unfinished partial speech is not saved.
- Silence and background noise do not create transcript text; soft speech is picked up and slow speech is not cut off by a pause of about one second.
- A dictation session stops after five minutes and explains the limit.
- Only signed-in users can start or continue dictation.

## Requirements

### Functional Requirements

- **FR-001**: The existing Quick Capture microphone control MUST start and stop dictation without changing its design or styling.
- **FR-002**: The Quick Capture text box MUST show speech nearly immediately, refine the transcript when a phrase finishes, and be read-only during dictation.
- **FR-003**: Capture MUST remain disabled during dictation and until any in-progress phrase is finalized after stopping; submission MUST wait for speech in progress to finish.
- **FR-004**: Quick Capture dictation MUST stop at 500 characters and display a message when the limit is reached.
- **FR-005**: The existing note dictate control MUST start and stop dictation into note content at the cursor position where dictation began; the title MUST NOT be dictated.
- **FR-006**: Note content MUST be read-only during dictation. Saving and re-enabling typing MUST wait until any current phrase is finalized.
- **FR-007**: Dictation MUST clearly show idle, connecting, listening, and error states, including permission denied, unsupported browser, connection lost, and session limit reached.
- **FR-008**: On connection loss, finalized text MUST be preserved and the user MUST be able to start dictation again.
- **FR-009**: A dictation session MUST stop after five minutes and display a message.
- **FR-010**: Audio MUST be used only to transcribe speech and MUST never be stored or logged; silence or background noise MUST NOT produce text.
- **FR-011**: Dictation MUST be available only to signed-in users. The backend MUST verify the Clerk session token before processing live transcription, and OpenAI MUST be called only from the backend.
- **FR-012**: Voice commands, spoken replies, language selection, audio storage or playback, and voice input in Ask AI chat are out of scope.
- **FR-013**: Existing voice-control design and styling MUST remain unchanged.

## Success Criteria

- **SC-001**: In both locations, recognized words appear within one second of being spoken, and completed phrases are available without manual transcription.
- **SC-002**: A pause of about one second does not cut a slow speaker off mid-sentence; soft speech is picked up, while silence and background noise produce no text.
- **SC-003**: Quick Capture never submits more than 500 dictated characters and cannot submit until the final phrase is complete.
- **SC-004**: Note saves never include partial words, and each finalized phrase is inserted at the original cursor location without changing the title.
- **SC-005**: Permission, support, connection, and session-limit failures are visibly communicated; connection loss preserves finalized text.
- **SC-006**: No audio is stored or logged, and unauthenticated users cannot use live dictation.

## Assumptions

- Existing signed-in session and voice controls are reused; no new visual design is required.
- A phrase is committed only when transcription marks it complete; unfinished interim text is not saved.
- The 500-character limit applies to dictated Quick Capture text, and the five-minute limit applies to each dictation session in either location.
