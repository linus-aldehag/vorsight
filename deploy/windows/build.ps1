# Build script to generate Inno Setup installer
param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

Write-Host "Building Vörsight Installer..."
Write-Host "================================"

# Check if Inno Setup is installed
$InnoSetup = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $InnoSetup)) {
    Write-Host "ERROR: Inno Setup 6 not found at $InnoSetup" -ForegroundColor Red
    Write-Host "Please download and install from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    exit 1
}

Write-Host "Generating Contracts..."
$ContractScript = "dotnet\Vorsight.Contracts\GenerateContracts.ps1"
if (Test-Path $ContractScript) {
    & $ContractScript
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to generate contracts."
        exit 1
    }
} else {
    Write-Warning "GenerateContracts.ps1 not found at $ContractScript"
}

Write-Host "Restoring dependencies..."
dotnet restore

Write-Host "Publishing Service (self-contained)..."
dotnet publish dotnet\Vorsight.Service\Vorsight.Service.csproj `
    -c $Configuration `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:AppendRuntimeIdentifierToOutputPath=false `
    -o publish\Service

Write-Host "Publishing Agent (self-contained)..."
dotnet publish dotnet\Vorsight.Agent\Vorsight.Agent.csproj `
    -c $Configuration `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:AppendRuntimeIdentifierToOutputPath=false `
    -o publish\Agent

Write-Host "Compiling Inno Setup installer..."
& $InnoSetup deploy\windows\vorsight-setup.iss /O"Output" /F"VorsightSetup"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Installer created:" -ForegroundColor Green
    Write-Host "  Output\VorsightSetup.exe" -ForegroundColor Cyan
}
else {
    Write-Host "ERROR: Inno Setup compilation failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
