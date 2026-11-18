# syntax=docker/dockerfile:1

FROM node:24-slim AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:24-slim AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/app/.next/cache npm run build \
    && if [ -n "$NEXT_PUBLIC_API_URL" ]; then printf configured > /app/.api-url-configured; else : > /app/.api-url-configured; fi

FROM node:24-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.api-url-configured ./.api-url-configured

RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs nextjs \
    && mkdir -p /app/.next/cache \
    && chown nextjs:nextjs /app/.next/cache

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "if [ -z \"$CLERK_SECRET_KEY\" ]; then echo 'Error: CLERK_SECRET_KEY is required.' >&2; exit 1; fi; if [ ! -s /app/.api-url-configured ]; then echo 'Warning: NEXT_PUBLIC_API_URL was not set at build time; browser API requests will fail.' >&2; fi; exec node server.js"]
