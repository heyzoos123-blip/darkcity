#!/bin/bash

# DARKCITY - Development Environment Script
# Starts all services in development mode

set -e

echo "🌃 DARKCITY - Starting Development Environment"
echo "==============================================="

# Ensure Docker services are running
echo "🐳 Ensuring Docker services are running..."
docker-compose -f docker-compose.unified.yml up -d postgres redis qdrant

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 5

# Start backend in development mode
echo "🔧 Starting backend (port 3001)..."
cd apps/backend
npm run dev &
BACKEND_PID=$!
cd ../..

# Start frontend in development mode
echo "🎨 Starting frontend (port 3000)..."
cd apps/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ Development environment started!"
echo ""
echo "📡 Services:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo "   WebSocket: ws://localhost:3001"
echo ""
echo "🗄️  Databases:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis:      localhost:6379"
echo "   Qdrant:     localhost:6333"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
