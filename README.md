# Roadlyn - AI-Powered Roadmap Generation Platform

> An enterprise-grade SaaS platform for intelligent roadmap generation powered by AI

## 🎯 Project Overview

Roadlyn is a monorepo-based SaaS platform designed to help teams create intelligent, data-driven product roadmaps with the assistance of AI. This is the initial enterprise-grade boilerplate setup.

**Current Status**: Initial scaffolding and architecture setup. No business logic implemented yet.

## 🏗️ Architecture

### Monorepo Structure

```
roadlyn/
├── apps/
│   ├── web/           # Next.js 15 frontend
│   └── api/           # Fastify backend
├── packages/
│   ├── ui/            # Shared UI components (shadcn/ui)
│   ├── types/         # Shared TypeScript types
│   ├── eslint-config/ # Shared ESLint configuration
│   └── ts-config/     # Shared TypeScript configuration
├── docker/            # Docker configuration
├── scripts/           # Development scripts
├── docs/              # Project documentation
└── Makefile           # Development commands
```

### Tech Stack

#### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: React Query / TanStack Query
- **HTTP Client**: Axios
- **Validation**: Zod
- **Animations**: Framer Motion

#### Backend
- **Runtime**: Node.js
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Task Queue**: BullMQ
- **Logging**: Pino
- **Validation**: Zod
- **AI Integration**: Vercel AI SDK, LangChain
- **WebSocket**: Fastify WebSocket

#### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Monorepo**: Turborepo + pnpm workspaces
- **Code Quality**: ESLint, Prettier
- **Git Hooks**: Husky, lint-staged, commitlint

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.0+
- Docker & Docker Compose
- PostgreSQL 16 (or via Docker)
- Redis (or via Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/roadlyn.git
   cd roadlyn
   ```

2. **Run setup script**
   ```bash
   bash scripts/setup.sh
   ```
   Or use Make:
   ```bash
   make install
   make dev-setup
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` and update values

4. **Start development environment**
   ```bash
   make dev
   ```

## 📖 Development

### Available Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start all dev servers
pnpm dev:web          # Frontend only
pnpm dev:api          # Backend only

# Build
pnpm build            # Build all
pnpm build:web        # Frontend only
pnpm build:api        # Backend only

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues
pnpm format           # Format with Prettier
pnpm type-check       # TypeScript type checking

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma client

# Docker
pnpm docker:up        # Start services
pnpm docker:down      # Stop services
pnpm docker:logs      # View logs
```

### Using Makefile

```bash
make help             # Show all available commands
make dev              # Start development environment
make docker-up        # Start Docker services
make db-migrate       # Run database migrations
make lint             # Run linter
make format           # Format code
```

## 🏗️ Project Structure

### Frontend (`apps/web`)

```
src/
├── app/               # Next.js App Router
├── components/        # Reusable components
├── features/          # Feature modules
├── hooks/             # Custom React hooks
├── providers/         # Context/Provider setup
├── services/          # API client and services
├── stores/            # Zustand state stores
├── lib/               # Utility functions
├── types/             # Type definitions
└── styles/            # Global styles
```

### Backend (`apps/api`)

```
src/
├── modules/           # Feature modules (auth, roadmap, ai)
├── routes/            # Route definitions
├── middleware/        # Express middleware
├── plugins/           # Fastify plugins
├── services/          # Business logic
├── repositories/      # Data access layer
├── providers/         # External service integration
├── ai/                # AI provider implementations
├── websocket/         # WebSocket handlers
├── queues/            # BullMQ queue definitions
├── workers/           # Queue workers
├── config/            # Configuration files
├── db/                # Database utilities
├── utils/             # Utility functions
└── types/             # Type definitions
```

## 🗄️ Database

### Schema Overview

The Prisma schema includes base models for:

- **User**: User accounts and profiles
- **Session**: Authentication sessions
- **AIProvider**: AI service configurations
- **AIModel**: Specific AI models available
- **Roadmap**: Roadmap entities (placeholder)

### Running Migrations

```bash
# Create and run migrations
pnpm db:migrate

# Seed database with initial data
pnpm db:seed

# Reset database (development only)
cd apps/api
pnpm prisma db push --force-reset
```

## 🐳 Docker

### Development Setup

For local development with Docker:

```bash
make docker-dev       # Start PostgreSQL and Redis only
```

Frontend and backend can be run locally with `pnpm dev`.

### Production Setup

For full containerized setup:

```bash
make docker-up        # Start all services
```

Access the application at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

## 🔒 Code Quality

### Pre-commit Hooks

The project uses Husky to enforce code quality:

- **ESLint**: Runs on staged files
- **Prettier**: Formats code
- **commitlint**: Validates commit messages

Hooks are automatically installed during setup.

### Commit Message Format

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(auth): add JWT token refresh`
- `fix(api): handle connection timeout`
- `docs(readme): update setup instructions`

### Running Quality Checks

```bash
make lint             # Run ESLint
make lint-fix         # Fix issues
make format           # Format code
make format-check     # Check formatting
make type-check       # Type checking
```

## 📦 Shared Packages

### @roadlyn/types
Shared TypeScript type definitions used across frontend and backend.

### @roadlyn/ui
Shared UI components library using shadcn/ui and Tailwind CSS.

### @roadlyn/eslint-config
Shared ESLint configuration with specific presets for React, Next.js, and Node.js.

### @roadlyn/ts-config
Shared TypeScript configurations for different environments.

## 🧪 Testing

Testing infrastructure is scaffolded and ready for implementation:

```bash
pnpm test             # Run all tests
```

## 🔄 CI/CD

GitHub Actions workflows should be configured in `.github/workflows/` for:
- Linting and type checking
- Testing
- Building
- Deployment

## 📚 Further Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Detailed architecture decisions
- [CONTRIBUTING.md](./docs/CONTRIBUTING.md) - Contribution guidelines
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Development workflow

## 🎓 Next Steps

1. **Install dependencies**: `make install`
2. **Set up environment**: `make dev-setup`
3. **Configure the root `.env` file** with your settings
4. **Start development**: `make dev`
5. **Read DEVELOPMENT.md** for workflow details

## 📝 Environment Variables

### Frontend (root `.env`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Roadlyn
```

### Backend (root `.env`)

```
API_PORT=3001
API_NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roadlyn
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

See the root `.env.example` for the complete list.

## 🤝 Contributing

This is the initial scaffolding commit. For contribution guidelines, see [CONTRIBUTING.md](./docs/CONTRIBUTING.md).

## 📄 License

MIT

## 👥 Team

Roadlyn Development Team

---

**Last Updated**: May 2026  
**Status**: Initial Scaffolding ✨

