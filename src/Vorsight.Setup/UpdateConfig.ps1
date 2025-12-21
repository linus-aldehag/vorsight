# Update Vorsight appsettings.json with installer properties
# This script is executed as a deferred custom action during installation

param(
    [string]$InstallDir,
    [string]$ServerHost,
    [string]$ServerPort,
    [string]$PresharedKey,
    [string]$GDriveFolderId
)

$configPath = Join-Path $InstallDir "appsettings.json"

try {
    # Read existing config
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    
    # Update Service settings
    if ($ServerHost) {
        # Update Kestrel URL
        $config.Kestrel.Endpoints.Http.Url = "http://${ServerHost}:${ServerPort}"
    }
    
    if ($PresharedKey) {
        $config.Service.PresharedKey = $PresharedKey
    }
    
    # Update Google Drive if provided
    if ($GDriveFolderId) {
        $config.GoogleDrive.ParentFolderId = $GDriveFolderId
    }
    
    # Write back to file
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
    
    exit 0
}
catch {
    Write-Error "Failed to update configuration: $_"
    exit 1
}
