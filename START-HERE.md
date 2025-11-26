# 🚀 START HERE - Deployment XAMPP per Planora

## 👋 Benvenuto!

Questa guida ti aiuterà a deployare Planora su www.licenzeoriginali.com/planora con XAMPP e MySQL.

**Tutto è già configurato!** Devi solo seguire questi passi.

---

## 📦 PRIMA DI INIZIARE: Hai XAMPP Installato?

### ❌ Non hai ancora XAMPP?

**Leggi prima questa guida**: 👉 **[XAMPP-INSTALLATION-GUIDE.md](XAMPP-INSTALLATION-GUIDE.md)** 👈

Questa guida ti spiega:
- ✅ Quale versione di XAMPP scaricare (8.2.x)
- ✅ Come installare XAMPP passo-passo (con screenshot)
- ✅ Come configurare Apache e MySQL
- ✅ Come creare il database
- ✅ Come risolvere problemi comuni (porta 80 occupata, ecc.)

**Tempo**: 15-20 minuti

### ✅ Hai già XAMPP installato?

Perfetto! Assicurati che:
- [x] Apache sia attivo (verde nel Control Panel)
- [x] MySQL sia attivo (verde nel Control Panel)
- [x] phpMyAdmin sia accessibile (`http://localhost/phpmyadmin`)

**Continua con il Quick Start qui sotto** ⬇️

---

## ⚡ Quick Start (5 minuti)

### 1️⃣ Verifica Prerequisiti

```bash
check-prerequisites.bat
```

