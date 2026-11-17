# Implementation Plan: Frontend Containerization

**Branch**: `main` (setup feature identifier: `014-frontend-containerization`) | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

## Summary

Harden the existing frontend image and ignore file, preserve Next.js server rendering and Clerk middleware, and document production configuration and browser/backend connectivity. Evaluate the standalone image against the existing Dockerfile; adopt it only after the required functionality and image-size checks pass.

## Technical Context

- **Language/runtime**: TypeScript 5; Node.js 24 (existing Dockerfile and inspected local runtime; no project-pinned Node version).
- **Dependencies**: Next.js 16.3.8, React 19.2.8, Clerk; npm with `frontend/package-lock.json`. Scripts: `dev`, `build`, `start`, `lint`.
- **Rendering**: App Router, server-side Clerk authentication and middleware; no standalone setting currently. Not a static export.
- **Storage**: No data-model changes. Next.js runtime cache needs a writable location.
- **Validation**: Docker build and manual HTTP, authentication, browser/API, WebSocket, cache, image and security checks; `npm run lint` if applicable.
- **Target**: Linux container, port 3000; backend runs separately on port 8000.
- **Constraints**: No app logic, backend, Compose, UI, or secret-value changes; public configuration is frozen at build time.
- **Goals**: Preserve behavior, reuse the dependency layer on source-only rebuilds, respond within 30 seconds, and compare image size and rebuild time with the original Dockerfile as specified.

## Constitution Check

**Before research / after design: PASS with documented workflow exception.**

- Preserve Clerk ownership and existing REST/WebSocket boundaries; no database, LLM, route, or UI changes.
- Keep implementation minimal, introduce no dependencies, document configuration variable names and no secrets.
- No test files or testing tasks; use the required quickstart for manual validation.
- The constitution asks for no extra documents and no testing section; this planning command explicitly requires separate research, model, contract and quickstart artifacts. Keep them concise and do not add a testing section to this plan.

## Decisions

- **Output**: Prefer Next standalone with `public` and `.next/static` copied explicitly; reject static export because middleware and server rendering are required. Retain `next start` if the standalone checks or size comparison fail.
- **Base**: Use consistent official Node 24 slim variants in all stages to avoid glibc/musl incompatibility; reject the existing Debian-builder/Alpine-runtime mix.
- **Dependencies**: Run `npm ci` including development dependencies in a manifest-only dependency stage; reject `NODE_ENV=production` before installation because the build needs development tools.
- **Runtime**: Run the standalone server as a non-root user on `0.0.0.0:3000`, with only runtime cache writable; reject copying the full build tree and dependency directory.
- **Configuration**: Supply public values as build arguments and the Clerk secret at runtime; reject runtime-only public variables because their browser values are inlined.
- **Networking**: Browser uses a browser-reachable backend URL; container probes use the backend network name. Reject `http://backend:8000` as a browser URL and do not add a new server-side backend flow.
- **Missing settings**: Allow a build without the API URL but emit an explicit startup warning; fail startup clearly if the required Clerk secret is absent. Reject silent production defaults.

## Project Structure

```text
frontend/
  Dockerfile          # existing, untracked; revise without discarding its contents blindly
  .dockerignore       # existing, untracked; preserve useful exclusions
  next.config.ts      # output setting only if standalone is validated
  README.md           # build, runtime, network and validation instructions
  .env.example        # variable names and placeholders, if needed; never real credentials
specs/014-frontend-containerization/
  spec.md, plan.md, research.md, data-model.md, quickstart.md
  contracts/container.md
```

## Execution Sequence

1. Establish an image-size and build-time baseline using the existing Dockerfile, recording failures rather than masking them. Its current production-only dependency install and cross-libc copy may make it unusable; if so, record that limitation instead of claiming a size improvement against an unbuilt image.
2. Prototype standalone output with matching Node slim stages; use `npm ci` from the lockfile with manifest-first caching, then build with explicit public arguments. Confirm the build completes without `CLERK_SECRET_KEY`; if it does not, stop and resolve the conflict with the runtime-only secret requirement rather than putting the secret in a build argument or layer.
3. Package only traced output plus static/public assets, add a writable cache owned by the runtime user, and enforce the startup configuration behavior described in the contract. Preserve existing ignore rules while excluding secrets, local dependencies and generated artifacts.
4. Run the [quickstart](./quickstart.md) checks with a real separately configured Clerk instance and backend. Compare baseline and optimized images and source-only rebuild timings; report any unmet thresholds rather than assuming success. Verify SSR, protected routes, static assets, API and voice behavior.
5. Document exact commands, public versus secret configuration, CORS and browser versus container networking in the frontend README. Add a names-only `.env.example` if useful and force-add only that safe file if required by the existing ignore rule.

## Complexity Tracking

The required planning artifacts and manual validation guide are a command-level exception to the constitution's request for no extra documents or testing sections; no test files or test tasks are planned.
