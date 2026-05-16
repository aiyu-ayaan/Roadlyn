.PHONY: help install dev dev-setup docker-up docker-down docker-logs lint lint-fix format build clean db-migrate db-seed

help:
	@echo "Roadlyn Development Commands"
	@echo "============================"
	@echo ""
	@echo "Setup:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev-setup    - Setup development environment"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start all development servers"
	@echo "  make dev-web      - Start frontend dev server only"
	@echo "  make dev-api      - Start backend dev server only"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         - Run ESLint"
	@echo "  make lint-fix     - Fix ESLint issues"
	@echo "  make format       - Format code with Prettier"
	@echo "  make format-check - Check code formatting"
	@echo ""
	@echo "Build:"
	@echo "  make build        - Build all projects"
	@echo "  make build-web    - Build frontend"
	@echo "  make build-api    - Build backend"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Run Prisma migrations"
	@echo "  make db-seed      - Seed database"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up    - Start Docker services (production)"
	@echo "  make docker-dev   - Start Docker services (development)"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make docker-logs  - View Docker logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean        - Remove build artifacts and node_modules"
	@echo ""

install:
	@echo "📦 Installing dependencies..."
	pnpm install

dev-setup:
	@echo "🔧 Setting up development environment..."
	bash scripts/dev-start.sh

dev:
	@echo "🚀 Starting all development servers..."
	pnpm dev

dev-web:
	@echo "🚀 Starting frontend development server..."
	pnpm dev:web

dev-api:
	@echo "🚀 Starting backend development server..."
	pnpm dev:api

lint:
	@echo "🔍 Running linter..."
	pnpm lint

lint-fix:
	@echo "🔧 Fixing linter issues..."
	pnpm lint:fix

format:
	@echo "✨ Formatting code..."
	pnpm format

format-check:
	@echo "✨ Checking code formatting..."
	pnpm format:check

build:
	@echo "🔨 Building all projects..."
	pnpm build

build-web:
	@echo "🔨 Building frontend..."
	pnpm build:web

build-api:
	@echo "🔨 Building backend..."
	pnpm build:api

db-migrate:
	@echo "🔄 Running database migrations..."
	pnpm db:migrate

db-seed:
	@echo "🌱 Seeding database..."
	cd apps/api && pnpm prisma db seed

docker-up:
	@echo "🐳 Starting Docker services (production)..."
	docker-compose -f docker-compose.yml up -d

docker-dev:
	@echo "🐳 Starting Docker services (development)..."
	docker-compose -f docker-compose.dev.yml up -d

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose -f docker-compose.yml down

docker-logs:
	@echo "📋 Showing Docker logs..."
	docker-compose -f docker-compose.yml logs -f

clean:
	@echo "🧹 Cleaning up..."
	pnpm clean
	find . -type d -name .turbo -exec rm -rf {} + 2>/dev/null || true
	echo "✅ Clean complete"

type-check:
	@echo "🔍 Type checking..."
	pnpm type-check

test:
	@echo "🧪 Running tests..."
	pnpm test
