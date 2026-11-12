# Implementation Plan: Streaming Voice Input

**Branch**: `008-streaming-voice-input` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

## Summary

Relay authenticated browser audio through FastAPI to an OpenAI Realtime transcription
session. Reuse one frontend hook and voice control for Quick Capture and note content;
keep phrase ordering, saves, and teardown explicit. Do not add storage, migrations,
styling, or documents beyond this plan.

## Technical Context

- **Backend**: Python 3.11+, FastAPI, existing Clerk JWT verifier, OpenAI SDK used only
  from `backend/llm.py`.
- **Frontend**: Next.js/React, TypeScript, Clerk `getToken`, AudioWorklet, WebSocket.
- **Storage**: None; transcript remains in existing editor state. Audio and transcript
  are never logged or persisted by the transcription path.
- **Platform**: Signed-in users in browsers with `getUserMedia` and AudioWorklet.
- **Performance**: Send approximately 100 ms audio frames; show transcript deltas live.
- **Limits**: One active dictation per user, 5 minutes per session, 64 KiB max inbound
  binary frame, Quick Capture transcript capped at 500 characters. Enforce per-user
  exclusivity with an in-process registry; run one API worker unless shared session
  coordination is introduced.
- **Environment**: `OPENAI_TRANSCRIBE_MODEL` defaults to `gpt-4o-transcribe`;
  `VOICE_VAD_THRESHOLD` defaults to `0.4`; `VOICE_SILENCE_MS` defaults to `1000`.
  Document these in `backend/README.md`. Reuse `NEXT_PUBLIC_API_URL` in the frontend.
- **Scope**: No database/Alembic changes, HTTP transcription endpoint, Ask AI voice,
  playback, language picker, new styling, or extra documents.

## Constitution Check

- **Backend-only OpenAI and API boundary**: Pass. Frontend connects only to FastAPI;
  `/ws/transcribe` verifies the Clerk token before opening an upstream session.
- **Thin routes and one LLM module**: Pass. Route handles auth, lifecycle, and relay;
  `backend/llm.py` alone opens/configures the OpenAI Realtime session.
- **Privacy and ownership**: Pass. No audio/text logging or storage; enforce one
  session per authenticated Clerk user.
- **Small, spec-driven change**: Pass. Reuse existing controls and editors; no DB,
  migration, styling, or unrelated artifacts.

## Design Decisions

| Decision | Reason | Rejected alternative |
|---|---|---|
| Relay Realtime transcription through FastAPI | Keeps OpenAI credentials and calls server-side while streaming | Browser-to-OpenAI breaks the backend-only rule; per-pause HTTP uploads are not live |
| Default model `gpt-4o-transcribe` | Provides live transcription deltas and supports configured VAD | `whisper-1` does not stream and is less accurate |
| Authenticate in first WebSocket message | Reuses Clerk token verification before any transcription work | Token in URL can be logged |
| Server VAD, threshold `0.4`, 300 ms prefix, 1000 ms silence | Picks up soft speech and tolerates slow speakers' pauses | Client-side VAD |
| AudioWorklet to 24 kHz mono PCM16 | Produces the required streaming audio format at low latency | MediaRecorder containers are not accepted as PCM input |
| Read-only editor while dictating | Keeps interim-text replacement offsets stable | Merge typing with live replacement, causing offset conflicts |
| Hold note autosave until phrase completion | Prevents interim partial words from being saved or embedded | Saving partial text |
| Five-minute cap and one active session per user | Bounds resource use and matches product limits | Unlimited sessions |
| Never store audio | Transcription is the sole audio use and avoids retained recordings | Saving recordings |

## Backend Contract

- Add `GET /ws/transcribe` in `backend/routes/transcription.py` and register it from
  `backend/main.py`. First text frame is `{"type":"auth","token":"<Clerk session token>"}`.
  Missing or invalid auth, including no auth within five seconds, closes with code 4401.
- Refactor `backend/core/auth.py` so both the REST dependency and WebSocket call the
  same token-verification function. The route verifies auth before delegating the
  accepted socket to `backend/services/transcription.py`; that service handles the
  five-minute deadline, per-user registry, frame validation, and relay. Do not begin
  upstream work or accept audio before authentication.
