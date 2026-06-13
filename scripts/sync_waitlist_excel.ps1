$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = "C:\Users\marcb\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$node = "C:\Users\marcb\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$logDirectory = Join-Path $root "logs"
$logPath = Join-Path $logDirectory "waitlist_excel_sync.log"

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

try {
    Push-Location $root
    & $python "scripts\export_waitlist_mailbox.py"
    if ($LASTEXITCODE -ne 0) {
        throw "La extraccion del correo fallo con codigo $LASTEXITCODE."
    }

    & $python "scripts\notify_waitlist_telegram.py"
    if ($LASTEXITCODE -ne 0) {
        "$(Get-Date -Format o) AVISO: Telegram no pudo enviar las notificaciones pendientes." | Add-Content -LiteralPath $logPath
    }

    Push-Location (Join-Path $root "spreadsheet-work")
    & $node "build_waitlist_excel.mjs"
    if ($LASTEXITCODE -ne 0) {
        throw "La generacion del Excel fallo con codigo $LASTEXITCODE."
    }

    "$(Get-Date -Format o) Sincronizacion completada." | Add-Content -LiteralPath $logPath
} catch {
    "$(Get-Date -Format o) ERROR: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath
    throw
} finally {
    Pop-Location -ErrorAction SilentlyContinue
    Pop-Location -ErrorAction SilentlyContinue
}
