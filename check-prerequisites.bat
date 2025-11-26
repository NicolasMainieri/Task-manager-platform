@echo off
echo ========================================
echo Planora - Check Prerequisites
echo ========================================
echo.

set ERROR_COUNT=0

REM Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js NOT found!
    echo    Download from: https://nodejs.org/
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js found: %NODE_VERSION%
)
echo.

REM Check npm
echo [2/4] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm NOT found!
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ npm found: v%NPM_VERSION%
)
echo.

REM Check TypeScript
echo [3/4] Checking TypeScript...
npx tsc --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  TypeScript NOT found globally
    echo    Will be installed via npm install
) else (
    for /f "tokens=*" %%i in ('npx tsc --version') do set TS_VERSION=%%i
    echo ✅ TypeScript found: %TS_VERSION%
)
echo.

REM Check Git (opzionale)
echo [4/4] Checking Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Git NOT found (optional)
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo ✅ Git found: %GIT_VERSION%
)
echo.

REM Check project structure
echo ========================================
echo Checking Project Structure...
echo ========================================
echo.

if exist "backend\package.json" (
    echo ✅ Backend package.json found
) else (
    echo ❌ Backend package.json NOT found!
    set /a ERROR_COUNT+=1
)

if exist "frontend\package.json" (
    echo ✅ Frontend package.json found
) else (
    echo ❌ Frontend package.json NOT found!
    set /a ERROR_COUNT+=1
)

if exist "backend\prisma\schema.prisma" (
    echo ✅ Prisma schema found
) else (
    echo ❌ Prisma schema NOT found!
    set /a ERROR_COUNT+=1
)
echo.

REM Check if dependencies are installed
echo ========================================
echo Checking Dependencies...
echo ========================================
echo.

if exist "backend\node_modules" (
    echo ✅ Backend dependencies installed
) else (
    echo ⚠️  Backend dependencies NOT installed
    echo    Run: cd backend ^&^& npm install
)

if exist "frontend\node_modules" (
    echo ✅ Frontend dependencies installed
) else (
    echo ⚠️  Frontend dependencies NOT installed
    echo    Run: cd frontend ^&^& npm install
)
echo.

REM Summary
echo ========================================
echo Summary
echo ========================================
echo.

if %ERROR_COUNT% EQU 0 (
    echo ✅ All critical prerequisites are met!
    echo.
    echo You can now run:
    echo   build-for-xampp.bat
    echo.
) else (
    echo ❌ Found %ERROR_COUNT% critical error(s)
    echo.
    echo Please fix the errors above before building.
    echo.
)

echo Press any key to exit...
pause >nul
