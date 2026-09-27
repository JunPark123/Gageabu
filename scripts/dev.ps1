param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'status', 'logs', 'backup', 'shell')]
    [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
$dockerExe = if ($dockerCommand) { $dockerCommand.Source } else { $null }
if (-not $dockerExe) {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'),
        (Join-Path $env:ProgramFiles 'Docker/Docker/resources/bin/docker.exe')
    )
    $dockerExe = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $dockerExe) { throw 'Docker CLI not found. Install/start Docker Desktop and reopen PowerShell.' }

function Invoke-Docker {
    param([string[]]$DockerArguments)
    & $dockerExe @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw "Docker failed (exit $LASTEXITCODE)." }
}

Push-Location $repoRoot
try {
    switch ($Action) {
        'start' {
            Invoke-Docker @('compose', 'up', '-d', '--build', '--wait', '--wait-timeout', '180', 'api')
            Write-Host 'API: http://localhost:5067/swagger'
        }
        'stop' { Invoke-Docker @('compose', 'stop', 'api') }
        'status' { Invoke-Docker @('compose', 'ps', '--all', 'api') }
        'logs' { Invoke-Docker @('compose', 'logs', '--follow', '--tail', '100', 'api') }
        'shell' { Invoke-Docker @('compose', 'exec', 'api', 'bash') }
        'backup' {
            $containerId = Invoke-Docker @('compose', 'ps', '-q', 'api')
            if (-not $containerId) { throw 'Start the API before backing up: .\scripts\dev.ps1 start' }
            $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
            $backupName = "gageabu-$stamp.db"
            $backupDir = Join-Path $repoRoot '.local/backups'
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            $backupPath = Join-Path $backupDir $backupName
            $containerPath = "/tmp/$backupName"
            try {
                # SQLite online backup API: safe even when the API is running.
                Invoke-Docker @('exec', $containerId, 'sqlite3', '-readonly', '/data/db/gageabu.db', ".backup '$containerPath'")
                $integrity = Invoke-Docker @('exec', $containerId, 'sqlite3', '-readonly', $containerPath, 'PRAGMA integrity_check;')
                if (($integrity -join "`n").Trim() -ne 'ok') { throw "Backup integrity check failed: $integrity" }
                Invoke-Docker @('cp', "${containerId}:$containerPath", $backupPath)
                $hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
                [IO.File]::WriteAllText("$backupPath.sha256", "$hash  $backupName`n")
                Write-Host "Verified backup: $backupPath"
            }
            finally {
                Invoke-Docker @('exec', $containerId, 'rm', '-f', $containerPath)
            }
        }
    }
}
finally { Pop-Location }
