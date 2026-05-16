#!/bin/bash
# Development startup script

set -e

echo "🚀 Starting Roadlyn development environment..."

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
sleep 5

echo "✅ Docker services started"
echo ""
echo "📝 Running database migrations..."
cd apps/api
pnpm prisma migrate dev || true
cd ../..

echo ""
echo "✨ Development environment ready!"
echo ""
echo "🎯 Available commands:"
echo "   pnpm dev           - Start all dev servers"
echo "   pnpm dev:web       - Start frontend dev server"
echo "   pnpm dev:api       - Start backend dev server"
echo "   make docker-logs   - View Docker logs"
echo "   make docker-down   - Stop Docker services"
echo ""
