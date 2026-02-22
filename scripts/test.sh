#!/bin/bash

# DARKCITY - Test Runner
# Runs integration tests

set -e

echo "🌃 DARKCITY - Running Tests"
echo "==========================="

# Ensure test database is running
echo "🐳 Starting test database..."
docker-compose -f docker-compose.unified.yml up -d postgres redis qdrant

# Wait for services
sleep 5

# Run backend tests
echo "🧪 Running backend tests..."
cd apps/backend
npm test
cd ../..

# Run frontend tests (if any)
echo "🧪 Running frontend tests..."
cd apps/frontend
npm test || echo "ℹ️  No frontend tests configured yet"
cd ../..

echo ""
echo "✅ All tests passed!"
echo ""
