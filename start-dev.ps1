$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$cf = Join-Path $root 'cloudflared.exe'
$log = Join-Path $root 'cf.log'
$logBackend = Join-Path $root 'cf_backend.log'

if (-not (Test-Path $cf)) {
  Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cf
}

$existing = Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue
if ($existing) {
  try { $existing | Stop-Process -Force -ErrorAction Stop } catch { Write-Host "Warning: could not stop existing cloudflared: $($_.Exception.Message)" -ForegroundColor Yellow }
  Start-Sleep -Milliseconds 300
}

try {
  if (Test-Path $log) { Remove-Item $log -Force -ErrorAction Stop }
  if (Test-Path $logBackend) { Remove-Item $logBackend -Force -ErrorAction Stop }
}
catch {
  Write-Host 'Could not clear old log, it might be in use. Continuing...' -ForegroundColor Yellow
}

# Ensure local translator is reachable before proceeding
$ltReady = $false
$deadlineLt = (Get-Date).AddSeconds(30)
$ltApiKey = $null
$rootEnv = Join-Path $root '.env'
if (Test-Path $rootEnv) {
  $envText = Get-Content $rootEnv -Raw -ErrorAction SilentlyContinue
  if ($envText) {
    $m2 = [regex]::Match($envText, '(?m)^\s*EXPO_PUBLIC_LT_API_KEY\s*=\s*(.+)$')
    if ($m2.Success) { $ltApiKey = $m2.Groups[1].Value.Trim() }
    if (-not $ltApiKey) {
      $m2b = [regex]::Match($envText, '(?m)^\s*LT_API_KEY\s*=\s*(.+)$')
      if ($m2b.Success) { $ltApiKey = $m2b.Groups[1].Value.Trim() }
    }
  }
}
while ((Get-Date) -lt $deadlineLt) {
  try {
    $body = @{ q='ping'; source='en'; target='en'; format='text'; api_key=$ltApiKey }
    Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:5050/translate' -Body $body -TimeoutSec 3 -ErrorAction Stop | Out-Null
    $ltReady = $true; break
  } catch {}
  Start-Sleep -Milliseconds 500
}
if (-not $ltReady) {
  Write-Host 'Translator not reachable at http://127.0.0.1:5050. Please start LibreTranslate and re-run.' -ForegroundColor Yellow
  Exit 1
}

$cfArgs = @('tunnel','--url','http://127.0.0.1:5050','--logfile',$log)
Start-Process -FilePath $cf -ArgumentList $cfArgs -NoNewWindow

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

# Start FastAPI backend (uvicorn) with env from root .env if available
$rootEnv = Join-Path $root '.env'
$ltUrl = $null
$ltApiKey = $null
if (Test-Path $rootEnv) {
  $envText = Get-Content $rootEnv -Raw -ErrorAction SilentlyContinue
  if ($envText) {
    $m1 = [regex]::Match($envText, '(?m)^\s*EXPO_PUBLIC_LT_URL\s*=\s*(.+)$')
    if ($m1.Success) { $ltUrl = $m1.Groups[1].Value.Trim() }
    if (-not $ltUrl) {
      $m1b = [regex]::Match($envText, '(?m)^\s*LT_URL\s*=\s*(.+)$')
      if ($m1b.Success) { $ltUrl = $m1b.Groups[1].Value.Trim() }
    }

    $m2 = [regex]::Match($envText, '(?m)^\s*EXPO_PUBLIC_LT_API_KEY\s*=\s*(.+)$')
    if ($m2.Success) { $ltApiKey = $m2.Groups[1].Value.Trim() }
    if (-not $ltApiKey) {
      $m2b = [regex]::Match($envText, '(?m)^\s*LT_API_KEY\s*=\s*(.+)$')
      if ($m2b.Success) { $ltApiKey = $m2b.Groups[1].Value.Trim() }
    }
  }
}
# Backend should call the local translator directly; app uses the tunnel
$env:LT_URL = 'http://127.0.0.1:5050'
$env:EXPO_PUBLIC_LT_URL = $publicUrl
if ($ltApiKey) {
  $env:LT_API_KEY = $ltApiKey
  $env:EXPO_PUBLIC_LT_API_KEY = $ltApiKey
}

