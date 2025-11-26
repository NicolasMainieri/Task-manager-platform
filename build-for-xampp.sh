#!/bin/bash

echo "========================================"
echo "Building Planora for XAMPP Deployment"
echo "========================================"
echo ""

# Step 1: Build Backend
echo "[1/4] Building Backend..."
cd backend
npm install
npx tsc
if [ $? -ne 0 ]; then
    echo "ERROR: Backend build failed!"
    exit 1
fi
echo "Backend build completed!"
echo ""

# Step 2: Generate Prisma Client
echo "[2/4] Generating Prisma Client for MySQL..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "ERROR: Prisma generate failed!"
    exit 1
fi
echo "Prisma Client generated!"
echo ""

# Step 3: Build Frontend
echo "[3/4] Building Frontend..."
cd ../frontend

# Backup current api.ts and use XAMPP version
cp src/config/api.ts src/config/api.ts.backup
cp src/config/api.xampp.ts src/config/api.ts

npm install
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed!"
    # Restore backup
    cp src/config/api.ts.backup src/config/api.ts
    rm src/config/api.ts.backup
    exit 1
fi

# Restore original api.ts
cp src/config/api.ts.backup src/config/api.ts
rm src/config/api.ts.backup

echo "Frontend build completed!"
echo ""

# Step 4: Create deployment package
echo "[4/4] Creating deployment package..."
cd ..

mkdir -p xampp-deploy/frontend
mkdir -p xampp-deploy/backend

# Copy frontend build
echo "Copying frontend files..."
cp -r frontend/dist/* xampp-deploy/frontend/
cp frontend/.htaccess xampp-deploy/frontend/

# Copy backend files
echo "Copying backend files..."
cp -r backend/dist/* xampp-deploy/backend/
cp -r backend/prisma xampp-deploy/backend/
cp backend/package.json xampp-deploy/backend/
cp backend/package-lock.json xampp-deploy/backend/
cp backend/.env.xampp xampp-deploy/backend/.env.example
cp backend/.htaccess xampp-deploy/backend/

# Copy uploads directory structure
mkdir -p xampp-deploy/backend/uploads/documents
mkdir -p xampp-deploy/backend/uploads/preventivi

echo ""
echo "========================================"
echo "BUILD COMPLETED SUCCESSFULLY!"
echo "========================================"
echo ""
echo "Deployment files are in: xampp-deploy/"
echo ""
echo "NEXT STEPS:"
echo "1. Upload 'xampp-deploy/frontend' to: www.licenzeoriginali.com/planora/"
echo "2. Upload 'xampp-deploy/backend' to: www.licenzeoriginali.com/planora-api/"
echo "3. On server, go to planora-api and:"
echo "   - Copy .env.example to .env"
echo "   - Edit .env with MySQL credentials"
echo "   - Run: npm install --production"
echo "   - Run: npx prisma migrate deploy"
echo "   - Start server with PM2 or node-windows"
echo ""
echo "Read XAMPP-DEPLOYMENT-GUIDE.md for detailed instructions"
echo ""
