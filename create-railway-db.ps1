$projectId = "d0cd04c0-6d8d-49b8-b21d-5c56888a18e7"
$envId = "fa88c3c8-732f-4d62-89e5-900825ce1eb8"

# Create PostgreSQL plugin via Railway API
$query = @"
mutation {
  pluginCreate(input: {
    projectId: "$projectId"
    name: "darkcity-postgres"
  }) {
    id
    name
  }
}
"@

$body = @{
    query = $query
} | ConvertTo-Json

Write-Host "Creating PostgreSQL database on Railway..."

try {
    $response = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer b3b5f8f6c7d14a2c9f4b1a2d3e4f5a6b"
        } `
        -Body $body
    
    if ($response.errors) {
        Write-Host "Error: $($response.errors[0].message)"
        Write-Host "Database might already exist. Checking..."
    } else {
        Write-Host "✅ PostgreSQL created! ID: $($response.data.pluginCreate.id)"
    }
} catch {
    Write-Host "API call failed: $_"
}

# Get DATABASE_URL from Railway variables
Write-Host "`nGetting DATABASE_URL..."
railway variables --json | Out-File -FilePath "railway-vars.json"
$vars = Get-Content "railway-vars.json" | ConvertFrom-Json
if ($vars.DATABASE_URL) {
    Write-Host "✅ DATABASE_URL found!"
    Write-Host $vars.DATABASE_URL.Substring(0, 50) + "..."
    
    # Set in Vercel
    Write-Host "`nSetting DATABASE_URL in Vercel..."
    Set-Content -Path ".env.database" -Value $vars.DATABASE_URL
    
    Write-Host "`nRun: vercel env add DATABASE_URL production"
    Write-Host "Then paste the contents of .env.database"
} else {
    Write-Host "⚠️ DATABASE_URL not found yet. Database might still be provisioning."
}
