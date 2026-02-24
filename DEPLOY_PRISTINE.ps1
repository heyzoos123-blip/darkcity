# DARKCITY v3.1 - Deploy Pristine Version
Write-Host "🏗️  Deploying DARKCITY v3.1 (Pristine Build)" -ForegroundColor Cyan
Write-Host ""

# Navigate to darkcity
Set-Location -Path "$PSScriptRoot"

# 1. Use the complete server version
Write-Host "📦 Step 1: Using complete server.js..." -ForegroundColor Yellow
Copy-Item "api/server-complete-v3.js" "api/server.js" -Force
Write-Host "✅ Copied server-complete-v3.js → server.js" -ForegroundColor Green

# 2. Verify files
Write-Host "`n📋 Step 2: Verifying files..." -ForegroundColor Yellow
$serverSize = (Get-Item "api/server.js").Length / 1KB
$frontendSize = (Get-Item "frontend/index.html").Length / 1KB
Write-Host "   api/server.js: $([math]::Round($serverSize, 1))KB ✓" -ForegroundColor Green
Write-Host "   frontend/index.html: $([math]::Round($frontendSize, 1))KB ✓" -ForegroundColor Green

# 3. Git commit
Write-Host "`n📤 Step 3: Committing to Git..." -ForegroundColor Yellow
git add api/server.js frontend/index.html DEPLOYMENT_CHECKLIST.md
git commit -m "Deploy: DARKCITY v3.1 Pristine - Isometric graphics + full autonomous engine"

# 4. Push to trigger Render deploy
Write-Host "`n🚀 Step 4: Pushing to GitHub (triggers Render auto-deploy)..." -ForegroundColor Yellow
git push origin master

Write-Host "`n✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Live URL: https://darkcity.onrender.com" -ForegroundColor Cyan
Write-Host "⏱️  Render will redeploy in ~2-3 minutes" -ForegroundColor Yellow
Write-Host ""
Write-Host "What's included:" -ForegroundColor White
Write-Host "   - Isometric city map (9x9 grid)" -ForegroundColor Gray
Write-Host "   - Procedural building skylines" -ForegroundColor Gray
Write-Host "   - Full autonomous agent engine" -ForegroundColor Gray  
Write-Host "   - Dark cyberpunk aesthetic" -ForegroundColor Gray
Write-Host "   - Live SSE activity feed" -ForegroundColor Gray
Write-Host ""
