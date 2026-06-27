# Consistent online backup of the SQLite database.
#
# Uses SQLite's `VACUUM INTO` (via Node's built-in node:sqlite) to produce a
# single, fully-checkpointed snapshot that already folds in any -wal/-shm
# content. This is safe to run while the stack is live: WAL mode lets the
# backup take a read snapshot without blocking writers, and the source DB is
# never modified.
#
# Usage:
#   powershell -File scripts/backup-db.ps1
#   powershell -File scripts/backup-db.ps1 -DbPath data/proxy-platform.db -Keep 14
#
# Restore (manual, destructive — stop the stack first, then copy a snapshot
# back over data/proxy-platform.db and delete the stale -wal/-shm files).

param(
  [string]$DbPath = "",
  [string]$BackupDir = "",
  [int]$Keep = 14
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

if (-not $DbPath) {
  $DbPath = Join-Path $projectRoot "data\proxy-platform.db"
}
if (-not (Test-Path $DbPath)) {
  Write-Error "Database file not found: $DbPath"
  exit 1
}
$DbPath = (Resolve-Path $DbPath).Path

if (-not $BackupDir) {
  $BackupDir = Join-Path $projectRoot "data\backups"
}
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dbName = [System.IO.Path]::GetFileNameWithoutExtension($DbPath)
$target = Join-Path $BackupDir "$dbName-$timestamp.db"

$node = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $node)) {
  $node = "node"
}

# Run the snapshot through Node's built-in sqlite (VACUUM INTO). The logic lives
# in a companion .mjs so we avoid fragile inline -e quoting across PowerShell.
$snapshotScript = Join-Path $PSScriptRoot "backup-db.mjs"
if (-not (Test-Path $snapshotScript)) {
  Write-Error "Missing helper script: $snapshotScript"
  exit 1
}

Write-Host "Backing up $DbPath"
Write-Host "  -> $target"

$output = & $node $snapshotScript $DbPath $target 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Backup failed (node exit $LASTEXITCODE): $output"
  exit 1
}

if (-not (Test-Path $target)) {
  Write-Error "Backup command finished but no snapshot was produced."
  exit 1
}

$sizeKb = [math]::Round((Get-Item $target).Length / 1KB, 1)
Write-Host "Snapshot created: $target ($sizeKb KB)"

# Retention: keep the newest $Keep snapshots for this db name, delete older.
$pattern = "$dbName-*.db"
$existing = Get-ChildItem -Path $BackupDir -Filter $pattern -File | Sort-Object LastWriteTime -Descending
if ($existing.Count -gt $Keep) {
  $toDelete = $existing | Select-Object -Skip $Keep
  foreach ($file in $toDelete) {
    Remove-Item $file.FullName -Force
    Write-Host "Pruned old backup: $($file.Name)"
  }
}

Write-Host ""
Write-Host "Done. Backups retained ($Keep max):"
Get-ChildItem -Path $BackupDir -Filter $pattern -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First $Keep |
  ForEach-Object { Write-Host ("  {0}  {1:yyyy-MM-dd HH:mm:ss}  {2} KB" -f $_.Name, $_.LastWriteTime, [math]::Round($_.Length / 1KB, 1)) }
