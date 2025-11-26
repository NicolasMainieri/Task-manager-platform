# Quick Start - Deployment XAMPP

Guida rapida per deployare Planora su XAMPP in 5 passi.

## 1. Build sul tuo PC

```bash
# Windows
build-for-xampp.bat

# Linux/Mac
chmod +x build-for-xampp.sh
./build-for-xampp.sh
```

Questo crea la cartella `xampp-deploy/` con tutto pronto.

## 2. Crea Database MySQL

1. Apri phpMyAdmin: `http://tuoserver/phpmyadmin`
2. Crea database `planora_db`
3. Annota username e password

## 3. Upload con FileZilla

- **Frontend**: carica `xampp-deploy/frontend/*` in `/htdocs/planora/`
- **Backend**: carica `xampp-deploy/backend/*` in `/htdocs/planora-api/`

## 4. Configura il Backend

Nel server, vai in `/htdocs/planora-api/`:

```bash
# Copia e modifica .env
cp .env.example .env
nano .env

# Modifica questa riga con le tue credenziali MySQL:
DATABASE_URL="mysql://root:password@localhost:3306/planora_db"

# Installa dipendenze
npm install --production

# Esegui migrazioni
npx prisma generate
npx prisma migrate deploy
```

## 5. Avvia il Backend

```bash
# Installa PM2
npm install -g pm2

# Avvia il server
pm2 start dist/index.js --name planora-api

# Configura auto-start
pm2 startup
pm2 save
```

## Verifica

- Frontend: `https://www.licenzeoriginali.com/planora`
- Backend: `https://www.licenzeoriginali.com/planora-api/api/health`

---

Per la guida completa e troubleshooting: **XAMPP-DEPLOYMENT-GUIDE.md**
