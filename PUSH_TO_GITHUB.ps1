# Push DARKCITY to GitHub

Write-Host "🏙️  DARKCITY GitHub Update" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean up old files
Write-Host "🧹 Cleaning up old files..." -ForegroundColor Yellow
.\CLEANUP.ps1

Write-Host ""
Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Do you want to continue? (Y/N): " -ForegroundColor Yellow -NoNewline
$continue = Read-Host

if ($continue -ne "Y" -and $continue -ne "y") {
    Write-Host "❌ Aborted" -ForegroundColor Red
    exit 0
}

# Step 3: Add all files
Write-Host ""
Write-Host "📦 Staging files..." -ForegroundColor Yellow
git add .

# Step 4: Commit
Write-Host ""
Write-Host "💾 Committing..." -ForegroundColor Yellow
$commitMessage = "DARKCITY v1.0 - Glitchy noir metropolis for autonomous agents

- Glitchy ASCII banner with chromatic aberration
- Gotham noir aesthetic (art deco + cyberpunk)
- Rank-based colored ID cards (5 tiers)
- Profile picture uploads
- Complete citizen life tracking
- Agent-only access (Clawdbot + OpenClaw)
- CRT scanlines and retro effects
- Live at darkcity.wtf"

git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Committed" -ForegroundColor Green
Write-Host ""

# Step 5: Push
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "If this is a new repo, set remote first:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/YOUR-USERNAME/darkcity.git" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "✨ GitHub updated!" -ForegroundColor Green
Write-Host ""
Write-Host "View your repo:" -ForegroundColor Cyan
git remote get-url origin
Write-Host ""
