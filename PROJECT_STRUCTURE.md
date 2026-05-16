# Roadlyn Project Structure

Complete directory and file structure for the Roadlyn monorepo.

```
roadlyn/
│
├── 📂 apps/                              # Applications
│   │
│   ├── 📂 web/                           # Frontend (Next.js)
│   │   ├── 📂 src/
│   │   │   ├── 📂 app/                   # Next.js App Router
│   │   │   │   ├── page.tsx              # Home page
│   │   │   │   ├── layout.tsx            # Root layout
│   │   │   │   ├── globals.css           # Global styles
│   │   │   │   ├── 📂 dashboard/         # Feature pages
│   │   │   │   ├── 📂 roadmaps/
│   │   │   │   └── 📂 settings/
│   │   │   │
│   │   │   ├── 📂 components/            # Reusable components
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── 📂 features/              # Feature modules
│   │   │   │
│   │   │   ├── 📂 hooks/                 # Custom React hooks
│   │   │   │   └── queries.ts            # React Query hooks
│   │   │   │
│   │   │   ├── 📂 providers/             # Context providers
│   │   │   │   └── index.tsx
│   │   │   │
│   │   │   ├── 📂 services/              # API client & services
│   │   │   │   └── api.ts
│   │   │   │
│   │   │   ├── 📂 stores/                # Zustand stores
│   │   │   │   └── auth.ts
│   │   │   │
│   │   │   ├── 📂 lib/                   # Utility functions
│   │   │   │
│   │   │   ├── 📂 types/                 # TypeScript types
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── 📂 styles/                # Style files
│   │   │
│   │   ├── 📂 public/                    # Static assets
│   │   │
│   │   ├── next.config.js                # Next.js configuration
│   │   ├── tailwind.config.ts            # Tailwind CSS config
│   │   ├── tsconfig.json                 # TypeScript config
│   │   ├── package.json                  # Dependencies
│   │   ├── .eslintrc.js                  # ESLint config
│   │   ├── .prettierrc                   # Prettier config
│   │   ├── .env.example                  # Environment template
│   │   └── .gitignore
│   │
│   └── 📂 api/                           # Backend (Fastify)
│       ├── 📂 src/
│       │   ├── 📂 modules/               # Feature modules
│       │   │   ├── 📂 auth/
│       │   │   ├── 📂 roadmap/
│       │   │   └── 📂 ai/
│       │   │
│       │   ├── 📂 routes/                # API routes
│       │   │   ├── health.ts
│       │   │   ├── auth.ts
│       │   │   ├── roadmap.ts
│       │   │   └── ai.ts
│       │   │
│       │   ├── 📂 middleware/            # Fastify middleware
│       │   │
│       │   ├── 📂 plugins/               # Fastify plugins
│       │   │
│       │   ├── 📂 services/              # Business logic
│       │   │
│       │   ├── 📂 repositories/          # Data access layer
│       │   │
│       │   ├── 📂 providers/             # External service integration
│       │   │   └── ai-provider.ts
│       │   │
│       │   ├── 📂 ai/                    # AI implementations
│       │   │
│       │   ├── 📂 websocket/             # WebSocket handlers
│       │   │
│       │   ├── 📂 queues/                # BullMQ queues
│       │   │
│       │   ├── 📂 workers/               # Queue workers
│       │   │
│       │   ├── 📂 config/                # Configuration
│       │   │   ├── env.ts                # Environment validation
│       │   │   ├── logger.ts             # Pino logger
│       │   │   ├── db.ts                 # Database connection
│       │   │   └── redis.ts              # Redis connection
│       │   │
│       │   ├── 📂 db/                    # Database utilities
│       │   │
│       │   ├── 📂 utils/                 # Utilities
│       │   │   ├── errors.ts
│       │   │   └── response.ts
│       │   │
│       │   ├── 📂 types/                 # Type definitions
│       │   │
│       │   └── server.ts                 # Main server file
│       │
│       ├── 📂 prisma/                    # Prisma ORM
│       │   ├── schema.prisma             # Database schema
│       │   ├── seed.ts                   # Database seeding
│       │   └── 📂 migrations/            # Database migrations
│       │
│       ├── tsconfig.json                 # TypeScript config
│       ├── package.json                  # Dependencies
│       ├── .eslintrc.js                  # ESLint config
│       ├── .prettierrc                   # Prettier config
│       ├── .env.example                  # Environment template
│       └── .gitignore
│
├── 📂 packages/                          # Shared packages
│   │
│   ├── 📂 types/                         # Shared types
│   │   ├── 📂 src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── 📂 ui/                            # Shared UI components
│   │   ├── 📂 src/
│   │   │   ├── index.ts                  # Exports
│   │   │   └── styles.css                # Tailwind setup
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── 📂 eslint-config/                 # ESLint configuration
│   │   ├── index.js                      # Base config
│   │   ├── react.js                      # React config
│   │   ├── next.js                       # Next.js config
│   │   ├── node.js                       # Node.js config
│   │   └── package.json
│   │
│   └── 📂 ts-config/                     # TypeScript configuration
│       ├── package.json
│       ├── base.json                     # Base config
│       ├── nextjs.json                   # Next.js config
│       └── node.json                     # Node.js config
│
├── 📂 docker/                            # Docker configuration
│   ├── Dockerfile.web                    # Frontend Docker image
│   └── Dockerfile.api                    # Backend Docker image
│
├── 📂 scripts/                           # Development scripts
│   ├── setup.sh                          # Initial setup
│   ├── dev-start.sh                      # Start development
│   └── db-setup.sh                       # Database setup
│
├── 📂 docs/                              # Documentation
│   ├── ARCHITECTURE.md                   # Architecture guide
│   ├── DEVELOPMENT.md                    # Development guide
│   └── CONTRIBUTING.md                   # Contribution guidelines
│
├── 📂 .github/                           # GitHub configuration
│   └── 📂 workflows/                     # CI/CD pipelines (future)
│
├── 📂 .husky/                            # Git hooks
│   ├── pre-commit                        # Pre-commit hook
│   └── commit-msg                        # Commit message validation
│
├── 📂 .vscode/                           # VS Code configuration
│   └── settings.md                       # Recommended settings
│
├── 📄 package.json                       # Root dependencies
├── 📄 pnpm-workspace.yaml                # pnpm workspace config
├── 📄 turbo.json                         # Turborepo config
├── 📄 tsconfig.json                      # Root TypeScript config
├── 📄 .prettierrc                        # Prettier config
├── 📄 .eslintrc.json                     # ESLint config
├── 📄 .eslintignore                      # ESLint ignore rules
├── 📄 .commitlintrc.json                 # Commitlint config
├── 📄 .lintstagedrc.json                 # Lint-staged config
├── 📄 .gitignore                         # Git ignore rules
├── 📄 .gitattributes                     # Git attributes
├── 📄 docker-compose.yml                 # Production services
├── 📄 docker-compose.dev.yml             # Development services
├── 📄 Makefile                           # Development commands
├── 📄 README.md                          # Project overview
├── 📄 CHANGELOG.md                       # Change history
├── 📄 TODO.md                            # Project tasks
└── 📄 .env.example                       # Environment template
```

