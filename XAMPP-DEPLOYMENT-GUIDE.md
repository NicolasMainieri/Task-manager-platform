# Guida Completa al Deployment su XAMPP

Questa guida ti aiuterà a deployare Planora su un server con XAMPP e MySQL, accessibile su www.licenzeoriginali.com/planora

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Preparazione Database MySQL](#preparazione-database-mysql)
3. [Build del Progetto](#build-del-progetto)
4. [Upload dei File con FileZilla](#upload-dei-file-con-filezilla)
5. [Configurazione Server](#configurazione-server)
6. [Avvio Backend Node.js](#avvio-backend-nodejs)
7. [Test e Verifica](#test-e-verifica)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisiti

### Sul tuo PC (per il build):
- Node.js 18+ installato
- npm installato
- Git Bash (opzionale, per eseguire .sh su Windows)

### Sul Server (hosting):
- XAMPP installato con MySQL attivo
- Apache attivo
- Node.js 18+ installato sul server
- Accesso SSH o pannello di controllo
- FileZilla o altro client FTP/SFTP

---

## 1. Preparazione Database MySQL

### 1.1 Crea il Database su XAMPP

1. Apri **phpMyAdmin** nel tuo browser:
   ```
   http://www.licenzeoriginali.com/phpmyadmin
   ```

2. Clicca su **"Nuovo"** nella sidebar sinistra

3. Crea un nuovo database:
   - Nome: `planora_db`
   - Collation: `utf8mb4_unicode_ci`
   - Clicca **"Crea"**

4. Crea un utente per il database (se necessario):
   - Vai in **Account utenti** > **Aggiungi account utente**
   - Nome utente: `planora_user`
   - Host: `localhost`
   - Password: [scegli una password sicura]
   - Seleziona **"Crea database con lo stesso nome e concedi tutti i privilegi"**
   - Clicca **"Esegui"**

### 1.2 Annota le Credenziali

Salva queste informazioni, ti serviranno dopo:
```
Database: planora_db
Username: planora_user (o root se usi root)
Password: [la tua password]
Host: localhost
Port: 3306
```

---

## 2. Build del Progetto

### 2.1 Esegui lo Script di Build

#### Su Windows:
```bash
build-for-xampp.bat
```

#### Su Linux/Mac:
```bash
chmod +x build-for-xampp.sh
./build-for-xampp.sh
```

### 2.2 Cosa fa lo script:

1. ✅ Compila il backend TypeScript
2. ✅ Genera il Prisma Client per MySQL
3. ✅ Builda il frontend React con percorso `/planora/`
4. ✅ Crea la cartella `xampp-deploy` con tutto il necessario

### 2.3 Verifica i File di Deploy

Dopo il build, dovresti avere:
```
xampp-deploy/
├── frontend/           # File React buildati
│   ├── index.html
│   ├── assets/
│   └── .htaccess
└── backend/            # File Node.js buildati
    ├── dist/           # Codice compilato
    ├── prisma/         # Schema e migrations
    ├── uploads/        # Cartella upload vuota
    ├── package.json
    ├── .env.example
    └── .htaccess
```

---

## 3. Upload dei File con FileZilla

### 3.1 Connettiti al Server

1. Apri **FileZilla**
2. Inserisci i dati di connessione:
   - Host: `ftp.licenzeoriginali.com` (o l'indirizzo del tuo server)
   - Username: [tuo username FTP]
   - Password: [tua password FTP]
   - Porta: 21 (FTP) o 22 (SFTP)
3. Clicca **Connessione rapida**

### 3.2 Upload Frontend

1. Nel pannello **remoto** (destra), naviga fino a:
   ```
   /htdocs/
   oppure
   /public_html/
   ```

2. Crea la cartella `planora` se non esiste

3. Nel pannello **locale** (sinistra), vai su:
   ```
   C:\Users\Windows\Desktop\task-management-platform\xampp-deploy\frontend\
   ```

4. Seleziona **TUTTI** i file dentro `frontend/` e trascinali in `/htdocs/planora/`

5. **IMPORTANTE**: Assicurati che il file `.htaccess` sia stato caricato!

### 3.3 Upload Backend

1. Nel pannello **remoto**, torna a `/htdocs/` (o `/public_html/`)

2. Crea la cartella `planora-api`

3. Nel pannello **locale**, vai su:
   ```
   C:\Users\Windows\Desktop\task-management-platform\xampp-deploy\backend\
   ```

4. Seleziona **TUTTI** i file e cartelle dentro `backend/` e trascinali in `/htdocs/planora-api/`

### 3.4 Verifica Upload

Assicurati che sul server ci siano:
```
/htdocs/planora/
├── index.html
├── assets/
└── .htaccess

/htdocs/planora-api/
├── dist/
├── prisma/
├── uploads/
├── package.json
├── .env.example
└── .htaccess
```

---

## 4. Configurazione Server

### 4.1 Configura il Backend

1. Accedi al server tramite SSH o file manager

2. Vai nella cartella `/htdocs/planora-api/`

3. Copia `.env.example` come `.env`:
   ```bash
   cp .env.example .env
   ```

4. Modifica il file `.env` con le tue credenziali:
   ```bash
   nano .env
   # oppure usa il file manager del tuo hosting
   ```

5. Aggiorna queste variabili:
   ```env
   # Database MySQL
   DATABASE_URL="mysql://planora_user:TUA_PASSWORD@localhost:3306/planora_db"

   # Server
   PORT=4000
   NODE_ENV=production
   HOST=0.0.0.0

   # Frontend URL
   FRONTEND_URL=https://www.licenzeoriginali.com/planora
   FRONTEND_ORIGIN=https://www.licenzeoriginali.com

   # JWT Secret (GENERA UNA STRINGA RANDOM SICURA!)
   JWT_SECRET=abc123xyz789SECURE_RANDOM_STRING_456def
   ```

6. **IMPORTANTE**: Cambia `JWT_SECRET` con una stringa casuale sicura!
   - Puoi generarla qui: https://randomkeygen.com/
   - Usa almeno 32 caratteri

### 4.2 Installa le Dipendenze

1. Nella cartella `/htdocs/planora-api/`, esegui:
   ```bash
   npm install --production
   ```

2. Se hai errori, verifica che Node.js sia installato:
   ```bash
   node --version
   npm --version
   ```

### 4.3 Esegui le Migrazioni del Database

1. Genera il Prisma Client:
   ```bash
   npx prisma generate
   ```

2. Esegui le migrazioni:
   ```bash
   npx prisma migrate deploy
   ```

3. (Opzionale) Popola il database con dati di test:
   ```bash
   npm run seed
   ```

---

## 5. Avvio Backend Node.js

Il backend Node.js **non può** essere eseguito direttamente tramite Apache. Devi farlo girare come **servizio separato**.

### Opzione 1: PM2 (Consigliato)

PM2 è un process manager per Node.js che mantiene il server attivo.

1. Installa PM2 globalmente:
   ```bash
   npm install -g pm2
   ```

2. Avvia il backend con PM2:
   ```bash
   cd /htdocs/planora-api/
   pm2 start dist/index.js --name planora-api
   ```

3. Configura PM2 per avviarsi all'avvio del sistema:
   ```bash
   pm2 startup
   pm2 save
   ```

4. Comandi utili PM2:
   ```bash
   pm2 status              # Vedi lo stato
   pm2 logs planora-api    # Vedi i log
   pm2 restart planora-api # Riavvia
   pm2 stop planora-api    # Ferma
   ```

### Opzione 2: Forever

```bash
npm install -g forever
cd /htdocs/planora-api/
forever start dist/index.js
```

### Opzione 3: node-windows (Solo Windows Server)

Se il server è Windows:
```bash
npm install -g node-windows
```

Poi crea uno script per installare il servizio Windows.

### Opzione 4: Manualmente (NON per produzione)

```bash
cd /htdocs/planora-api/
node dist/index.js &
```

⚠️ **Attenzione**: Questa opzione non è adatta per produzione perché il processo si ferma se chiudi il terminale.

---

## 6. Configurazione Apache Reverse Proxy (Opzionale)

Se vuoi che le richieste a `www.licenzeoriginali.com/planora-api` vengano inoltrate al backend Node.js:

### 6.1 Abilita i Moduli Apache

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo service apache2 restart
```

### 6.2 Configura il VirtualHost

Aggiungi questo al tuo VirtualHost di Apache (`httpd.conf` o `000-default.conf`):

```apache
<VirtualHost *:80>
    ServerName www.licenzeoriginali.com

    # Frontend React
    DocumentRoot /htdocs

    <Directory /htdocs/planora>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Backend Node.js Reverse Proxy
    ProxyPreserveHost On
    ProxyPass /planora-api http://localhost:4000
    ProxyPassReverse /planora-api http://localhost:4000

    # Headers CORS
    <Location /planora-api>
        Header set Access-Control-Allow-Origin "https://www.licenzeoriginali.com"
        Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type, Authorization"
        Header set Access-Control-Allow-Credentials "true"
    </Location>
</VirtualHost>
```

### 6.3 Riavvia Apache

```bash
sudo service apache2 restart
# oppure
sudo systemctl restart apache2
```

---

## 7. Test e Verifica

### 7.1 Testa il Frontend

1. Apri il browser e vai su:
   ```
   https://www.licenzeoriginali.com/planora
   ```

2. Dovresti vedere la landing page di Planora

3. Verifica che gli asset si carichino correttamente (immagini, CSS, JS)

### 7.2 Testa il Backend

1. Verifica che il server Node.js sia attivo:
   ```bash
   pm2 status
   ```

2. Testa l'endpoint di health:
   ```bash
   curl http://localhost:4000/api/health
   ```

3. Oppure apri nel browser:
   ```
   https://www.licenzeoriginali.com/planora-api/api/health
   ```

4. Dovresti vedere:
   ```json
   {"status":"ok","timestamp":"2025-01-XX..."}
   ```

### 7.3 Testa il Login

1. Vai su `/planora` e clicca "Accedi"

2. Prova a registrare un nuovo utente o accedere

3. Se ci sono errori, controlla i log:
   ```bash
   pm2 logs planora-api
   ```

---

## 8. Troubleshooting

### Problema: 404 Not Found sul frontend

**Soluzione**:
1. Verifica che il file `.htaccess` sia presente in `/htdocs/planora/`
2. Verifica che `mod_rewrite` sia abilitato in Apache:
   ```bash
   sudo a2enmod rewrite
   sudo service apache2 restart
   ```

### Problema: CORS errors

**Soluzione**:
1. Verifica che il backend sia configurato correttamente in `src/index.ts`
2. Controlla che `FRONTEND_URL` in `.env` sia corretto
3. Verifica i headers CORS in Apache (se usi reverse proxy)

### Problema: Database connection failed

**Soluzione**:
1. Verifica le credenziali in `.env`
2. Testa la connessione MySQL:
   ```bash
   mysql -u planora_user -p -h localhost planora_db
   ```
3. Verifica che MySQL sia attivo:
   ```bash
   sudo service mysql status
   ```

### Problema: Backend non si avvia

**Soluzione**:
1. Controlla i log di PM2:
   ```bash
   pm2 logs planora-api --lines 100
   ```
2. Verifica che le dipendenze siano installate:
   ```bash
   cd /htdocs/planora-api
   npm install --production
   ```
3. Verifica che la porta 4000 non sia occupata:
   ```bash
   netstat -tulpn | grep 4000
   ```

### Problema: Assets non si caricano (CSS/JS)

**Soluzione**:
1. Verifica che il `base` in `vite.config.ts` sia corretto (`/planora/`)
2. Verifica che i file siano stati buildati correttamente
3. Controlla i permessi dei file:
   ```bash
   chmod -R 755 /htdocs/planora
   ```

### Problema: Upload files non funzionano

**Soluzione**:
1. Crea le cartelle di upload:
   ```bash
   mkdir -p /htdocs/planora-api/uploads/documents
   mkdir -p /htdocs/planora-api/uploads/preventivi
   ```
2. Imposta i permessi:
   ```bash
   chmod -R 777 /htdocs/planora-api/uploads
   ```

### Problema: WebSocket non funziona (chat/notifiche)

**Soluzione**:
1. Verifica che Socket.IO sia configurato correttamente
2. Se usi reverse proxy, aggiungi questo in Apache:
   ```apache
   ProxyPass /socket.io/ http://localhost:4000/socket.io/
   ProxyPassReverse /socket.io/ http://localhost:4000/socket.io/

   <Location /socket.io/>
       RewriteEngine On
       RewriteCond %{HTTP:Upgrade} =websocket [NC]
       RewriteRule /(.*)           ws://localhost:4000/$1 [P,L]
   </Location>
   ```

---

## 9. Manutenzione e Aggiornamenti

### Come aggiornare l'app dopo modifiche:

1. Sul tuo PC, modifica il codice

2. Esegui di nuovo il build:
   ```bash
   build-for-xampp.bat
   ```

3. Carica solo i file modificati con FileZilla

4. Sul server, riavvia il backend:
   ```bash
   pm2 restart planora-api
   ```

### Backup del Database

```bash
mysqldump -u planora_user -p planora_db > backup_planora_$(date +%Y%m%d).sql
```

### Restore del Database

```bash
mysql -u planora_user -p planora_db < backup_planora_20250115.sql
```

---

## 10. Sicurezza

### Checklist di Sicurezza:

- [ ] Cambiato `JWT_SECRET` con valore random sicuro
- [ ] Password MySQL robusta
- [ ] HTTPS abilitato (SSL/TLS)
- [ ] File `.env` non accessibile via web
- [ ] Cartella `uploads/` con permessi corretti (777 solo se necessario)
- [ ] Firewall configurato per bloccare porte non necessarie
- [ ] Backup automatici del database configurati
- [ ] PM2 configurato per riavvio automatico

---

## 11. Supporto

Per problemi o domande:
- GitHub Issues: [link al tuo repo]
- Email: [tua email]
- Documentazione Prisma: https://www.prisma.io/docs
- Documentazione PM2: https://pm2.keymetrics.io/docs

---

## Riepilogo Comandi Rapidi

```bash
# Build locale
./build-for-xampp.bat

# Sul server - Prima installazione
cd /htdocs/planora-api
cp .env.example .env
nano .env
npm install --production
npx prisma generate
npx prisma migrate deploy
npm install -g pm2
pm2 start dist/index.js --name planora-api
pm2 startup
pm2 save

# Comandi utili
pm2 status
pm2 logs planora-api
pm2 restart planora-api
pm2 stop planora-api
```

---

**Buon deployment! 🚀**
