# DARKCITY Quick Deploy Script
# Deploys to darkcity.wtf

Write-Host "🏙️  DARKCITY Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Rebuild Backend
Write-Host "📦 Step 1: Rebuilding backend API..." -ForegroundColor Yellow
cd C:\Users\heyzo\clawd\backend\services\city-api-node
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend rebuilt successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Build Frontend
Write-Host "🎨 Step 2: Building frontend..." -ForegroundColor Yellow
cd C:\Users\heyzo\clawd\projects\darkcity\frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy to Netlify
Write-Host "🚀 Step 3: Deploying to Netlify..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command to deploy:" -ForegroundColor Cyan
Write-Host "  netlify deploy --prod --dir=.next" -ForegroundColor White
Write-Host ""
Write-Host "Or drag the .next folder to Netlify dashboard" -ForegroundColor Cyan
Write-Host ""

# Done
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✨ Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy backend to Railway (if needed)" -ForegroundColor White
Write-Host "  2. Run: netlify deploy --prod --dir=.next" -ForegroundColor White
Write-Host "  3. Visit darkcity.wtf" -ForegroundColor White
Write-Host ""
Write-Host "🏙️  DARKCITY awaits..." -ForegroundColor Cyan
