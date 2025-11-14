$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$cf = Join-Path $root 'cloudflared.exe'
$log = Join-Path $root 'cf.log'

if (-not (Test-Path $cf)) {
  Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cf
}

if (Test-Path $log) { Remove-Item $log -Force }

$cfArgs = @('tunnel','--url','http://localhost:5050','--logfile',$log)
$cfProc = Start-Process -FilePath $cf -ArgumentList $cfArgs -NoNewWindow -PassThru

$deadline = (Get-Date).AddSeconds(30)
$publicUrl = $null
$regex = 'https://[a-z0-9.-]+\.trycloudflare\.com'
while ((Get-Date) -lt $deadline) {
  if (Test-Path $log) {
    $content = Get-Content $log -Raw -ErrorAction SilentlyContinue
    if ($content) {
      $m = [regex]::Match($content, $regex)
      if ($m.Success) { $publicUrl = $m.Value; break }
    }
  }
  Start-Sleep -Milliseconds 500
}

if (-not $publicUrl) {
  Write-Host 'Could not detect tunnel URL. Check cf.log.' -ForegroundColor Yellow
  Exit 1
}

$envPath = Join-Path $root '.env'
if (-not (Test-Path $envPath)) { New-Item -Path $envPath -ItemType File -Force | Out-Null }
$lines = @()
if (Test-Path $envPath) { $lines = Get-Content $envPath -ErrorAction SilentlyContinue }
if (-not $lines) { $lines = @() }

$updated = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*EXPO_PUBLIC_LT_URL=') {
    $lines[$i] = "EXPO_PUBLIC_LT_URL=$publicUrl"
    $updated = $true
  }
}
if (-not $updated) { $lines += "EXPO_PUBLIC_LT_URL=$publicUrl" }

Set-Content -Path $envPath -Value $lines -Encoding UTF8

Write-Host "Tunnel URL: $publicUrl" -ForegroundColor Cyan
Write-Host "Starting Expo (cache clear)..." -ForegroundColor Green

Push-Location $root
try {
  npx expo start -c
}
finally {
  Pop-Location
}
