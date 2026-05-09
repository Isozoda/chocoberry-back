@echo off
echo ========================================
echo  CHOCO BERRY API — Startup Script
echo ========================================
echo.

:: Check if postgres is running
netstat -an | findstr :5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] PostgreSQL is NOT running on port 5432.
    echo     Please start PostgreSQL first:
    echo     - If using pgAdmin: Start PostgreSQL service
    echo     - If using Docker:  docker-compose up -d postgres
    echo.
    pause
    exit /b 1
)

echo [OK] PostgreSQL detected on port 5432
echo.

:: Run migrations
echo Running Prisma migrations...
call npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo [!] Migration failed. Trying migrate dev...
    call npx prisma migrate dev --name init
)

echo.
echo Starting Choco Berry API...
echo API:    http://localhost:3000
echo Docs:   http://localhost:3000/api/docs
echo.
call node dist/main.js
