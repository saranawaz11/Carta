# Container Validation Quickstart

These commands are for PowerShell after implementation. Docker Desktop, registry and Google Fonts access, a configured Clerk instance, and a separately running backend are prerequisites. Do not paste credentials into source or command history. Backend CORS `FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` must allow the actual frontend origin.

1. Set non-secret build values in your shell. `http://localhost:8000` is an example **only when the browser and published backend run on the same host**; remote browsers require a reachable HTTPS address.

   ```powershell
   Set-Location D:\Projects\carta\frontend
   $env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'
   $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = '<your-publishable-key>'
   $env:NEXT_PUBLIC_CLERK_SIGN_IN_URL = '/sign-in'
   $env:NEXT_PUBLIC_CLERK_SIGN_UP_URL = '/sign-up'
   docker build -t carta-frontend:production `
     --build-arg NEXT_PUBLIC_API_URL="$env:NEXT_PUBLIC_API_URL" `
     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" `
     --build-arg NEXT_PUBLIC_CLERK_SIGN_IN_URL="$env:NEXT_PUBLIC_CLERK_SIGN_IN_URL" `
     --build-arg NEXT_PUBLIC_CLERK_SIGN_UP_URL="$env:NEXT_PUBLIC_CLERK_SIGN_UP_URL" .
   ```

2. Prepare a private env file outside the build context containing `CLERK_SECRET_KEY=<your-secret>`. If the separately started backend is not already on a user-defined network, create one and connect its container (replace `carta-backend` with its real container name or network alias):

   ```powershell
   docker network create carta-validation
   docker network connect carta-validation carta-backend
   docker run -d --name carta-frontend --network carta-validation -p 3000:3000 `
     --env-file "$env:USERPROFILE\carta-frontend-runtime.env" carta-frontend:production
   docker logs carta-frontend
   docker exec carta-frontend id
   docker exec carta-frontend node -e "fetch('http://carta-backend:8000/test').then(async r => { console.log(r.status, await r.text()); if (!r.ok) process.exitCode = 1 }).catch(e => { console.error(e); process.exitCode = 1 })"
   ```

   Expect a nonzero UID and a successful backend response. The backend may instead be started directly on this network with a matching name. Do not use its Docker name as the public browser URL.

3. Within 30 seconds open `http://localhost:3000`; verify the page and `/pcm-capture-worklet.js` load, and an unauthenticated `/notes` request preserves the existing Clerk protection. Sign in with a real test account, load notes, send a chat request, and exercise voice transcription with microphone permission and a working configured backend. Verify REST, streaming and WebSocket requests reach the public backend address, including successful CORS and authentication.
4. Verify startup without the Clerk secret fails clearly; a build without the public API URL succeeds but warns at startup. Confirm runtime environment changes do not replace baked public values. Check that the non-root process can write its Next cache but not application files and that stopping and restarting works.
5. Inspect image history and exported filesystem with a **synthetic sentinel**, never a real credential, to verify no secrets or excluded host files were baked in. Check source-only rebuild logs for a cached dependency step; time a clean and source-only rebuild using the same machine and compare with the spec's 50% target. Compare final image sizes in bytes with an image built from the original Dockerfile; record failures and environment-dependent timings explicitly.
6. Remove only the container and network created for this validation when finished:

   ```powershell
   docker rm -f carta-frontend
   docker network disconnect carta-validation carta-backend
   docker network rm carta-validation
   ```

See [container contract](./contracts/container.md) and [configuration model](./data-model.md).
