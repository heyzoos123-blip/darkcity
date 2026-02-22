# Fix Netlify deployment for Next.js

Write-Host "Fixing Netlify deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Netlify Next.js plugin
Write-Host "Installing Netlify Next.js plugin..." -ForegroundColor Yellow
npm install --save-dev @netlify/plugin-nextjs

if ($LASTEXITCODE -ne 0) {
    Write-Host "Plugin installation failed" -ForegroundColor Red
    exit 1
}

Write-Host "Plugin installed" -ForegroundColor Green
Write-Host ""

# Step 2: Rebuild
Write-Host "Rebuilding..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Build complete" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy
Write-Host "Deploying to Netlify..." -ForegroundColor Yellow
netlify deploy --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Fixed and redeployed!" -ForegroundColor Green
Write-Host ""
$url = "https://darkcity.wtf"
Write-Host "Visit: $url" -ForegroundColor Cyan
Write-Host ""
