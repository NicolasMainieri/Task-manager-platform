@echo off
echo ========================================
echo Planora - Verify XAMPP Setup
echo ========================================
echo.

set ERROR_COUNT=0
set WARNING_COUNT=0

echo [1/10] Checking documentation files...
if exist "START-HERE.md" (
    echo ✅ START-HERE.md found
) else (
    echo ❌ START-HERE.md missing!
    set /a ERROR_COUNT+=1
)

if exist "QUICK-START-XAMPP.md" (
    echo ✅ QUICK-START-XAMPP.md found
) else (
    echo ❌ QUICK-START-XAMPP.md missing!
    set /a ERROR_COUNT+=1
)

if exist "XAMPP-DEPLOYMENT-GUIDE.md" (
    echo ✅ XAMPP-DEPLOYMENT-GUIDE.md found
) else (
    echo ❌ XAMPP-DEPLOYMENT-GUIDE.md missing!
    set /a ERROR_COUNT+=1
)
echo.

echo [2/10] Checking build scripts...
if exist "build-for-xampp.bat" (
    echo ✅ build-for-xampp.bat found
) else (
    echo ❌ build-for-xampp.bat missing!
    set /a ERROR_COUNT+=1
)

if exist "check-prerequisites.bat" (
    echo ✅ check-prerequisites.bat found
) else (
    echo ❌ check-prerequisites.bat missing!
    set /a ERROR_COUNT+=1
)
echo.

echo [3/10] Checking backend configuration...
if exist "backend\prisma\schema.prisma" (
    echo ✅ Prisma schema found
) else (
    echo ❌ Prisma schema missing!
    set /a ERROR_COUNT+=1
)

if exist "backend\.env.xampp" (
    echo ✅ .env.xampp template found
) else (
    echo ❌ .env.xampp template missing!
    set /a ERROR_COUNT+=1
)

if exist "backend\.htaccess" (
    echo ✅ Backend .htaccess found
) else (
    echo ❌ Backend .htaccess missing!
    set /a ERROR_COUNT+=1
)

if exist "backend\test-db-connection.js" (
    echo ✅ Database test script found
) else (
    echo ❌ Database test script missing!
    set /a ERROR_COUNT+=1
)
echo.

echo [4/10] Checking frontend configuration...
if exist "frontend\vite.config.ts" (
    echo ✅ Vite config found
) else (
    echo ❌ Vite config missing!
    set /a ERROR_COUNT+=1
)

if exist "frontend\.htaccess" (
    echo ✅ Frontend .htaccess found
) else (
    echo ❌ Frontend .htaccess missing!
    set /a ERROR_COUNT+=1
)

if exist "frontend\src\config\api.xampp.ts" (
    echo ✅ API config template found
) else (
    echo ❌ API config template missing!
    set /a ERROR_COUNT+=1
)
echo.

echo [5/10] Checking Apache configuration...
if exist "apache-config-example.conf" (
    echo ✅ Apache VirtualHost example found
) else (
    echo ⚠️  Apache VirtualHost example missing (optional)
    set /a WARNING_COUNT+=1
)
echo.

echo [6/10] Checking backend dependencies...
if exist "backend\package.json" (
    echo ✅ Backend package.json found
    findstr /C:"mysql2" backend\package.json >nul 2>&1
    if errorlevel 1 (
        echo ❌ mysql2 dependency not found in package.json!
        set /a ERROR_COUNT+=1
    ) else (
        echo ✅ mysql2 dependency configured
    )
) else (
    echo ❌ Backend package.json missing!
    set /a ERROR_COUNT+=1
)
echo.

echo [7/10] Checking frontend dependencies...
if exist "frontend\package.json" (
    echo ✅ Frontend package.json found
) else (
    echo ❌ Frontend package.json missing!
    set /a ERROR_COUNT+=1
)
echo.

echo [8/10] Checking Prisma configuration...
findstr /C:"mysql" backend\prisma\schema.prisma >nul 2>&1
if errorlevel 1 (
    echo ❌ Prisma NOT configured for MySQL!
    echo    Expected: provider = "mysql"
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Prisma configured for MySQL
)

if exist "backend\prisma\init-roles.sql" (
    echo ✅ Init roles SQL script found
) else (
    echo ⚠️  Init roles SQL script missing (optional)
    set /a WARNING_COUNT+=1
)
echo.

echo [9/10] Checking .gitignore...
if exist ".gitignore" (
    echo ✅ .gitignore found
    findstr /C:"xampp-deploy" .gitignore >nul 2>&1
    if errorlevel 1 (
        echo ⚠️  xampp-deploy not in .gitignore
        set /a WARNING_COUNT+=1
    ) else (
        echo ✅ xampp-deploy ignored
    )
) else (
    echo ⚠️  .gitignore missing
    set /a WARNING_COUNT+=1
)
echo.

echo [10/10] Checking project structure...
if exist "backend\src\index.ts" (
    echo ✅ Backend source found
) else (
    echo ❌ Backend source missing!
    set /a ERROR_COUNT+=1
)

if exist "frontend\src" (
    echo ✅ Frontend source found
) else (
    echo ❌ Frontend source missing!
    set /a ERROR_COUNT+=1
)
echo.

echo ========================================
echo Verification Summary
echo ========================================
echo.

if %ERROR_COUNT% EQU 0 (
    if %WARNING_COUNT% EQU 0 (
        echo ✅ PERFECT! All checks passed!
        echo    Your project is ready for XAMPP deployment.
        echo.
        echo Next steps:
        echo   1. Run: check-prerequisites.bat
        echo   2. Run: build-for-xampp.bat
        echo   3. Follow: QUICK-START-XAMPP.md
    ) else (
        echo ✅ GOOD! All critical checks passed.
        echo ⚠️  Found %WARNING_COUNT% warning(s) (non-critical).
        echo    Your project is ready for XAMPP deployment.
        echo.
        echo Next steps:
        echo   1. Run: check-prerequisites.bat
        echo   2. Run: build-for-xampp.bat
        echo   3. Follow: QUICK-START-XAMPP.md
    )
) else (
    echo ❌ ERRORS FOUND: %ERROR_COUNT% critical error(s)
    if %WARNING_COUNT% GTR 0 (
        echo ⚠️  WARNINGS: %WARNING_COUNT% warning(s)
    )
    echo.
    echo Please fix the errors above before proceeding.
    echo.
    echo Possible causes:
    echo   - Files were deleted or moved
    echo   - Configuration was modified incorrectly
    echo   - Project structure was changed
    echo.
    echo To restore configuration, check:
    echo   CONFIGURATION-SUMMARY.md
    echo   FILES-SUMMARY.md
)

echo.
echo ========================================
echo.

if %ERROR_COUNT% EQU 0 (
    echo 📚 Documentation available:
    echo    - START-HERE.md (read this first!)
    echo    - QUICK-START-XAMPP.md
    echo    - XAMPP-DEPLOYMENT-GUIDE.md
    echo    - FAQ-XAMPP.md
    echo    - DOCUMENTATION-INDEX.md (full index)
    echo.
)

pause
