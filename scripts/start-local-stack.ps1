$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$logDir = Join-Path $projectRoot ".tmp-runtime-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$env:API_PORT = "3110"
$env:ADMIN_WEB_ORIGIN = "http://127.0.0.1:5180"
$env:USER_WEB_ORIGIN = "http://127.0.0.1:5181"
$env:WEB_ALLOWED_ORIGINS = "http://127.0.0.1:5180,http://127.0.0.1:5181"
# Absolute DATABASE_URL: a relative file: path resolves differently depending on
# each service's cwd (Prisma uses the schema dir, app code used process.cwd()),
# which silently split data across several .db files. Pin it to one absolute file.
$dbAbsPath = (Join-Path $projectRoot "data\proxy-platform.db") -replace "\\", "/"
$env:DATABASE_URL = "file:$dbAbsPath"
$env:WORKER_REPEAT = "true"
$env:SCAN_INTERVAL_MS = "600000"

$secretFileName = -join ([char]0x5BC6, [char]0x94A5, ".txt")
$secretPath = Join-Path $projectRoot $secretFileName
if (Test-Path $secretPath) {
  $env:ENCRYPTION_KEY = [System.IO.File]::ReadAllText($secretPath).Trim()
}

$npm = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npm)) {
  $npm = "npm"
}

function Start-LocalService {
  param(
    [string]$Name,
    [string]$Command,
    [hashtable]$ExtraEnv = @{}
  )

  foreach ($key in $ExtraEnv.Keys) {
    Set-Item -Path "env:$key" -Value $ExtraEnv[$key]
  }

  $outLog = Join-Path $logDir "$Name.out.log"
  $errLog = Join-Path $logDir "$Name.err.log"
  $proc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location '$projectRoot'; $Command *>> '$outLog' 2>> '$errLog'"
  ) -PassThru -WindowStyle Hidden

  return [PSCustomObject]@{
    Name = $Name
    Pid = $proc.Id
    OutLog = $outLog
    ErrLog = $errLog
  }
}

function Clear-ProjectPorts {
  param([int[]]$Ports)
  foreach ($port in $Ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { continue }
    foreach ($processId in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
      $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -eq "node") {
        Write-Host ("Freeing port {0}: stopping stale node PID {1}" -f $port, $processId)
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      }
      elseif ($proc) {
        Write-Host ("WARN port {0} held by non-node {1} (PID {2}); leaving it alone" -f $port, $proc.ProcessName, $processId)
      }
    }
  }
  Start-Sleep -Seconds 1
}

Write-Host "Starting local stack with unified env (API 3110, admin 5180, user 5181, gateway 18001)..."

Write-Host "Freeing project ports before start (3110, 5180, 5181, 18001)..."
Clear-ProjectPorts -Ports @(3110, 5180, 5181, 18001)

$services = @(
  (Start-LocalService -Name "api" -Command "& '$npm' run dev -w '@proxy-platform/api'"),
  (Start-LocalService -Name "admin-web" -Command "`$env:WEB_PORT='5180'; `$env:VITE_APP_SURFACE='admin'; `$env:VITE_API_BASE_URL='http://127.0.0.1:3110'; & '$npm' run dev -w '@proxy-platform/web' -- --host 127.0.0.1 --port 5180"),
  (Start-LocalService -Name "user-web" -Command "`$env:WEB_PORT='5181'; `$env:VITE_APP_SURFACE='user'; `$env:VITE_API_BASE_URL='http://127.0.0.1:3110'; & '$npm' run dev -w '@proxy-platform/web' -- --host 127.0.0.1 --port 5181"),
  (Start-LocalService -Name "gateway" -Command "& '$npm' run dev -w '@proxy-platform/gateway'"),
  (Start-LocalService -Name "worker" -Command "& '$npm' run dev -w '@proxy-platform/worker'")
)

$pidFile = Join-Path $logDir "local-stack.pids.json"
$services | ConvertTo-Json -Depth 3 | Set-Content -Path $pidFile -Encoding UTF8

Write-Host ""
Write-Host "Services started. PID file: $pidFile"
Write-Host "Run health check: powershell -File scripts/health-check-local.ps1"
Write-Host ""
Write-Host "Entries:"
Write-Host "  API:         http://127.0.0.1:3110/api/health"
Write-Host "  Admin:       http://127.0.0.1:5180"
Write-Host "  User panel:  http://127.0.0.1:5181"
Write-Host "  Gateway:     http://127.0.0.1:18001/health"
