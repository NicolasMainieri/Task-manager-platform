@echo off
echo ========================================
echo Building Planora for XAMPP Deployment
echo ========================================
echo.

REM Step 1: Build Backend
echo [1/4] Building Backend...
cd backend
call npm install
call npx tsc
if errorlevel 1 (
    echo ERROR: Backend build failed!
    pause
    exit /b 1
)
echo Backend build completed!
echo.

REM Step 2: Generate Prisma Client
echo [2/4] Generating Prisma Client for MySQL...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)
echo Prisma Client generated!
echo.

REM Step 3: Build Frontend
echo [3/4] Building Frontend...
cd ..\frontend

REM Backup current api.ts and use XAMPP version
if exist src\config\api.ts.backup del src\config\api.ts.backup
copy src\config\api.ts src\config\api.ts.backup
copy src\config\api.xampp.ts src\config\api.ts

call npm install
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    REM Restore backup
    copy src\config\api.ts.backup src\config\api.ts
    pause
    exit /b 1
)

REM Restore original api.ts
copy src\config\api.ts.backup src\config\api.ts
del src\config\api.ts.backup

echo Frontend build completed!
echo.

REM Step 4: Create deployment package
echo [4/4] Creating deployment package...
cd ..

if not exist "xampp-deploy" mkdir xampp-deploy
if not exist "xampp-deploy\frontend" mkdir xampp-deploy\frontend
if not exist "xampp-deploy\backend" mkdir xampp-deploy\backend

REM Copy frontend build
echo Copying frontend files...
xcopy /E /I /Y frontend\dist\* xampp-deploy\frontend\
copy /Y frontend\.htaccess xampp-deploy\frontend\

REM Copy backend files
echo Copying backend files...
xcopy /E /I /Y backend\dist\* xampp-deploy\backend\dist\
xcopy /E /I /Y backend\prisma\* xampp-deploy\backend\prisma\
copy /Y backend\package.json xampp-deploy\backend\
copy /Y backend\package-lock.json xampp-deploy\backend\
copy /Y backend\.env.xampp xampp-deploy\backend\.env.example
copy /Y backend\.htaccess xampp-deploy\backend\

REM Copy uploads directory structure
if not exist "xampp-deploy\backend\uploads" mkdir xampp-deploy\backend\uploads
if not exist "xampp-deploy\backend\uploads\documents" mkdir xampp-deploy\backend\uploads\documents
if not exist "xampp-deploy\backend\uploads\preventivi" mkdir xampp-deploy\backend\uploads\preventivi

echo.
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Deployment files are in: xampp-deploy\
echo.
echo NEXT STEPS:
echo 1. Carica la cartella 'xampp-deploy\frontend' su: www.licenzeoriginali.com/planora/
echo 2. Carica la cartella 'xampp-deploy\backend' su: www.licenzeoriginali.com/planora-api/
echo 3. Nel server, vai in planora-api e:
echo    - Copia .env.example come .env
echo    - Modifica .env con le credenziali MySQL
echo    - Esegui: npm install --production
echo    - Esegui: npx prisma migrate deploy
echo    - Avvia il server con PM2 o node-windows
echo.
echo Leggi XAMPP-DEPLOYMENT-GUIDE.md per istruzioni dettagliate
echo.
pause
