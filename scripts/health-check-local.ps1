$ErrorActionPreference = "Stop"

$apiBase = "http://127.0.0.1:3110"
$adminOrigin = "http://127.0.0.1:5180"
$userOrigin = "http://127.0.0.1:5181"
$failures = @()

function Test-HttpOk {
  param(
    [string]$Label,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      Write-Host "[OK] $Label -> $($response.StatusCode)"
      return $true
    }
    $script:failures += "$Label returned $($response.StatusCode)"
    Write-Host "[FAIL] $Label -> $($response.StatusCode)"
    return $false
  } catch {
    $script:failures += "$Label unreachable: $($_.Exception.Message)"
    Write-Host "[FAIL] $Label -> $($_.Exception.Message)"
    return $false
  }
}

function Test-CorsOrigin {
  param(
    [string]$Label,
    [string]$Origin
  )

  try {
    $response = Invoke-WebRequest -Uri "$apiBase/api/user/login" -Method Options -Headers @{
      Origin = $Origin
      "Access-Control-Request-Method" = "POST"
    } -UseBasicParsing -TimeoutSec 10

    $allowed = $response.Headers["Access-Control-Allow-Origin"]
    if ($allowed -eq $Origin) {
      Write-Host "[OK] CORS $Label -> $allowed"
      return $true
    }

    $script:failures += "CORS $Label expected $Origin but got $allowed"
    Write-Host "[FAIL] CORS $Label expected $Origin but got $allowed"
    return $false
  } catch {
    $script:failures += "CORS $Label failed: $($_.Exception.Message)"
    Write-Host "[FAIL] CORS $Label -> $($_.Exception.Message)"
    return $false
  }
}

Write-Host "Local stack health check"
Write-Host "========================"

Test-HttpOk -Label "API health" -Url "$apiBase/api/health" | Out-Null
Test-HttpOk -Label "Admin web" -Url "$adminOrigin/" | Out-Null
Test-HttpOk -Label "User web" -Url "$userOrigin/" | Out-Null
Test-HttpOk -Label "Gateway health" -Url "http://127.0.0.1:18001/health" | Out-Null
Test-CorsOrigin -Label "admin origin" -Origin $adminOrigin | Out-Null
Test-CorsOrigin -Label "user origin" -Origin $userOrigin | Out-Null

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "All checks passed."
  exit 0
}

Write-Host "Checks failed:"
foreach ($item in $failures) {
  Write-Host " - $item"
}
exit 1
