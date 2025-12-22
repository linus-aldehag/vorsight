# PowerShell script to trigger Google Drive OAuth flow during installation
# This runs during MSI installation to configure credentials before service starts

param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,
    [string]$ClientSecretsFile = "oauth.json"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Google Drive OAuth Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if client secrets file exists
$clientSecretsPath = Join-Path $InstallDir $ClientSecretsFile
if (-not (Test-Path $clientSecretsPath)) {
    Write-Host "ERROR: Client secrets file not found at: $clientSecretsPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure 'oauth.json' is in the installation directory before running this script." -ForegroundColor Yellow
    Write-Host "You can download it from Google Cloud Console > APIs & Services > Credentials" -ForegroundColor Yellow
    Read-Host "Press Enter to skip OAuth configuration and continue installation"
    exit 1
}

Write-Host "Client secrets found: $clientSecretsPath" -ForegroundColor Green

# Add Google.Apis assemblies (from service directory)
$servicePath = if (Test-Path "bin\Release\net10.0\win-x64\publish") {
    "bin\Release\net10.0\win-x64\publish"
}
else {
    $InstallDir
}

try {
    Add-Type -Path (Join-Path $servicePath "Google.Apis.dll")
    Add-Type -Path (Join-Path $servicePath "Google.Apis.Core.dll")
    Add-Type -Path (Join-Path $servicePath "Google.Apis.Auth.dll")
    Add-Type -Path (Join-Path $servicePath "Google.Apis.Drive.v3.dll")
    Write-Host "Google APIs loaded successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to load Google APIs" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to skip OAuth configuration and continue installation"
    exit 1
}

Write-Host ""
Write-Host "Initiating Google Drive authentication..." -ForegroundColor Cyan
Write-Host "A browser window will open. Please sign in and grant permissions." -ForegroundColor Yellow
Write-Host ""

try {
    # Load client secrets
    $stream = New-Object System.IO.FileStream($clientSecretsPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
    $clientSecrets = [Google.Apis.Auth.OAuth2.GoogleClientSecrets]::FromStreamAsync($stream).Result
    $stream.Close()

    # Create credentials store in DriveCredentials folder
    $credentialsPath = Join-Path $InstallDir "DriveCredentials"
    $dataStore = New-Object Google.Apis.Util.Store.FileDataStore($credentialsPath, $true)

    # Request OAuth
    $scopes = @([Google.Apis.Drive.v3.DriveService+Scope]::DriveFile)
    $cancellationToken = New-Object System.Threading.CancellationToken
    
    $credential = [Google.Apis.Auth.OAuth2.GoogleWebAuthorizationBroker]::AuthorizeAsync(
        $clientSecrets.Secrets,
        $scopes,
        "user",
        $cancellationToken,
        $dataStore
    ).Result

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Google Drive configured" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Credentials saved to: $credentialsPath" -ForegroundColor Cyan
    Write-Host "The Vorsight service can now upload screenshots to Google Drive." -ForegroundColor Cyan
    Write-Host ""
    
    exit 0
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: OAuth failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "You can manually configure Google Drive later by running:" -ForegroundColor Yellow
    Write-Host "  cd `"$InstallDir`""  -ForegroundColor Gray
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\ConfigureGoogleDrive.ps1" -ForegroundColor Gray
    Write-Host ""
    
    Read-Host "Press Enter to continue installation without Google Drive"
    exit 1
}
