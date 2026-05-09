# ============================================================
#  CHOCO BERRY — Full Auto Setup Script (PowerShell)
#  Installs PostgreSQL 16, creates DB, migrates, starts API
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  CHOCO BERRY API — Auto Setup" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# -- Step 1: Check if PostgreSQL is already running ----------------
$pgRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect('127.0.0.1', 5432)
    $tcp.Close()
    $pgRunning = $true
    Write-Host "[OK] PostgreSQL is already running on port 5432" -ForegroundColor Green
} catch {
    Write-Host "[!] PostgreSQL is not running." -ForegroundColor Yellow
}

# -- Step 2: Install PostgreSQL if not running ---------------------
if (-not $pgRunning) {
    Write-Host ""
    Write-Host "Checking winget availability..." -ForegroundColor Yellow
    $winget = Get-Command winget -ErrorAction SilentlyContinue

    if ($winget) {
        Write-Host "Installing PostgreSQL 16 via winget..." -ForegroundColor Yellow
        winget install --id PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements

        # Wait for service to start
        Write-Host "Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15

        # Try to start service
        $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($pgService) {
            if ($pgService.Status -ne 'Running') {
                Start-Service $pgService.Name
                Start-Sleep -Seconds 5
            }
            Write-Host "[OK] PostgreSQL service started: $($pgService.Name)" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "ERROR: winget not found. Please install PostgreSQL 16 manually." -ForegroundColor Red
        exit 1
    }
}

# -- Step 3: Create database --------------------------------------
Write-Host ""
Write-Host "Creating chocoberry database..." -ForegroundColor Yellow

$pgBin = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($pgBin) {
    $env:PGPASSWORD = "postgres"
    & "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE chocoberry;" 2>$null
    & "$pgBin\psql.exe" -U postgres -c "SELECT 1;" -d chocoberry 2>$null
    if ($?) {
        Write-Host "[OK] Database chocoberry ready" -ForegroundColor Green
    }
} else {
    Write-Host "[!] psql not found — check if PostgreSQL is installed correctly" -ForegroundColor Yellow
}

# -- Step 4: Run Prisma migration ---------------------------------
Write-Host ""
Write-Host "Running database migration..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "migrate deploy failed, trying migrate dev..." -ForegroundColor Yellow
    npx prisma migrate dev --name init 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Migration failed!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] Migration complete" -ForegroundColor Green

# -- Step 5: Generate Prisma client -------------------------------
Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate 2>&1
Write-Host "[OK] Prisma client generated" -ForegroundColor Green

# -- Step 6: Build -------------------------------------------------
Write-Host ""
Write-Host "Building application..." -ForegroundColor Yellow
npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build successful" -ForegroundColor Green

# -- Step 7: Start API ---------------------------------------------
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Starting Choco Berry API..." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  API:    http://localhost:3000/api/v1" -ForegroundColor White
Write-Host "  Docs:   http://localhost:3000/api/docs" -ForegroundColor White
Write-Host ""

node dist/main.js
