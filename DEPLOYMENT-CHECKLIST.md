# Checklist Deployment XAMPP per Planora

Usa questa checklist per assicurarti di non dimenticare nessun passo importante.

## Pre-Build (sul tuo PC)

- [ ] Node.js e npm installati
- [ ] Eseguito `npm install` in `backend/`
- [ ] Eseguito `npm install` in `frontend/`
- [ ] Verificato che l'app funzioni in locale (`npm run dev`)
- [ ] Eseguito `check-prerequisites.bat` senza errori

## Build

- [ ] Eseguito `build-for-xampp.bat` (Windows) o `build-for-xampp.sh` (Linux/Mac)
- [ ] Verificato che la cartella `xampp-deploy/` sia stata creata
- [ ] Verificato che `xampp-deploy/frontend/` contenga `index.html` e `assets/`
- [ ] Verificato che `xampp-deploy/backend/` contenga `dist/` e `prisma/`
- [ ] Verificato che i file `.htaccess` siano presenti in entrambe le cartelle

## Preparazione Server

- [ ] XAMPP installato sul server
- [ ] Apache attivo
- [ ] MySQL attivo
- [ ] Node.js 18+ installato sul server
- [ ] Accesso FTP/SFTP configurato (FileZilla)
- [ ] Accesso SSH configurato (opzionale ma consigliato)

## Database MySQL

- [ ] Creato database `planora_db` in phpMyAdmin
- [ ] Annotato username MySQL (es. `root` o `planora_user`)
- [ ] Annotato password MySQL
- [ ] Testato connessione al database

## Upload File

### Frontend
- [ ] Creata cartella `/htdocs/planora/` (o `/public_html/planora/`)
- [ ] Caricati TUTTI i file da `xampp-deploy/frontend/` a `/htdocs/planora/`
- [ ] Verificato che `.htaccess` sia presente
- [ ] Verificato che `index.html` sia presente
- [ ] Verificato che la cartella `assets/` sia presente

### Backend
- [ ] Creata cartella `/htdocs/planora-api/`
- [ ] Caricati TUTTI i file da `xampp-deploy/backend/` a `/htdocs/planora-api/`
- [ ] Verificato che `.htaccess` sia presente
- [ ] Verificato che `dist/` sia presente
- [ ] Verificato che `prisma/` sia presente
- [ ] Verificato che `package.json` sia presente
- [ ] Verificato che `.env.example` sia presente

## Configurazione Backend

- [ ] Copiato `.env.example` come `.env`
- [ ] Modificato `DATABASE_URL` con credenziali MySQL corrette
- [ ] Modificato `FRONTEND_URL` con l'URL corretto
- [ ] Cambiato `JWT_SECRET` con stringa random sicura (min. 32 caratteri)
- [ ] Configurato altre variabili d'ambiente se necessarie (OpenAI, Google, ecc.)
- [ ] Salvato il file `.env`

## Installazione Dipendenze

- [ ] Connesso al server via SSH
- [ ] Navigato in `/htdocs/planora-api/`
- [ ] Eseguito `npm install --production`
- [ ] Verificato che non ci siano errori
- [ ] Eseguito `npx prisma generate`
- [ ] Eseguito `npx prisma migrate deploy`
- [ ] (Opzionale) Eseguito `npm run seed` per dati di test

## Avvio Backend

- [ ] Installato PM2: `npm install -g pm2`
- [ ] Avviato backend: `pm2 start dist/index.js --name planora-api`
- [ ] Verificato status: `pm2 status`
- [ ] Configurato auto-start: `pm2 startup && pm2 save`
- [ ] Verificato log: `pm2 logs planora-api`

## Configurazione Apache (Opzionale)

- [ ] Abilitato `mod_rewrite`: `sudo a2enmod rewrite`
- [ ] Abilitato `mod_proxy`: `sudo a2enmod proxy`
- [ ] Abilitato `mod_proxy_http`: `sudo a2enmod proxy_http`
- [ ] Abilitato `mod_headers`: `sudo a2enmod headers`
- [ ] Configurato VirtualHost (vedi `apache-config-example.conf`)
- [ ] Riavviato Apache: `sudo service apache2 restart`

## Test e Verifica

