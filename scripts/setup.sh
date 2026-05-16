#!/bin/bash
# Setup script for initial project setup

set -e

echo "🚀 Setting up Roadlyn monorepo..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🔧 Setting up Husky hooks..."
pnpm exec husky install

echo "📝 Creating .env files..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
fi

if [ ! -f apps/api/.env ]; then
    cp apps/api/.env.example apps/api/.env
    echo "✅ Created apps/api/.env file"
fi

if [ ! -f apps/web/.env.local ]; then
    cp apps/web/.env.example apps/web/.env.local
    echo "✅ Created apps/web/.env.local file"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Update .env files with your configuration"
echo "   2. Run 'make dev' to start development servers"
echo "   3. Run 'make docker-up' to start Docker services"
echo ""