Se tutto è ✅, vai al passo 2.
Se ci sono ❌, installa ciò che manca:
- [Node.js](https://nodejs.org/) (v18+)
- npm (incluso con Node.js)

### 2️⃣ Build del Progetto

```bash
build-for-xampp.bat
```

Questo script:
- Compila il backend
- Builda il frontend
- Crea la cartella `xampp-deploy/` con tutto pronto

### 3️⃣ Crea Database MySQL

1. Apri phpMyAdmin: `http://tuoserver/phpmyadmin`
2. Crea database: `planora_db`
3. Annota username e password MySQL

### 4️⃣ Upload File

Con FileZilla:
- **Frontend**: `xampp-deploy/frontend/*` → `/htdocs/planora/`
- **Backend**: `xampp-deploy/backend/*` → `/htdocs/planora-api/`

### 5️⃣ Configura e Avvia

Sul server:
```bash
cd /htdocs/planora-api
cp .env.example .env
nano .env  # Modifica con le tue credenziali
npm install --production
npx prisma generate
npx prisma migrate deploy
npm install -g pm2
pm2 start dist/index.js --name planora-api
pm2 startup && pm2 save
```

**FATTO!** 🎉

Testa su: `https://www.licenzeoriginali.com/planora`

---

## 📚 Documentazione Completa

Hai bisogno di più dettagli? Leggi:

| Documento | Per cosa |
|-----------|----------|
| 📖 [README-XAMPP.md](README-XAMPP.md) | Overview completo |
| ⚡ [QUICK-START-XAMPP.md](QUICK-START-XAMPP.md) | Passi essenziali |
| 📋 [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) | Checklist completa |
| 📕 [XAMPP-DEPLOYMENT-GUIDE.md](XAMPP-DEPLOYMENT-GUIDE.md) | Guida dettagliata |
| ❓ [FAQ-XAMPP.md](FAQ-XAMPP.md) | Problemi comuni |
| 📁 [FILES-SUMMARY.md](FILES-SUMMARY.md) | File creati/modificati |

---

## 🔧 File Importanti Creati

### Script di Build
- ✅ `build-for-xampp.bat` - Build automatico (Windows)
- ✅ `build-for-xampp.sh` - Build automatico (Linux/Mac)
- ✅ `check-prerequisites.bat` - Verifica prerequisiti

### Configurazioni
- ✅ `backend/.env.xampp` - Template environment variables
- ✅ `backend/.htaccess` - Config Apache backend
- ✅ `frontend/.htaccess` - Config Apache frontend
- ✅ `apache-config-example.conf` - VirtualHost di esempio

### Database
- ✅ `backend/test-db-connection.js` - Test connessione MySQL
- ✅ `backend/prisma/init-roles.sql` - Inizializza ruoli

---

## ⚙️ Cosa è Stato Modificato

### 1. Prisma Schema
✏️ Cambiato da PostgreSQL a MySQL:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### 2. Vite Config
✏️ Configurato per percorso `/planora/`:
```typescript
export default defineConfig({
  base: '/planora/',
  // ... altre config
})
```

### 3. Backend CORS
✏️ Aggiunti domini licenzeoriginali.com

### 4. Package.json
✏️ Aggiunto:
- Dipendenza `mysql2`
- Script `test:db`

---

## 🎯 Cosa Devi Fare TU

### Prima del Build (sul tuo PC):

1. ✅ Esegui `check-prerequisites.bat`
2. ✅ Verifica che non ci siano errori
3. ✅ Esegui `build-for-xampp.bat`
4. ✅ Aspetta che finisca (5-10 minuti)

### Sul Server:

1. ✅ Crea database `planora_db` in phpMyAdmin
2. ✅ Carica file con FileZilla
3. ✅ Configura `.env` (copia da `.env.example`)
4. ✅ Installa dipendenze: `npm install --production`
5. ✅ Esegui migrazioni: `npx prisma migrate deploy`
6. ✅ Avvia con PM2: `pm2 start dist/index.js --name planora-api`

---

## 🔐 Configurazione .env

Nel file `.env` sul server, modifica questi valori:

```env
# Database MySQL
DATABASE_URL="mysql://root:PASSWORD@localhost:3306/planora_db"
                     ↑         ↑
                  username   password

# Frontend URL
FRONTEND_URL=https://www.licenzeoriginali.com/planora

# JWT Secret (IMPORTANTE: cambia questo!)
JWT_SECRET=GENERA_UNA_STRINGA_RANDOM_SICURA_32_CARATTERI_MINIMO
```

Per generare `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Verifica Finale

Dopo il deployment, testa:

### Frontend
```
https://www.licenzeoriginali.com/planora
```
✅ Pagina si carica
✅ Nessun errore 404
✅ CSS e JS caricati

### Backend
```
https://www.licenzeoriginali.com/planora-api/api/health
```
✅ Risposta: `{"status":"ok",...}`

### Login
```
https://www.licenzeoriginali.com/planora
```
✅ Registrazione funziona
✅ Login funziona
✅ Dashboard si carica

---

## 🆘 Problemi?

### Frontend non si carica
👉 Vedi [FAQ-XAMPP.md](FAQ-XAMPP.md#q-la-pagina-mostra-404-not-found)

### Backend non risponde
```bash
pm2 logs planora-api
```

### Errori database
```bash
cd /htdocs/planora-api
npm run test:db
```

### Altri problemi
📖 Consulta [FAQ-XAMPP.md](FAQ-XAMPP.md) - ha tutte le risposte!

---

## 📞 Hai Bisogno di Aiuto?

1. **Prima**: Leggi [FAQ-XAMPP.md](FAQ-XAMPP.md)
2. **Poi**: Controlla [XAMPP-DEPLOYMENT-GUIDE.md](XAMPP-DEPLOYMENT-GUIDE.md)
3. **Infine**: Controlla i log:
   - Browser: F12 > Console
   - Backend: `pm2 logs planora-api`
   - Apache: `/var/log/apache2/error.log`

---

## 🎉 Prossimi Step

Dopo il deployment riuscito:

1. ✅ Testa tutte le funzionalità
2. ✅ Configura backup automatici database
3. ✅ Configura SSL/HTTPS (Let's Encrypt)
4. ✅ Ottimizza performance (cache, CDN)
5. ✅ Configura monitoring (Uptime Robot)

---

## 📊 Workflow Visivo

```
[Sviluppo Locale]
        ↓
[check-prerequisites.bat] ✅
        ↓
[build-for-xampp.bat] ✅
        ↓
[Cartella xampp-deploy/ creata] ✅
        ↓
[Upload via FileZilla] 📤
        ↓
[Configura .env] ⚙️
        ↓
[npm install + prisma migrate] 🗄️
        ↓
[pm2 start] 🚀
        ↓
[Test & Verifica] ✅
        ↓
[DEPLOYMENT COMPLETO!] 🎉
```

---

## 🔑 Comandi Rapidi di Riferimento

### Sul tuo PC (Windows)
```bash
# Verifica prerequisiti
check-prerequisites.bat

# Build progetto
build-for-xampp.bat
```

### Sul Server
```bash
# Vai nella cartella backend
cd /htdocs/planora-api

# Configura environment
cp .env.example .env
nano .env

# Test database
npm run test:db

# Installa dipendenze
npm install --production

# Prisma
npx prisma generate
npx prisma migrate deploy

# Avvia backend
pm2 start dist/index.js --name planora-api
pm2 startup
pm2 save

# Comandi utili PM2
pm2 status
pm2 logs planora-api
pm2 restart planora-api
pm2 stop planora-api
```

---

## 📦 Dimensioni Deployment

Aspettati questi tempi di upload (dipende dalla tua connessione):

- Frontend: ~50MB → 5-10 minuti
- Backend: ~150MB con node_modules → 15-20 minuti

**CONSIGLIO**: Non caricare `node_modules/`. Carica solo il codice e fai `npm install` sul server.

---

## ✨ Caratteristiche Deployment

✅ Frontend ottimizzato con Vite
✅ Backend compilato con TypeScript
✅ Database MySQL configurato
✅ CORS configurato
✅ .htaccess per Apache
✅ PM2 per process management
✅ Reverse proxy Apache pronto
✅ SSL/HTTPS ready
✅ Compression abilitata
✅ Cache configurata

---

## 🏁 Ready to Deploy?

**Inizia qui**: `check-prerequisites.bat`

Poi segui [QUICK-START-XAMPP.md](QUICK-START-XAMPP.md)

---

**Buon deployment! 🚀**

Se hai domande, consulta [FAQ-XAMPP.md](FAQ-XAMPP.md) o [XAMPP-DEPLOYMENT-GUIDE.md](XAMPP-DEPLOYMENT-GUIDE.md)
