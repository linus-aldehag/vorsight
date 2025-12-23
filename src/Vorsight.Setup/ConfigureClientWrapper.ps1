# Wrapper script for deferred custom action - parses CustomActionData
# WiX deferred actions can't access MSI properties directly, so we parse CustomActionData

$ErrorActionPreference = "Continue"

try {
    # Get CustomActionData from environment
    $customData = $env:CustomActionData
    
    if (-not $customData) {
        Write-Host "CustomActionData is empty - skipping client configuration"
        exit 0
    }
    
    # Parse key=value pairs
    $data = @{}
    $customData.Split(';') | ForEach-Object {
        $kv = $_.Split('=', 2)
        if ($kv.Length -eq 2) {
            $data[$kv[0]] = $kv[1]
        }
    }
    
    # Skip configuration if JWT_SECRET is empty
    if (-not $data['JWT_SECRET']) {
        Write-Host "JWT_SECRET not provided - skipping client configuration"
        Write-Host "Please manually edit appsettings.json after installation"
        exit 0
    }
    
    # Get script directory (where this wrapper is located)
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $configScript = Join-Path $scriptDir "ConfigureClient.ps1"
    
    # Call the actual configuration script
    & $configScript `
        -InstallDir $data['INSTALLDIR'] `
        -ServerHost $data['SERVER_HOST'] `
        -ServerPort $data['SERVER_PORT'] `
        -JwtSecret $data['JWT_SECRET']
    
    exit $LASTEXITCODE
}
catch {
    Write-Host "Configuration failed: $_"
    Write-Host "Installation will complete but you'll need to manually edit appsettings.json"
    exit 0
}
