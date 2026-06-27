@echo off
setlocal

cd /d "%~dp0.."

echo.
echo [proxy vps] Checking project ports...
echo.
echo Ports:
echo   3000  API default
echo   3105  API local test
echo   5173  Web
echo   18001 Proxy gateway
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(3000,3105,5173,18001);" ^
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
  "    } else {" ^
  "      Write-Host ('PID:  ' + $item.OwningProcess);" ^
  "      Write-Host 'Name: <process not found>';" ^
  "    }" ^
  "  }" ^
  "  Write-Host '';" ^
  "}"

echo.
echo [proxy vps] Done.
echo You can close the matching Node/API/Web/Gateway window manually.
echo.
pause