## Key Files Summary

| File | Purpose |
|------|---------|
| `package.json` | Root workspace dependencies and scripts |
| `pnpm-workspace.yaml` | pnpm workspace configuration |
| `turbo.json` | Turborepo build orchestration |
| `tsconfig.json` | Root TypeScript configuration |
| `.prettierrc` | Code formatting rules |
| `.eslintrc.json` | Linting rules |
| `docker-compose.yml` | Production services definition |
| `Makefile` | Development command shortcuts |
| `README.md` | Project documentation |

## Configuration Files by App

### Frontend (apps/web)
- `next.config.js` - Next.js specific settings
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - Frontend TypeScript config
- `.env.example` - Environment variables template

### Backend (apps/api)
- `prisma/schema.prisma` - Database schema
- `src/config/env.ts` - Environment validation
- `src/server.ts` - Entry point
- `.env.example` - Environment variables template

## Dependency Organization

```
Root (package.json)
├── prettier
├── typescript
└── turbo

Frontend (apps/web/package.json)
├── next
├── react
├── typescript
├── tailwindcss
└── ...shared packages

Backend (apps/api/package.json)
├── fastify
├── prisma
├── typescript
├── pino
└── ...shared packages

Shared
├── @roadlyn/types
├── @roadlyn/ui
├── @roadlyn/eslint-config
└── @roadlyn/ts-config
```

## Build Outputs

- **Frontend**: `.next/` directory (Next.js production build)
- **Backend**: `dist/` directory (TypeScript transpiled to JavaScript)

## Source vs Compiled

- **Source**: `src/` directories with TypeScript
- **Compiled**: 
  - Frontend: `.next/`
  - Backend: `dist/`

---

**Status**: Initial scaffolding setup complete ✨

For detailed development instructions, see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).
