# Build script to generate MSI
param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

Write-Host "Restoring dependencies..."
dotnet restore

Write-Host "Publishing Service..."
dotnet publish src\Vorsight.Service\Vorsight.Service.csproj -c $Configuration -r win-x64 --self-contained true -p:PublishSingleFile=true -o src\Vorsight.Service\bin\$Configuration\net10.0\win-x64\publish

Write-Host "Publishing Agent..."
dotnet publish src\Vorsight.Agent\Vorsight.Agent.csproj -c $Configuration -r win-x64 --self-contained true -p:PublishSingleFile=true -o src\Vorsight.Agent\bin\$Configuration\net10.0-windows\win-x64\publish

Write-Host "Building Installer..."
dotnet build src\Vorsight.Setup\Vorsight.Setup.wixproj -c $Configuration

Write-Host "Done. Installer is in src\Vorsight.Setup\bin\$Configuration"
