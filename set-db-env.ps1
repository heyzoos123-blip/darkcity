$dbUrl = "postgresql://postgres:dxUWZFsGQafgIHXhOXxpqAkhxwnLzRGF@gondola.proxy.rlwy.net:38939/railway?sslmode=require"

Write-Host "Setting DATABASE_URL in Vercel..."
Write-Host ""
Write-Host "Run this command:"
Write-Host "vercel env add DATABASE_URL production" -ForegroundColor Yellow
Write-Host ""
Write-Host "When prompted, paste this value:"
Write-Host $dbUrl -ForegroundColor Green
Write-Host ""
Write-Host "Mark as sensitive? Type: y"