$backendPath = Join-Path $root 'backend\pdf_tools'
$venvPython = Join-Path $backendPath '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
  Push-Location $backendPath
  try {
    Write-Host 'Creating Python venv for backend...' -ForegroundColor Green
    python -m venv .venv
  } finally { Pop-Location }
}
$pythonExec = if (Test-Path $venvPython) { $venvPython } else { 'python' }

# Install backend dependencies if requirements file exists
$req1 = Join-Path $backendPath 'requirements.txt'
$req2 = Join-Path $backendPath 'requeriments.txt'
if (Test-Path $req1) {
  Start-Process -FilePath $pythonExec -ArgumentList @('-m','pip','install','-r',$req1) -NoNewWindow -Wait
} elseif (Test-Path $req2) {
  Start-Process -FilePath $pythonExec -ArgumentList @('-m','pip','install','-r',$req2) -NoNewWindow -Wait
}
$backendOutLog = Join-Path $backendPath 'uvicorn.out.log'
$backendErrLog = Join-Path $backendPath 'uvicorn.err.log'
if (Test-Path $backendOutLog) { Remove-Item $backendOutLog -Force -ErrorAction SilentlyContinue }
if (Test-Path $backendErrLog) { Remove-Item $backendErrLog -Force -ErrorAction SilentlyContinue }
Push-Location $backendPath
Start-Process -FilePath $pythonExec -ArgumentList @('-m','uvicorn','server:app','--host','127.0.0.1','--port','9000','--reload') -NoNewWindow -RedirectStandardOutput $backendOutLog -RedirectStandardError $backendErrLog
Pop-Location

# Wait until backend responds before starting its tunnel
$deadlineApi = (Get-Date).AddSeconds(60)
$backendUp = $false
while ((Get-Date) -lt $deadlineApi) {
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9000/docs' -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $backendUp = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}
if (-not $backendUp) {
  Write-Host "Backend failed to start. Check logs:" -ForegroundColor Yellow
  Write-Host "  $backendOutLog" -ForegroundColor Yellow
  Write-Host "  $backendErrLog" -ForegroundColor Yellow
}

if ($backendUp) {
  $cfArgsBackend = @('tunnel','--url','http://127.0.0.1:9000','--logfile',$logBackend)
  Start-Process -FilePath $cf -ArgumentList $cfArgsBackend -NoNewWindow

  $deadline2 = (Get-Date).AddSeconds(30)
  $pdfPublicUrl = $null
  while ((Get-Date) -lt $deadline2) {
    if (Test-Path $logBackend) {
      $content2 = Get-Content $logBackend -Raw -ErrorAction SilentlyContinue
      if ($content2) {
        $m2 = [regex]::Match($content2, $regex)
        if ($m2.Success) { $pdfPublicUrl = $m2.Value; break }
      }
    }
    Start-Sleep -Milliseconds 500
  }
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

$updated2 = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*EXPO_PUBLIC_PDF_BACKEND_URL=') {
    if ($pdfPublicUrl) { $lines[$i] = "EXPO_PUBLIC_PDF_BACKEND_URL=$pdfPublicUrl" }
    $updated2 = $true
  }
}
if (-not $updated2) {
  if ($pdfPublicUrl) { $lines += "EXPO_PUBLIC_PDF_BACKEND_URL=$pdfPublicUrl" }
}

Set-Content -Path $envPath -Value $lines -Encoding UTF8

Write-Host "Tunnel URL (LT): $publicUrl" -ForegroundColor Cyan
if ($pdfPublicUrl) { Write-Host "Tunnel URL (PDF backend): $pdfPublicUrl" -ForegroundColor Cyan }
Write-Host "Starting Expo (cache clear)..." -ForegroundColor Green

Push-Location $root
try {
  npx expo start -c
}
finally {
  Pop-Location
}
