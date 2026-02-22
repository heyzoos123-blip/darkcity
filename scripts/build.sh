#!/bin/bash

# DARKCITY - Production Build Script

set -e

echo "🌃 DARKCITY - Production Build"
echo "==============================="

# Build shared packages
echo "📦 Building shared packages..."
cd packages/shared
npm run build
cd ../..

# Build backend
echo "🔨 Building backend..."
cd apps/backend
npm run build
cd ../..

# Build frontend
echo "🎨 Building frontend..."
cd apps/frontend
npm run build
cd ../..

echo ""
echo "✅ Production build complete!"
echo ""
echo "📦 Build artifacts:"
echo "   Backend:  apps/backend/dist/"
echo "   Frontend: apps/frontend/.next/"
echo ""