- After auth, accept binary-only mono PCM16 24 kHz frames up to 64 KiB. Send each
  frame as base64 `input_audio_buffer.append` to OpenAI. Relay upstream transcription
  delta/completed events and `{type:"error",message}`; never persist or log audio or
  transcript text.
- Add an async Realtime transcription session helper in `backend/llm.py`; connect
  server-to-server with the OpenAI SDK and `OPENAI_API_KEY` using transcription
  intent. Send `transcription_session.update` with PCM16, near-field noise
  reduction, the configured model and the instruction “Transcribe faithfully; do
  not invent words,” plus server VAD with `prefix_padding_ms: 300` and configured
  threshold/silence.
- Relay client events as
  `{"type":"delta"|"completed","item_id":"...","text":"...","order":N}`. Map
  `input_audio_buffer.committed` item IDs and `previous_item_id` to the committed
  sequence; use that ordering for deltas and completions because completion arrival
  order is not guaranteed. Convert upstream errors to sanitized client messages.
- On explicit stop, character cap, or five-minute limit, stop microphone input, commit
  buffered audio, wait for the final transcript, then notify and close as applicable.
  Session/duplicate limits send `{type:"error",message:"..."}` before closing.
  On abrupt disconnect, preserve completed phrases and discard only the unfinished
  interim phrase. Always close both sockets and release the active-user slot.

## Frontend Contract

- Add `frontend/lib/voice.ts` with `useVoiceInput` and a shared voice button. Connect
  to `NEXT_PUBLIC_API_URL` using `ws`/`wss`, obtain the Clerk token via `getToken`,
  send the auth frame, then stream ~100 ms binary PCM16 mono 24 kHz frames.
- Request microphone audio with echo cancellation, noise suppression, and automatic
  gain control. AudioWorklet captures at the device rate and downsamples to 24 kHz.
  Expose `state` (`idle`, `connecting`, `listening`, `error`), `error`, `start`, and
  `stop`; report unsupported browser, permission denial, connection loss, and limits.
  Stop and release all resources on stop, unmount, dialog close, page leave, or limit.
- Store completed phrases by `item_id` and server-provided `order`; render the active
  phrase from deltas as a replaceable preview and replace it with final text on
  completion. Preserve committed text after connection loss.
- Replace the simulated sample/player behavior in the existing Quick Capture and note
  voice surfaces with live dictation, preserving their control design and styling and
  adding no playback. In Quick Capture, append committed text and preview to the
  existing text state, cap at 500 characters, stop with a limit message, make the
  textarea read-only while listening, and keep Capture disabled until stop and final
  completion. Stop voice when the dialog closes.
- On the note page, capture `contentRef.current.selectionStart` at dictation start;
  splice committed and preview text there through `setContent`, preserving the
  surrounding content and title. Keep content read-only while listening. Gate the
  existing 800 ms autosave on no active phrase and no dictation, then resume save
  after completion/stop so interim text is never saved or embedded. Stop on page leave.
- Hide or disable the existing control and show a hint when microphone or
  AudioWorklet support is unavailable; show a clear permission-denied message.
- Add the three backend variables and defaults to `backend/README.md` environment
  documentation. Do not add secrets or modify `.env` values.

## Structure

```text
backend/
├── core/auth.py                 # shared token verification
├── llm.py                       # OpenAI Realtime session helper
├── main.py                      # register WebSocket endpoint
├── routes/transcription.py      # authenticated, thin relay
├── services/transcription.py   # session ownership and relay lifecycle
└── README.md                    # environment variable documentation
frontend/
├── lib/voice.ts                    # shared hook and voice control
├── public/pcm-capture-worklet.js   # PCM capture and downsampling
├── components/voice-note.tsx       # replace simulated voice preview
├── components/quick-capture.tsx    # Quick Capture wiring
└── app/(app)/notes/[id]/page.tsx   # cursor insertion and autosave gating
```

## OpenAI Reference

- [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription):
  transcription session setup, PCM appends, deltas/completions, and item correlation.
- [Realtime VAD](https://developers.openai.com/api/docs/guides/realtime-vad):
  transcription-model VAD support and `threshold`, `prefix_padding_ms`, and
  `silence_duration_ms`. `gpt-live-transcribe` and `gpt-realtime-whisper` require VAD
  disabled; the requested `gpt-4o-transcribe` supports server VAD.
