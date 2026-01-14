# Generate-Contracts.ps1
# Generates C# contracts from Shared JSON Schemas using quicktype
# Expects to be run from the project directory or solution directory

$ErrorActionPreference = "Stop"

$SharedSchemaDir = Resolve-Path "$PSScriptRoot\..\..\shared\schemas"
$SettingsSchema = "$SharedSchemaDir\machine-settings.json"
$PayloadsSchema = "$SharedSchemaDir\api-payloads.json"

$SettingsOut = "$PSScriptRoot\Settings\MachineSettings.gen.cs"
$PayloadsOut = "$PSScriptRoot\DTOs\ApiPayloads.gen.cs"

# Check if npx is available
if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx is not installed or not in PATH. Please install Node.js."
    exit 1
}

# Ensure output directories exist
$SettingsDir = Split-Path $SettingsOut
$PayloadsDir = Split-Path $PayloadsOut

if (!(Test-Path $SettingsDir)) {
    New-Item -ItemType Directory -Force -Path $SettingsDir | Out-Null
}
if (!(Test-Path $PayloadsDir)) {
    New-Item -ItemType Directory -Force -Path $PayloadsDir | Out-Null
}

try {
    Write-Host "Generating MachineSettings.gen.cs..."
    # MachineSettings
    # Use npx -y to run quicktype without local package.json
    # Note: quoted paths to handle spaces if necessary
    & npx -y quicktype -s schema -l csharp -o "$SettingsOut" "$SettingsSchema" --namespace Vorsight.Contracts.Settings --top-level MachineSettings --array-type list --features complete --check-required

    Write-Host "Generating ApiPayloads.gen.cs..."
    # Payloads
    & npx -y quicktype -s schema -l csharp -o "$PayloadsOut" "$PayloadsSchema" --namespace Vorsight.Contracts.DTOs --array-type list --features complete
}
catch {
    Write-Error "Failed to generate contracts: $_"
    exit 1
}

Write-Host "Done."