### Test Frontend
- [ ] Aperto browser su `https://www.licenzeoriginali.com/planora`
- [ ] La landing page si carica correttamente
- [ ] Gli asset (immagini, CSS, JS) si caricano
- [ ] Non ci sono errori 404 nella console del browser
- [ ] Il routing React funziona (provato a navigare tra le pagine)

### Test Backend
- [ ] Verificato che PM2 mostri il processo attivo: `pm2 status`
- [ ] Testato health endpoint: `curl http://localhost:4000/api/health`
- [ ] Risposta JSON corretta: `{"status":"ok",...}`
- [ ] Nessun errore nei log: `pm2 logs planora-api --lines 50`

### Test Integrazione
- [ ] Provato a registrare un nuovo utente
- [ ] Provato a fare login
- [ ] Verificato che il token JWT venga salvato
- [ ] Provato a creare una task
- [ ] Verificato che i dati vengano salvati nel database
- [ ] (Se applicabile) Testato upload file
- [ ] (Se applicabile) Testato notifiche real-time

## Sicurezza

- [ ] HTTPS abilitato (SSL/TLS configurato)
- [ ] File `.env` NON accessibile via web
- [ ] Cartella `node_modules/` NON accessibile via web
- [ ] Password MySQL robusta
- [ ] `JWT_SECRET` cambiato con valore random sicuro
- [ ] Firewall configurato (solo porte 80, 443, 22 aperte)
- [ ] Permessi file corretti:
  - [ ] File: `644` (leggibile da tutti, scrivibile solo dal proprietario)
  - [ ] Cartelle: `755` (eseguibile da tutti, scrivibile solo dal proprietario)
  - [ ] `uploads/`: `755` o `777` (solo se necessario)

## Backup

- [ ] Configurato backup automatico del database
- [ ] Testato restore del database da backup
- [ ] Configurato backup dei file caricati (`uploads/`)
- [ ] Documentato procedura di backup e restore

## Performance

- [ ] Abilitata compressione gzip in Apache
- [ ] Cache configurata per asset statici
- [ ] Headers di cache impostati
- [ ] CDN configurato (opzionale)
- [ ] Monitoraggio server configurato (opzionale)

## Manutenzione

- [ ] Documentato procedura di aggiornamento
- [ ] Configurato log rotation
- [ ] Configurato monitoraggio uptime
- [ ] Configurato alert per errori critici

## Post-Deployment

- [ ] Inviato messaggio di test agli utenti
- [ ] Verificato email di benvenuto funzionante (se applicabile)
- [ ] Creato account admin di test
- [ ] Testato tutte le funzionalità principali:
  - [ ] Autenticazione (login/logout/registrazione)
  - [ ] Gestione task
  - [ ] Gestione progetti
  - [ ] Chat aziendale
  - [ ] Sistema di notifiche
  - [ ] Upload documenti
  - [ ] (Altre feature specifiche)

## Documentazione

- [ ] Aggiornato file README con URL di produzione
- [ ] Documentato credenziali di accesso (in luogo sicuro!)
- [ ] Documentato procedura di deployment per futuri aggiornamenti
- [ ] Creato guida utente (opzionale)

## Supporto

- [ ] Configurato sistema di supporto utenti
- [ ] Configurato email di supporto
- [ ] Preparato FAQ per problemi comuni
- [ ] Testato procedura di reset password

---

## Note Aggiuntive

### In caso di problemi:

1. **Frontend non si carica**
   - Verifica `.htaccess` in `/planora/`
   - Verifica permessi file
   - Controlla log Apache: `tail -f /var/log/apache2/error.log`

2. **Backend non risponde**
   - Verifica PM2: `pm2 status`
   - Controlla log: `pm2 logs planora-api`
   - Verifica porta 4000 libera: `netstat -tulpn | grep 4000`

3. **Errori database**
   - Verifica credenziali in `.env`
   - Testa connessione MySQL: `mysql -u user -p -h localhost planora_db`
   - Verifica migrazioni: `npx prisma migrate status`

4. **CORS errors**
   - Verifica `FRONTEND_URL` in `.env`
   - Verifica CORS headers in Apache config
   - Controlla log browser (F12 > Console)

---

## Contatti Emergenza

- Admin Server: [email/telefono]
- Hosting Support: [link/email]
- Database Admin: [email]
- Sviluppatore: [tuo contatto]

---

**Ultima verifica**: ___/___/______

**Verificato da**: _________________

**Note**: _________________________
