# Clean up old temporary files

Write-Host "🧹 Cleaning up DARKCITY repo..." -ForegroundColor Cyan

# Old documentation/build logs
$oldFiles = @(
    "BUILD-LOG.md",
    "DEPLOYMENT_UNIFIED.md", 
    "DEPLOY_TO_NETLIFY.md",
    "FINAL-DOMAIN-SETUP.md",
    "GOTHIC_DEPLOYMENT_SUMMARY.md",
    "GOTHIC_INDEX.md",
    "GOTHIC_MIGRATION_GUIDE.md",
    "GOTHIC_QUICK_REFERENCE.md",
    "GOTHIC_RESTYLE.md",
    "GOTHIC_VISUAL_COMPARISON.md",
    "INTEGRATION_COMPLETE.md",
    "INTEGRATION_PLAN.md",
    "LAUNCH_STATUS.md",
    "QUICKSTART_UNIFIED.md",
    "RAILWAY_DEPLOY.md",
    "docker-compose.unified.yml",
    "package.unified.json",
    "README_UNIFIED.md",
    ".env.unified.example",
    "landing-page.html",
    "POV-DESIGN.md",
    "SPRITE-DESIGN.md",
    "GITHUB_SETUP.md",
    "database/migrations/04-rebrand-jacob33.sql"
)

foreach ($file in $oldFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✓ Removed: $file" -ForegroundColor Green
    }
}

# Remove old unused directories
$oldDirs = @(
    "deployment",
    "apps",
    "packages",
    "infrastructure"
)

foreach ($dir in $oldDirs) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force
        Write-Host "✓ Removed directory: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✨ Cleanup complete!" -ForegroundColor Green
