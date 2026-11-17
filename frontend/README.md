This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production container

The image uses Node 24 and npm with `package-lock.json`. The `dependencies` stage runs `npm ci` before copying application files so source-only changes reuse the dependency layer. The `builder` stage builds Next.js with development dependencies available. The `runtime` stage copies the standalone server, static assets and public files, runs as a non-root user, and listens on port 3000.

The following PowerShell commands start in the repository root. Docker, registry access, Google Fonts access during the build, and a configured Clerk application are required.

```powershell
Set-Location .\frontend
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

`NEXT_PUBLIC_*` values are public, embedded in the browser bundle at **build time**, and cannot be changed by passing different runtime variables. Rebuild the image when they change. Do not pass secrets as build arguments. If the API URL is omitted, the build succeeds but the container warns at startup and browser API calls will not work.

Put `CLERK_SECRET_KEY=<your-secret>` in a private file outside the build context, such as `%USERPROFILE%\carta-frontend-runtime.env`. It is a **runtime** server secret: do not commit it or put it in the image. Docker administrators can inspect container environment variables. The container exits with an error if it is missing. See `.env.example` for variable names.

Start the backend separately on a user-defined Docker network; this example assumes it is already running under the name `carta-backend` on `carta-network` and publishes port 8000:

```powershell
docker run -d --name carta-frontend --network carta-network -p 3000:3000 `
  --env-file "$env:USERPROFILE\carta-frontend-runtime.env" carta-frontend:production
```

For a new network, use `docker network create carta-network`, then start or connect the backend to it before the frontend. From inside the frontend container, `carta-backend:8000` resolves to the backend; `localhost` would refer to the frontend container. The application's REST, streaming and voice WebSocket calls originate in the **browser**, however, so `NEXT_PUBLIC_API_URL` must be reachable by the browser. The example `http://localhost:8000` works only when the browser runs on the machine publishing the backend port; use an externally reachable HTTPS URL for remote browsers. Configure backend `FRONTEND_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` for the frontend origin, and allow WebSocket traffic. Do not use the Docker-only hostname as the browser URL unless browsers can also resolve it.

Check the running container and its backend connection:

```powershell
docker logs carta-frontend
curl.exe -i http://localhost:3000/
curl.exe -i http://localhost:3000/pcm-capture-worklet.js
curl.exe -i http://localhost:3000/notes
docker exec carta-frontend node -e "fetch('http://carta-backend:8000/test').then(async r => { console.log(r.status, await r.text()); if (!r.ok) process.exitCode = 1 }).catch(e => { console.error(e); process.exitCode = 1 })"
```

The home page and worklet should return successfully; an unauthenticated protected route should redirect. Sign in, load notes, send a chat request and try voice input to verify the real backend and authentication. Voice needs browser microphone permission and a secure context. If requests fail, check the browser-reachable URL, backend availability, CORS, Clerk configuration and container logs. To stop the container, run `docker stop carta-frontend`; remove it with `docker rm carta-frontend`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
