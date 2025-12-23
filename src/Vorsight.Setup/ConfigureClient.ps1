# PowerShell script to configure client connection to Vörsight server
# This runs during Windows client installation to set up server connection

param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,
    
    [Parameter(Mandatory = $true)]
    [string]$ServerHost,
    
    [Parameter(Mandatory = $true)]
    [string]$ServerPort,
    
    [Parameter(Mandatory = $true)]
    [string]$JwtSecret
)

$ErrorActionPreference = "Stop"

try {
    Write-Host "Configuring client connection to server..." -ForegroundColor Cyan
    
    # Build server URL
    $serverUrl = "http://${ServerHost}:${ServerPort}"
    
    # Path to appsettings.json
    $appsettingsPath = Join-Path $InstallDir "appsettings.json"
    
    if (-not (Test-Path $appsettingsPath)) {
        Write-Error "appsettings.json not found at: $appsettingsPath"
        exit 1
    }
    
    # Read and parse JSON
    $config = Get-Content $appsettingsPath -Raw | ConvertFrom-Json
    
    # Update server connection settings
    $config.Server.Url = $serverUrl
    $config.Service.PresharedKey = $JwtSecret
    
    # Save updated configuration
    $config | ConvertTo-Json -Depth 10 | Set-Content $appsettingsPath -Encoding UTF8
    
    Write-Host "✓ Client configured successfully" -ForegroundColor Green
    Write-Host "  Server URL: $serverUrl" -ForegroundColor Gray
    
    exit 0
}
catch {
    Write-Error "Failed to configure client: $_"
    exit 1
}
