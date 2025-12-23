# PowerShell script to generate web UI authentication secrets during installation

param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Web UI Security Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Generate random passphrase (16 character alphanumeric)
$passphrase = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })

# Generate JWT secret (32 character alphanumeric for extra security)
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Host "Generated web authentication credentials" -ForegroundColor Green
Write-Host ""

# Save to server .env file
$envPath = Join-Path $InstallDir "Server\.env"
$envDir = Split-Path -Parent $envPath

# Ensure Server directory exists
if (-not (Test-Path $envDir)) {
    New-Item -ItemType Directory -Path $envDir -Force | Out-Null
}

# Create .env file with authentication secrets
$envContent = @"
# Vörsight Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# CORS Configuration
CLIENT_ORIGIN=http://localhost:3000

# Authentication
WEB_PASSPHRASE=$passphrase
JWT_SECRET=$jwtSecret
JWT_EXPIRY=30d

# Database
DB_PATH=./data/vorsight.db
"@

Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Host "Saved configuration to: $envPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "IMPORTANT: Save your web passphrase!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Web UI Passphrase: " -NoNewline
Write-Host $passphrase -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "You will need this passphrase to log in to the web dashboard." -ForegroundColor Yellow
Write-Host "This message will not be shown again!" -ForegroundColor Red
Write-Host ""
Write-Host "Press any key to continue installation..." -ForegroundColor Gray

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

exit 0
