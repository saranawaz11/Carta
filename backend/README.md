# Voice transcription environment

## Local development

Start FastAPI from this `backend/` directory so Uvicorn can import `main:app`:

```powershell
uv run fastapi dev
```

From the repository root, use `npm run dev:backend`, which sets the backend
working directory automatically.

- `OPENAI_TRANSCRIBE_MODEL` defaults to `gpt-4o-transcribe`.
- `VOICE_VAD_THRESHOLD` defaults to `0.4`.
- `VOICE_SILENCE_MS` defaults to `1000`.

## Docker

Build the image from the `backend/` directory:

```bash
docker build -t carta-backend .
```

Run it on port 8000, passing configuration from a local env file:

```bash
docker run --rm -p 8000:8000 --env-file .env carta-backend
```

Or pass individual variables:

```bash
docker run --rm -p 8000:8000 -e DATABASE_URL=... -e CLERK_ISSUER=... carta-backend
```

The image contains no secrets. Every variable from `.env.example` is read at runtime. Variables with defaults are optional:

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | empty |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `CLERK_ISSUER` | empty |
| `CLERK_AUTHORIZED_PARTIES` | empty |
| `FRONTEND_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` |
| `OPENAI_API_KEY` | empty |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-transcribe` |
| `VOICE_VAD_THRESHOLD` | `0.4` |
| `VOICE_SILENCE_MS` | `1000` |

Inside the container, `localhost` refers to the container itself. Use a reachable host for `DATABASE_URL` and `REDIS_URL`, such as `host.docker.internal` for services on your machine.