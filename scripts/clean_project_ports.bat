@echo off
setlocal

cd /d "%~dp0.."

echo.
echo [proxy vps] This will inspect project ports and can close Node processes using them.
echo.
echo Project ports:
echo   3110  API
echo   5180  Admin web
echo   5181  User web
echo   18001 Proxy gateway
echo.
echo Safety rule:
echo   This script only kills node.exe on these ports after you confirm.
echo   If another program uses a port, it will only display it.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(3110,5180,5181,18001);" ^
  "$targets = @();" ^
  "foreach ($port in $ports) {" ^
  "  Write-Host ('=== Port ' + $port + ' ===');" ^
  "  $items = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue;" ^
  "  if (-not $items) { Write-Host 'FREE'; Write-Host ''; continue }" ^
  "  foreach ($item in $items) {" ^
  "    $p = Get-Process -Id $item.OwningProcess -ErrorAction SilentlyContinue;" ^
  "    if ($p) {" ^
  "      Write-Host ('PID:  ' + $p.Id);" ^
  "      Write-Host ('Name: ' + $p.ProcessName);" ^
  "      Write-Host ('Path: ' + $p.Path);" ^
  "      if ($p.ProcessName -eq 'node') { $targets += [pscustomobject]@{ Port = $port; Id = $p.Id; Path = $p.Path } }" ^
  "    } else {" ^
  "      Write-Host ('PID:  ' + $item.OwningProcess);" ^
  "      Write-Host 'Name: <process not found>';" ^
  "    }" ^
  "  }" ^
  "  Write-Host '';" ^
  "}" ^
  "if (-not $targets) { Write-Host 'No node.exe process found on project ports.'; exit 0 }" ^
  "Write-Host 'Node processes that can be closed:';" ^
  "$targets | Sort-Object Id -Unique | Format-Table -AutoSize;" ^
  "$answer = Read-Host 'Type Y then Enter to close these node.exe processes, or anything else to cancel';" ^
  "if ($answer -ne 'Y' -and $answer -ne 'y') { Write-Host 'Canceled. Nothing was closed.'; exit 0 }" ^
  "$targets | Sort-Object Id -Unique | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host ('Closed PID ' + $_.Id + ' on port ' + $_.Port) }"

echo.
echo [proxy vps] Done.
echo.
pause
