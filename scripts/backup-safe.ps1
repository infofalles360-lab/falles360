param(
    [string]$Destination = "$(Split-Path -Parent $PSScriptRoot)\\backups\\falles360-safe-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$destinationDirectory = Split-Path -Parent $Destination

if (-not (Test-Path -LiteralPath $destinationDirectory)) {
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
}

Push-Location $projectRoot

try {
    $excludeArgs = @(
        '--exclude=.env',
        '--exclude=.env.local',
        '--exclude=.env.*',
        '--exclude=node_modules',
        '--exclude=dist',
        '--exclude=build',
        '--exclude=coverage',
        '--exclude=backups',
        '--exclude=backend/runtime',
        '--exclude=dashboard/server/runtime',
        '--exclude=runtime',
        '--exclude=storage',
        '--exclude=sessions',
        '--exclude=*.log',
        '--exclude=*.zip',
        '--exclude=*.7z',
        '--exclude=*.bak',
        '--exclude=tmp-*.json',
        '--exclude=tmp-*.geojson'
    )

    tar -a -cf $Destination @excludeArgs .
    Write-Output "Backup generado en $Destination"
}
finally {
    Pop-Location
}
