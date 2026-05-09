@echo off
echo ============================================================
echo  CHOCO BERRY — Database Setup Script
echo ============================================================
echo.

:: Check PostgreSQL connection
echo [1/4] Checking database connection...
npx prisma db execute --stdin < nul 2>nul
npx prisma migrate dev --name init 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Migration failed. Make sure PostgreSQL is running:
    echo   Host: localhost
    echo   Port: 5432
    echo   DB:   chocoberry
    echo   User: postgres
    echo   Pass: postgres
    echo.
    echo  Start PostgreSQL, then run this script again.
    pause
    exit /b 1
)

echo [2/4] Generating Prisma client...
npx prisma generate

echo [3/4] Building application...
npm run build

echo [4/4] Done!
echo.
echo  Start the server with:
echo    npm run start:prod
echo  Or dev mode:
echo    npm run start:dev
echo.
echo  Swagger docs: http://localhost:3000/api/docs
pause
