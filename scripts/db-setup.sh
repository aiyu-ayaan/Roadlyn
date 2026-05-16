#!/bin/bash
# Database migration script

set -e

cd apps/api

echo "🔄 Running Prisma migrations..."
pnpm prisma migrate dev

echo "🌱 Seeding database..."
pnpm prisma db seed

echo "✅ Database setup complete!"
