# Development Guide

## Getting Started

This guide covers the development workflow for Roadlyn.

## Prerequisites

- Node.js 20.11+ ([Download](https://nodejs.org/))
- pnpm 9.0+ (`npm install -g pnpm`)
- Docker & Docker Compose ([Download](https://www.docker.com/products/docker-desktop))
- PostgreSQL (recommended via Docker)
- Redis (recommended via Docker)
- VS Code (recommended)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/roadlyn.git
cd roadlyn
```

### 2. Run Setup Script

```bash
bash scripts/setup.sh
```

This script:
- Verifies pnpm is installed
- Installs dependencies
- Sets up Husky hooks
- Creates `.env` files from examples

### 3. Configure Environment

Edit the single root `.env` file with your values:

```bash
cp .env.example .env
```

### 4. Start Development

```bash
# Option 1: Using Makefile
make dev

# Option 2: Using pnpm directly
pnpm dev

# Option 3: Start individual services
pnpm dev:web   # Frontend only
pnpm dev:api   # Backend only
```

## Development Workflow

### Frontend Development

```bash
# Start frontend dev server
pnpm dev:web

# The app will be available at http://localhost:3000
```

**Structure**: `apps/web/src/`

- `app/` - Next.js pages and layouts
- `components/` - Reusable components
- `features/` - Feature modules
- `services/` - API client
- `stores/` - Zustand state

### Backend Development

```bash
# Start backend dev server
pnpm dev:api

# The API will be available at http://localhost:3001
```

**Structure**: `apps/api/src/`

- `routes/` - API endpoints
- `modules/` - Feature modules
- `services/` - Business logic
- `repositories/` - Database access
- `config/` - Configuration

### Database Management

#### Running Migrations

```bash
# Create new migration
cd apps/api
pnpm prisma migrate dev --name migration_name

# Example: Add new field to User model
pnpm prisma migrate dev --name add_phone_to_user
```

#### Viewing Database

```bash
# Open Prisma Studio (interactive GUI)
cd apps/api
pnpm prisma studio

# Opens at http://localhost:5555
```

#### Seeding Data

```bash
cd apps/api
pnpm prisma db seed
```

#### Resetting Database (Development Only)

```bash
cd apps/api
pnpm prisma db push --force-reset
pnpm prisma db seed
```

### Adding Dependencies

#### Frontend Package

```bash
cd apps/web
pnpm add package-name

# or with workspace flag
pnpm add -w --filter web package-name
```

#### Backend Package

```bash
cd apps/api
pnpm add package-name

# or with workspace flag
pnpm add -w --filter api package-name
```

#### Shared Package

```bash
cd packages/types
pnpm add package-name

# or
pnpm add -w --filter @roadlyn/types package-name
```

### Creating New Components

#### Frontend Component

```typescript
// apps/web/src/components/Button.tsx
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-primary text-white' : 'bg-secondary'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

#### Backend Route

```typescript
// apps/api/src/routes/example.ts
import { FastifyInstance } from 'fastify';

export async function exampleRoutes(fastify: FastifyInstance) {
  fastify.get('/example', async (request, reply) => {
    return {
      success: true,
      data: { message: 'Hello World' }
    };
  });
}
```

### Adding Database Models

```prisma
// apps/api/prisma/schema.prisma
model Product {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Then migrate:

```bash
cd apps/api
pnpm prisma migrate dev --name add_product_model
```

## Code Quality

### Linting

```bash
# Check for issues
pnpm lint

# Fix issues automatically
pnpm lint:fix
```

Lint configuration: `.eslintrc.json`

### Formatting

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

Prettier config: `.prettierrc`

### Type Checking

```bash
pnpm type-check
```

### Pre-commit Hooks

Husky automatically runs before commits:

- ESLint on changed files
- Prettier formatting
- commitlint message validation

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, test, chore  
**Scope**: auth, roadmap, api, web, db, etc.

**Examples**:

```
feat(auth): implement JWT token refresh
fix(api): handle connection timeout
docs(readme): update setup instructions
chore(deps): bump typescript to 5.4.0
```

## Building

### Build All Projects

```bash
pnpm build
```

### Build Specific Project

```bash
pnpm build:web    # Frontend only
pnpm build:api    # Backend only
```

### Build Output

- **Frontend**: `apps/web/.next/`
- **Backend**: `apps/api/dist/`

## Docker

### Development Services

Run only PostgreSQL and Redis:

```bash
make docker-dev
# or
docker-compose -f docker-compose.dev.yml up -d
```

Then run frontend and backend with `pnpm dev`.

### Production Services

Run full stack:

```bash
make docker-up
# or
docker-compose -f docker-compose.yml up -d
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache
```

## Debugging

### Frontend Debugging

```bash
# With VS Code Debugger
# 1. Add breakpoints
# 2. Run > Start Debugging (F5)
# 3. Browser DevTools (F12)
```

### Backend Debugging

```bash
# With VS Code Debugger
# 1. Add breakpoints in src files
# 2. Run > Start Debugging (F5)
# 3. Inspect variables in Debug panel
```

### Logs

```bash
# Backend logs (development)
# Automatically pretty-printed with pino-pretty

# Docker logs
docker-compose logs -f api
docker-compose logs -f web
```

## Troubleshooting

### Port Already in Use

```bash
# Frontend (3000)
lsof -i :3000
kill -9 <PID>

# Backend (3001)
lsof -i :3001
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose logs postgres

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@host:port/database

# Reset database
cd apps/api
pnpm prisma db push --force-reset
```

### Dependencies Issue

```bash
# Clear cache and reinstall
pnpm store prune
pnpm clean
rm -rf node_modules
pnpm install
```

### TypeScript Errors

```bash
# Regenerate Prisma types
cd apps/api
pnpm prisma generate

# Check for type errors
pnpm type-check
```

## Performance Tips

### Development

- Use `pnpm dev` instead of running separately
- Use `make docker-dev` for isolated database/redis
- Close unused browser tabs to save memory
- Use VS Code extensions like Thunder Client for API testing

### Build

- Use `--filter` flag to build specific workspaces
- Check Turbo cache: `.turbo/` directory
- Monitor build times with `pnpm build -- --profile`

## Best Practices

### Code Style

- Use functional components for React
- Prefer typed props interfaces
- Use `const` instead of `let`
- Avoid `any` types - use proper types
- Keep functions small and focused

### Backend

- Create services for business logic
- Use repositories for data access
- Validate inputs with Zod
- Handle errors consistently
- Log important operations

### Frontend

- Keep components small and reusable
- Use custom hooks for logic
- Separate concerns (data, UI, logic)
- Use TypeScript strictly
- Implement error boundaries

### Database

- Always use migrations for schema changes
- Write seeds for development data
- Use indexes for frequently queried fields
- Keep migrations reversible
- Test migrations in development first

## Useful VS Code Extensions

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Prisma
- Thunder Client (API testing)
- PostgreSQL Explorer
- GitLens

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Fastify Docs](https://www.fastify.io/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated**: May 2026

