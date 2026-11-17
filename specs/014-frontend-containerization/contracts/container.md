# Container Contract

- **Build context**: `frontend`; npm lockfile is authoritative. Build arguments: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`. Never pass secrets as build arguments.
- **Runtime**: Node production server binds `0.0.0.0:3000` by default, listens on the exposed port, runs non-root, and receives `CLERK_SECRET_KEY` from the environment. Missing secret fails with a clear error; missing build-time API URL emits a startup warning without silently defaulting to localhost.
- **Public traffic**: HTTP(S) assets and pages preserve existing behavior. Clerk protection is unchanged. Browser requests use the embedded API URL; voice derives `ws:` or `wss:` from it. Backend must allow the frontend origin and authorized Clerk parties.
- **Network**: A shared user-defined Docker network can resolve a running backend's network name from the frontend container; browser clients require their own reachable backend address. No new server-side API call is introduced.
- **Security and assets**: Exclude local env files and host dependencies from build context; never bake secrets into image layers. Include standalone traced files, static assets, and `public` files; permit writes only to required runtime cache locations.
