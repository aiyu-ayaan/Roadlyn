# Roadlyn Web

Production-grade Next.js frontend for the Roadlyn AI learning roadmap platform.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS with shadcn-style primitives
- TanStack Query for server state
- Zustand for client state
- Axios API client with bearer-token interceptor
- React Hook Form and Zod
- Framer Motion-ready structure
- next-themes
- Native WebSocket event service
- Lucide icons

## Architecture

```txt
src/
  app/                 Route groups, auth pages, dashboard pages
  components/          Reusable UI, layout, auth, and form components
  config/              App/runtime configuration
  features/            Product feature modules
  hooks/               Query and realtime hooks
  lib/                 Shared utilities
  providers/           React Query, theme, toast providers
  services/            API, auth, AI gateway, roadmap, realtime services
  stores/              Zustand stores
  types/               Backend-aligned DTOs
```

## Backend Integration

The AI provider UI is fully dynamic and reads provider/model/key metadata from:

- `GET /api/ai/providers`
- `GET /api/ai/models`
- `GET /api/ai/keys`
- `POST /api/ai/providers`
- `POST /api/ai/models`
- `POST /api/ai/keys`
- `POST /api/ai/default-provider`
- `POST /api/ai/default-model`
- `POST /api/ai/test-provider`

Roadmap generation uses:

- `POST /api/roadmaps/generate`

Auth uses the backend OAuth2-style client credentials flow:

- `POST /api/auth/oauth-clients`
- `POST /api/auth/token`

No AI provider names, model IDs, API keys, or provider configs are hardcoded into the generation flow.

## Development

```bash
pnpm dev:web
```

Set `NEXT_PUBLIC_API_URL` and optionally `NEXT_PUBLIC_WS_URL` in the root `.env`.

## Verification

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm --filter web build
```

