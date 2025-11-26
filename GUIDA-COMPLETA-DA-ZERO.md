# 🎯 Guida Completa da Zero - Planora su XAMPP

Questa è la guida definitiva che parte da zero e ti porta fino al deployment completo di Planora su XAMPP.

**Tempo totale stimato**: 1-2 ore (la prima volta)

---

## 📋 Indice

1. [Prerequisiti](#1-prerequisiti)
2. [Installazione XAMPP](#2-installazione-xampp)
3. [Configurazione XAMPP](#3-configurazione-xampp)
4. [Preparazione Progetto (sul tuo PC)](#4-preparazione-progetto)
5. [Build del Progetto](#5-build-del-progetto)
6. [Upload File sul Server](#6-upload-file-sul-server)
7. [Configurazione Backend](#7-configurazione-backend)
8. [Avvio Applicazione](#8-avvio-applicazione)
9. [Test Finale](#9-test-finale)
10. [Cosa Fare se Qualcosa Non Funziona](#10-troubleshooting)

---

## 1. Prerequisiti

### Sul Tuo PC di Sviluppo

Assicurati di avere:

- [ ] **Windows 10/11** (o Linux/macOS)
- [ ] **Node.js 18+** - [Scarica qui](https://nodejs.org/)
  - Verifica: `node --version` (deve essere ≥ 18)
- [ ] **npm** (incluso con Node.js)
  - Verifica: `npm --version`
- [ ] **FileZilla** - [Scarica qui](https://filezilla-project.org/)
  - Per caricare file sul server
- [ ] **Editor di testo** (VS Code, Notepad++, ecc.)

### Sul Server (dove installerai XAMPP)

- [ ] **Windows Server** o **PC Windows** con:
  - Almeno 2GB RAM libera
  - 5GB spazio disco
  - Permessi amministratore
- [ ] **Connessione internet**
- [ ] **Accesso al server** (desktop remoto o fisico)

### Informazioni da Avere Pronte

- [ ] Dominio: `www.licenzeoriginali.com`
- [ ] Accesso FTP/SFTP al server
- [ ] Credenziali server

---

## 2. Installazione XAMPP

### Step 2.1: Download XAMPP

1. Sul **server**, apri browser
2. Vai su: https://www.apachefriends.org/download.html
3. Scarica: **XAMPP for Windows 8.2.12** (o versione più recente)
4. File: `xampp-windows-x64-8.2.12-0-VS16-installer.exe` (~150MB)
5. **Attendi il download** (5-10 minuti)

### Step 2.2: Avvia Installer

1. Fai doppio click sul file scaricato
2. Windows chiederà: "Vuoi consentire modifiche?" → **Sì**
3. Se appare warning UAC → **OK**

### Step 2.3: Seleziona Componenti

Seleziona **SOLO** questi componenti:

```
✅ Apache
✅ MySQL
✅ PHP
✅ phpMyAdmin
❌ Perl (deseleziona)
❌ Tomcat (deseleziona)
❌ Webalizer (deseleziona)
❌ Fake Sendmail (deseleziona)
❌ Mercury (deseleziona)
❌ FileZilla FTP (deseleziona)
```

Clicca **Next**

### Step 2.4: Scegli Cartella

- Cartella consigliata: `C:\xampp`
- **Non usare cartelle con spazi!**
- Clicca **Next**

### Step 2.5: Installa

1. Deseleziona "Learn more about Bitnami"
2. Clicca **Next**
3. Clicca **Next** per iniziare installazione
4. **Attendi 5-10 minuti**

### Step 2.6: Firewall

**IMPORTANTE**: Quando Windows Firewall chiede permessi:

```
Windows Defender Firewall ha bloccato alcune funzionalità di Apache HTTP Server
```

- ✅ Seleziona: **Reti private**
- ✅ Seleziona: **Reti pubbliche** (opzionale)
- Clicca: **Consenti accesso**

Ripeti per MySQL se richiesto.

### Step 2.7: Completa

1. Seleziona "Do you want to start the Control Panel now?"
2. Clicca **Finish**

**✅ XAMPP è installato!**

---

## 3. Configurazione XAMPP

### Step 3.1: Apri XAMPP Control Panel

Se non si è aperto:
- Vai su `C:\xampp\`
- Doppio click su `xampp-control.exe`
- Dai permessi admin se richiesto

### Step 3.2: Avvia Apache

1. Nel Control Panel, clicca **Start** accanto ad **Apache**
2. Attendi 5 secondi
3. Il pulsante diventa **Stop** e lo sfondo verde

**Problema? Porta 80 occupata**:

Se Apache non si avvia:

1. Clicca **Config** (accanto ad Apache) > **httpd.conf**
2. Cerca: `Listen 80`
3. Cambia in: `Listen 8080`
4. Salva
5. Riprova **Start**

### Step 3.3: Avvia MySQL

1. Clicca **Start** accanto a **MySQL**
2. Attendi 5 secondi
3. Diventa verde

**✅ Se entrambi sono verdi: OK!**

### Step 3.4: Test Apache

1. Apri browser
2. Vai su: `http://localhost` (o `http://localhost:8080` se hai cambiato porta)
3. Dovresti vedere: **"Welcome to XAMPP"**

**✅ Apache funziona!**

### Step 3.5: Test phpMyAdmin

1. Apri browser
2. Vai su: `http://localhost/phpmyadmin`
3. Login:
   - Username: `root`
   - Password: (lascia vuoto)
4. Clicca **Vai**

**✅ Vedi il pannello phpMyAdmin: MySQL funziona!**

### Step 3.6: Crea Database

1. In phpMyAdmin, clicca **"Nuovo"** (sidebar sinistra)
2. Nome database: `planora_db`
3. Codifica: `utf8mb4_unicode_ci`
4. Clicca **"Crea"**

**✅ Database creato!**

### Step 3.7: Cambia Password MySQL (IMPORTANTE)

1. In phpMyAdmin, vai su **"Account utente"**
2. Trova `root` con Host `localhost`
3. Clicca **"Modifica privilegi"**
4. Clicca **"Cambia password"**
5. Inserisci una password sicura (es: `Planora2025!`)
6. **ANNOTALA!** Ti servirà dopo
7. Clicca **"Esegui"**

**✅ Password impostata!**

---

## 4. Preparazione Progetto

### Step 4.1: Apri il Progetto sul Tuo PC

1. Vai nella cartella: `C:\Users\Windows\Desktop\task-management-platform\`
2. Apri il terminale (CMD o PowerShell)

### Step 4.2: Verifica Prerequisites

```bash
verify-setup.bat
```

**Aspettati**:
```
✅ All checks passed!
```

Se ci sono errori, risolvili prima di continuare.

### Step 4.3: Check Node.js e npm

```bash
check-prerequisites.bat
```

**Aspettati**:
```
✅ Node.js found: v22.20.0
✅ npm found: v10.9.3
✅ All critical prerequisites are met!
```

---

## 5. Build del Progetto

### Step 5.1: Esegui Build Script

Sul tuo PC, esegui:

```bash
build-for-xampp.bat
```

**Questo script farà**:
1. ⏳ Compila il backend TypeScript (2-3 min)
2. ⏳ Genera Prisma Client per MySQL (30 sec)
3. ⏳ Builda il frontend React (3-5 min)
4. ⏳ Crea cartella `xampp-deploy/` con tutto (30 sec)

**Tempo totale: 5-10 minuti**

### Step 5.2: Verifica Output

Alla fine dovresti vedere:

```
========================================
BUILD COMPLETED SUCCESSFULLY!
========================================

Deployment files are in: xampp-deploy\

NEXT STEPS:
1. Carica la cartella 'xampp-deploy\frontend' su: www.licenzeoriginali.com/planora/
2. Carica la cartella 'xampp-deploy\backend' su: www.licenzeoriginali.com/planora-api/
...
```

### Step 5.3: Controlla Cartella Output

Verifica che esista:
```
C:\Users\Windows\Desktop\task-management-platform\xampp-deploy\
├── frontend\
│   ├── index.html ✅
│   ├── assets\ ✅
│   └── .htaccess ✅
└── backend\
    ├── dist\ ✅
    ├── prisma\ ✅
    ├── package.json ✅
    ├── .env.example ✅
    └── .htaccess ✅
```

**✅ Se tutto c'è: Build OK!**

---

## 6. Upload File sul Server

### Caso A: Server Remoto (via FTP/SFTP)

#### Step 6.1: Apri FileZilla

1. Host: `ftp.licenzeoriginali.com` (o il tuo indirizzo)
2. Username: [tuo username FTP]
3. Password: [tua password FTP]
4. Porta: `21` (FTP) o `22` (SFTP)
5. Clicca **Connessione rapida**

#### Step 6.2: Upload Frontend

1. **Pannello remoto** (destra): Vai su `/htdocs/` (o `/public_html/`)
2. Crea cartella `planora` (se non esiste)
3. **Pannello locale** (sinistra): Vai su `xampp-deploy\frontend\`
4. Seleziona **TUTTI i file e cartelle** dentro `frontend\`
5. Trascinali nella cartella remota `/htdocs/planora/`
6. **Attendi 5-10 minuti** (upload)

**IMPORTANTE**: Assicurati che `.htaccess` sia stato caricato!

#### Step 6.3: Upload Backend

1. **Pannello remoto**: Vai su `/htdocs/`
2. Crea cartella `planora-api`
3. **Pannello locale**: Vai su `xampp-deploy\backend\`
4. Seleziona **TUTTI i file e cartelle**
5. Trascinali in `/htdocs/planora-api/`
6. **Attendi 10-15 minuti** (upload)

**NON caricare `node_modules`!** Le installerai sul server.

### Caso B: Server Locale (stesso PC)

#### Step 6.1: Copia Frontend

```bash
xcopy /E /I /Y xampp-deploy\frontend\* C:\xampp\htdocs\planora\
```

#### Step 6.2: Copia Backend

```bash
xcopy /E /I /Y xampp-deploy\backend\* C:\xampp\htdocs\planora-api\
```

**✅ File copiati!**

---

## 7. Configurazione Backend

### Step 7.1: Accedi al Server

- Se remoto: Accedi via SSH o Desktop Remoto
- Se locale: Apri CMD come amministratore

### Step 7.2: Vai nella Cartella Backend

```bash
cd C:\xampp\htdocs\planora-api
# oppure
cd /htdocs/planora-api
```

### Step 7.3: Crea File .env

```bash
copy .env.example .env
```

### Step 7.4: Modifica .env

Apri `.env` con un editor:

```bash
notepad .env
# oppure
nano .env
```

**Modifica questi valori**:

```env
# Database MySQL (IMPORTANTE: usa la password che hai impostato!)
DATABASE_URL="mysql://root:Planora2025!@localhost:3306/planora_db"
                           ↑
                    la tua password MySQL

# Server
PORT=4000
NODE_ENV=production
HOST=0.0.0.0

# Frontend URL (IMPORTANTE: il tuo dominio!)
FRONTEND_URL=https://www.licenzeoriginali.com/planora
FRONTEND_ORIGIN=https://www.licenzeoriginali.com

# JWT Secret (IMPORTANTE: genera una stringa random!)
JWT_SECRET=abc123xyz789SECURE_RANDOM_STRING_456def
          ↑
          Cambia con una stringa casuale sicura!
```

**Per generare JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia l'output e mettilo in `JWT_SECRET`

**Salva il file** (Ctrl+S in Notepad, Ctrl+X in nano)

### Step 7.5: Test Connessione Database

```bash
npm install mysql2
npm run test:db
```

**Aspettati**:
```
✅ Connected to MySQL server!
✅ Database 'planora_db' exists!
✅ ALL TESTS PASSED!
```

Se ci sono errori, verifica:
- Password in `.env` corretta
- MySQL attivo nel Control Panel
- Database `planora_db` esiste in phpMyAdmin

### Step 7.6: Installa Dipendenze

```bash
npm install --production
```

**Attendi 5-10 minuti**

### Step 7.7: Genera Prisma Client

```bash
npx prisma generate
```

**Aspettati**:
```
✔ Generated Prisma Client
```

### Step 7.8: Esegui Migrazioni Database

```bash
npx prisma migrate deploy
```

**Aspettati**:
```
✔ Applying migration `20250101000000_init`
✔ Applying migration `20250103000000_add_external_invitees`
✅ All migrations have been successfully applied.
```

### Step 7.9: (Opzionale) Popola Database

```bash
npm run seed
```

Questo crea dati di esempio e ruoli di sistema.

**✅ Backend configurato!**

---

## 8. Avvio Applicazione

### Step 8.1: Installa PM2

PM2 mantiene il backend sempre attivo.

```bash
npm install -g pm2
```

### Step 8.2: Avvia Backend con PM2

```bash
pm2 start dist/index.js --name planora-api
```

**Aspettati**:
```
[PM2] Process launched
┌─────┬──────────────┬─────────┬─────────┐
│ id  │ name         │ status  │ restart │
├─────┼──────────────┼─────────┼─────────┤
│ 0   │ planora-api  │ online  │ 0       │
└─────┴──────────────┴─────────┴─────────┘
```

### Step 8.3: Verifica Stato

```bash
pm2 status
```

Deve essere **online** (verde).

### Step 8.4: Controlla Log

```bash
pm2 logs planora-api --lines 20
```

**Aspettati**:
```
🚀 Server avviato su 0.0.0.0:4000
📊 Ambiente: production
🔗 API: http://localhost:4000/api
✅ CORS abilitato per: https://www.licenzeoriginali.com
```

**Se vedi errori**: Leggi i log e risolvi.

### Step 8.5: Configura Auto-Start

```bash
pm2 startup
```

PM2 ti darà un comando da eseguire. **Copialo ed eseguilo**.

Esempio:
```bash
pm2 startup windows
# Poi copia ed esegui il comando che ti mostra
```

Poi salva la configurazione:
```bash
pm2 save
```

**✅ Backend avviato e configurato per auto-start!**

---

## 9. Test Finale

### Test 9.1: Test Backend (Locale)

```bash
curl http://localhost:4000/api/health
```

**Aspettati**:
```json
{"status":"ok","timestamp":"2025-01-..."}
```

### Test 9.2: Test Frontend (Browser)

1. Apri browser
2. Vai su: `http://localhost/planora`
3. Dovresti vedere la **Landing Page di Planora**

**✅ Frontend funziona!**

### Test 9.3: Test Backend Esterno

Browser:
```
http://localhost/planora-api/api/health
```

**Aspettati**: JSON con `{"status":"ok"}`

**Se non funziona**: Devi configurare Apache come reverse proxy (vedi sotto).

### Test 9.4: Test Registrazione

1. Vai su: `http://localhost/planora`
2. Clicca **"Registrati"**
3. Compila il form:
   - Email: `test@example.com`
   - Password: `Test123!`
   - Nome: `Test`
   - Cognome: `User`
   - Nome Azienda: `Test Company`
4. Clicca **"Registrati"**

**Aspettati**: Redirect alla dashboard

**✅ Registrazione funziona!**

### Test 9.5: Test Login

1. Fai logout
2. Clicca **"Accedi"**
3. Inserisci credenziali
4. Clicca **"Accedi"**

**Aspettati**: Dashboard caricata

**✅ Login funziona!**

---

## 10. Troubleshooting

### Problema: Frontend mostra 404

**Causa**: `.htaccess` mancante o `mod_rewrite` non abilitato

**Soluzione**:

1. Verifica che `C:\xampp\htdocs\planora\.htaccess` esista
2. Apri `C:\xampp\apache\conf\httpd.conf`
3. Cerca: `#LoadModule rewrite_module modules/mod_rewrite.so`
4. Rimuovi il `#` (decommentalo)
5. Salva
6. Riavvia Apache nel Control Panel

### Problema: Backend non risponde

**Causa**: PM2 non attivo o porta 4000 bloccata

**Soluzione**:

```bash
# Verifica PM2
pm2 status

# Se non è online
pm2 restart planora-api

# Controlla log
pm2 logs planora-api --lines 50
```

### Problema: Errore database

**Causa**: Credenziali errate o database non esiste

**Soluzione**:

1. Verifica `.env`:
   ```bash
   type .env
   ```
2. Controlla password MySQL
3. Verifica database in phpMyAdmin
4. Test connessione:
   ```bash
   npm run test:db
   ```

### Problema: CORS errors

**Causa**: `FRONTEND_URL` non corretto in `.env`

**Soluzione**:

1. Apri `.env`
2. Verifica:
   ```env
   FRONTEND_URL=https://www.licenzeoriginali.com/planora
   ```
3. Salva
4. Riavvia backend:
   ```bash
   pm2 restart planora-api
   ```

### Problema: Upload file non funziona

**Causa**: Cartella `uploads/` manca o permessi errati

**Soluzione**:

```bash
cd C:\xampp\htdocs\planora-api
mkdir uploads\documents
mkdir uploads\preventivi
```

---

## ✅ Deployment Completato!

Se sei arrivato fin qui, **COMPLIMENTI!** 🎉

Hai:

✅ Installato XAMPP
✅ Configurato Apache e MySQL
✅ Creato il database
✅ Buildato il progetto
✅ Caricato i file
✅ Configurato il backend
✅ Avviato l'applicazione
✅ Testato tutto con successo

### 📊 Riepilogo Finale

- **Frontend**: `http://localhost/planora` (o `https://www.licenzeoriginali.com/planora`)
- **Backend**: Porta 4000, gestito da PM2
- **Database**: MySQL `planora_db`
- **XAMPP**: Apache e MySQL attivi

### 🔐 Sicurezza Post-Deployment

Per produzione:

- [ ] Abilita HTTPS/SSL
- [ ] Configura firewall
- [ ] Backup automatico database
- [ ] Monitoring uptime
- [ ] Aggiorna password periodicamente

### 📚 Prossimi Step

- Leggi [FAQ-XAMPP.md](FAQ-XAMPP.md) per troubleshooting
- Consulta [XAMPP-DEPLOYMENT-GUIDE.md](XAMPP-DEPLOYMENT-GUIDE.md) per approfondimenti
- Usa [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) per futuri deployment

---

**Buon lavoro con Planora! 🚀**

Per supporto: [FAQ-XAMPP.md](FAQ-XAMPP.md)
