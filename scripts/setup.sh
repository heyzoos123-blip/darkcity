#!/bin/bash

# DARKCITY - One-Command Setup Script
# This script sets up the entire DARKCITY development environment

set -e

echo "🌃 DARKCITY - Setup Script"
echo "============================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites met"

# Copy environment file
echo "📝 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.unified.example .env
    echo "✅ Created .env file - PLEASE EDIT IT WITH YOUR API KEYS!"
else
    echo "ℹ️  .env file already exists"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install shared package dependencies
echo "📦 Installing shared package dependencies..."
cd packages/shared
npm install
cd ../..

# Install database package dependencies
echo "📦 Installing database package dependencies..."
cd packages/database
npm install
cd ../..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd apps/backend
npm install
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd apps/frontend
npm install
cd ../..

# Generate Prisma client
echo "🔨 Generating Prisma client..."
cd packages/database
npx prisma generate
cd ../..

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.unified.yml up -d postgres redis qdrant

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Run migrations
echo "🗄️  Running database migrations..."
cd packages/database
npx prisma migrate deploy || npx prisma db push
cd ../..

# Seed database
echo "🌱 Seeding database..."
# (Add seed script when ready)

echo ""
echo "✅ DARKCITY setup complete!"
echo ""
echo "🚀 To start the development environment:"
echo "   ./scripts/dev.sh"
echo ""
echo "📝 Don't forget to:"
echo "   1. Edit .env with your API keys"
echo "   2. Check database connection: docker-compose -f docker-compose.unified.yml logs postgres"
echo ""
