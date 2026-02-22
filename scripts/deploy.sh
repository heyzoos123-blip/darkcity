#!/bin/bash

# DARKCITY - Deployment Script
# Builds and deploys the entire stack using Docker

set -e

echo "🌃 DARKCITY - Deployment"
echo "========================"

# Check environment
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.unified.example and configure it."
    exit 1
fi

# Load environment
source .env

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.unified.yml build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.unified.yml down

# Start all services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.unified.yml up -d

# Wait for services
echo "⏳ Waiting for services to be healthy..."
sleep 15

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.unified.yml exec backend npx prisma migrate deploy

# Check health
echo "🏥 Health check..."
curl -f http://localhost:3001/health || echo "⚠️  Backend health check failed"

echo ""
echo "✅ DARKCITY deployed successfully!"
echo ""
echo "📡 Services:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "🔍 View logs:"
echo "   docker-compose -f docker-compose.unified.yml logs -f"
echo ""
