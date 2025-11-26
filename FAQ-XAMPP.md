# FAQ - Problemi Comuni XAMPP Deployment

Risposte alle domande più frequenti durante il deployment su XAMPP.

## Generale

### Q: Posso usare SQLite invece di MySQL?
**A:** No, per XAMPP è meglio usare MySQL perché SQLite ha limitazioni con deployment su server web condivisi. Il progetto è già configurato per MySQL.

### Q: Devo per forza usare PM2?
**A:** PM2 è fortemente consigliato perché:
- Mantiene il processo Node.js attivo 24/7
- Si riavvia automaticamente in caso di crash
- Gestisce i log
- Si riavvia automaticamente al reboot del server

Alternative: `forever`, `node-windows` (solo Windows), o `systemd` (Linux).

### Q: Posso eseguire Node.js direttamente tramite Apache senza reverse proxy?
**A:** No, Node.js non può essere eseguito direttamente da Apache come PHP. Devi usare:
1. Node.js come servizio separato (con PM2)
2. Apache come reverse proxy verso Node.js

---

## Build e Deploy

### Q: Il build fallisce con errore "out of memory"
**A:** Aumenta la memoria disponibile per Node.js:
```bash
# Windows
set NODE_OPTIONS=--max_old_space_size=4096
build-for-xampp.bat

# Linux/Mac
export NODE_OPTIONS=--max_old_space_size=4096
./build-for-xampp.sh
```

### Q: Non trovo la cartella xampp-deploy dopo il build
**A:** Verifica che:
1. Il build sia completato senza errori
2. Stai guardando nella cartella root del progetto
3. Non hai permessi insufficienti

### Q: Come faccio a sapere se il build è andato a buon fine?
**A:** Lo script mostra "BUILD COMPLETED SUCCESSFULLY!" alla fine. Se vedi errori, leggi i messaggi e risolvi i problemi prima di procedere.

---

## Database MySQL

### Q: Come trovo le credenziali MySQL su XAMPP?
**A:** Su XAMPP di default:
- Username: `root`
- Password: (vuota, lascia in bianco)
- Host: `localhost`
- Port: `3306`

Se hai cambiato le credenziali, controlla `C:\xampp\mysql\bin\my.ini` (Windows) o `/opt/lampp/etc/my.cnf` (Linux).

### Q: Errore "Access denied for user 'root'@'localhost'"
**A:**
1. Verifica password in `.env`
2. Se la password è vuota, usa: `DATABASE_URL="mysql://root:@localhost:3306/planora_db"`
3. Verifica che MySQL sia attivo: `mysql -u root -p`

### Q: Errore "Unknown database 'planora_db'"
**A:** Il database non esiste. Crealo in phpMyAdmin:
```sql
CREATE DATABASE planora_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Q: Le migrazioni Prisma falliscono
**A:**
```bash
# Resetta le migrazioni (ATTENZIONE: cancella tutti i dati!)
npx prisma migrate reset --force

# Oppure ricrea da zero
npx prisma db push --force-reset

# Poi rigenera il client
npx prisma generate
```

### Q: Come faccio un backup del database?
**A:**
```bash
# Backup
mysqldump -u root -p planora_db > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p planora_db < backup_20250115.sql
```

---

## Upload e File

### Q: FileZilla dice "Permission denied" durante l'upload
**A:**
1. Verifica i permessi della cartella di destinazione
2. Assicurati di avere accesso FTP/SFTP
3. Prova a caricare in una cartella temporanea e poi sposta i file

### Q: Il file .htaccess non viene caricato
**A:** FileZilla potrebbe nascondere i file nascosti (che iniziano con `.`):
1. In FileZilla: Server > Forza visualizzazione file nascosti
2. Oppure rinomina `.htaccess` in `htaccess.txt`, caricalo, poi rinominalo sul server

### Q: Quanto tempo ci vuole per caricare i file?
**A:** Dipende dalla connessione, ma mediamente:
- Frontend (dist/): 5-10 minuti (~50MB)
- Backend (dist/ + node_modules): 10-20 minuti (~150MB se carichi node_modules)

**CONSIGLIO**: Non caricare `node_modules/` dal tuo PC. Carica solo i sorgenti e fai `npm install` direttamente sul server.

### Q: Posso comprimere i file prima di caricarli?
**A:** Sì! Per velocizzare:
1. Crea un `.zip` di `xampp-deploy/`
2. Carica il file zip
3. Sul server, estrai: `unzip xampp-deploy.zip`

---

## Backend Node.js

### Q: PM2 non trova il comando
**A:**
```bash
# Verifica installazione
npm list -g pm2

# Se non installato
npm install -g pm2

# Verifica che npm global bin sia nel PATH
npm config get prefix
```

### Q: Il backend si avvia ma poi si ferma subito
**A:**
```bash
# Controlla i log per vedere l'errore
pm2 logs planora-api --lines 100

# Errori comuni:
# 1. Porta già in uso -> cambia PORT in .env
# 2. Database non raggiungibile -> verifica DATABASE_URL
# 3. Mancano dipendenze -> npm install
```

### Q: Come cambio la porta del backend?
**A:** Modifica `.env`:
```env
PORT=5000
```

Poi riavvia:
```bash
pm2 restart planora-api
```

### Q: Errore "EADDRINUSE: address already in use"
**A:** La porta 4000 è già occupata:
```bash
# Trova il processo
netstat -tulpn | grep 4000

# Uccidi il processo (Linux)
kill -9 [PID]

# Oppure usa un'altra porta in .env
```

### Q: PM2 non si riavvia dopo il reboot
**A:**
```bash
# Genera script di startup
pm2 startup

# Esegui il comando che PM2 ti mostra
# Poi salva la configurazione
pm2 save
```

---

## Frontend

### Q: La pagina mostra "404 Not Found"
**A:**
1. Verifica che `.htaccess` sia presente
2. Verifica che `mod_rewrite` sia abilitato in Apache
3. Riavvia Apache

### Q: Gli asset (CSS/JS) non si caricano
**A:**
1. Verifica che `base: '/planora/'` sia corretto in `vite.config.ts`
2. Controlla la console del browser (F12) per errori 404
3. Verifica che la cartella `assets/` sia stata caricata

### Q: Funziona tutto tranne la navigazione (React Router)
**A:** Il file `.htaccess` manca o non è configurato correttamente. Copia quello fornito.

### Q: Errore "Failed to fetch" quando provo a fare login
**A:**
1. Verifica che il backend sia attivo: `pm2 status`
2. Verifica l'URL API in `src/config/api.ts`
3. Controlla errori CORS (vedi sezione CORS)

---

## CORS

### Q: Errore "CORS policy: No 'Access-Control-Allow-Origin' header"
**A:**
1. Verifica che `FRONTEND_URL` in `.env` sia corretto
2. Verifica che `ALLOWED_ORIGINS` in `src/index.ts` includa il tuo dominio
3. Se usi reverse proxy Apache, verifica gli headers CORS

### Q: Le richieste OPTIONS falliscono
**A:** Aggiungi questa configurazione in Apache (se usi reverse proxy):
```apache
<Location /planora-api>
    Header set Access-Control-Allow-Origin "https://www.licenzeoriginali.com"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</Location>
```

---

## Apache

### Q: Come abilito mod_rewrite su XAMPP Windows?
**A:**
1. Apri `C:\xampp\apache\conf\httpd.conf`
2. Trova la riga: `#LoadModule rewrite_module modules/mod_rewrite.so`
3. Rimuovi il `#` all'inizio
4. Riavvia Apache dal pannello XAMPP

### Q: Come abilito mod_rewrite su Ubuntu/Debian?
**A:**
```bash
sudo a2enmod rewrite
sudo service apache2 restart
```

### Q: Il reverse proxy non funziona
**A:**
```bash
# Abilita i moduli proxy
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo service apache2 restart
```

### Q: Dove trovo i log di Apache?
**A:**
- XAMPP Windows: `C:\xampp\apache\logs\error.log`
- XAMPP Linux: `/opt/lampp/logs/error_log`
- Ubuntu/Debian: `/var/log/apache2/error.log`

---

## SSL/HTTPS

### Q: Come abilito HTTPS su XAMPP?
**A:** Opzioni:
1. **Let's Encrypt** (gratis): Usa Certbot
2. **Self-signed certificate** (solo per test):
   ```bash
   # Genera certificato
   openssl req -new -x509 -days 365 -nodes -out /xampp/apache/conf/ssl.crt/server.crt -keyout /xampp/apache/conf/ssl.key/server.key
   ```
3. **Certificato acquistato**: Segui istruzioni del provider

### Q: Errore "NET::ERR_CERT_AUTHORITY_INVALID"
**A:** Stai usando un certificato self-signed. Va bene per test, ma per produzione usa Let's Encrypt o un certificato valido.

---

## Performance

### Q: L'app è lenta a caricarsi
**A:**
1. Abilita compressione gzip in Apache (vedi `apache-config-example.conf`)
2. Abilita cache per asset statici
3. Usa un CDN per asset pesanti
4. Ottimizza immagini (comprimi, usa WebP)

### Q: Il database è lento
**A:**
1. Aggiungi indici sulle colonne più cercate
2. Usa `EXPLAIN` per analizzare le query lente
3. Aumenta `innodb_buffer_pool_size` in MySQL config

---

## Sicurezza

### Q: Il file .env è accessibile via browser
**A:** Aggiungi questa regola in `.htaccess` del backend:
```apache
<Files ".env">
    Require all denied
</Files>
```

### Q: Come genero un JWT_SECRET sicuro?
**A:**
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Online
https://randomkeygen.com/
```

### Q: Devo esporre la porta 4000 esternamente?
**A:** No! Usa il reverse proxy Apache. La porta 4000 deve essere accessibile solo da `localhost`.

---

## Aggiornamenti

### Q: Come aggiorno l'app dopo modifiche al codice?
**A:**
1. Sul tuo PC: modifica il codice
2. Esegui di nuovo `build-for-xampp.bat`
3. Carica solo i file modificati con FileZilla
4. Sul server: `pm2 restart planora-api`

### Q: Devo rifare le migrazioni ad ogni aggiornamento?
**A:** Solo se hai modificato lo schema Prisma:
```bash
npx prisma migrate deploy
npx prisma generate
pm2 restart planora-api
```

---

## Troubleshooting Generale

### Q: Come debuggo i problemi?
**A:**
1. **Frontend**: Console browser (F12 > Console)
2. **Backend**: `pm2 logs planora-api`
3. **Apache**: `tail -f /var/log/apache2/error.log`
4. **MySQL**: `mysql -u root -p` e `SHOW PROCESSLIST;`

### Q: L'app funziona in locale ma non in produzione
**A:** Verifica:
1. Variabili d'ambiente (`.env`)
2. URL API corretti
3. Permessi file
4. Firewall e porte aperte
5. Log del server

---

## Contatti e Supporto

### Non trovi la risposta alla tua domanda?

1. Controlla la documentazione completa: `XAMPP-DEPLOYMENT-GUIDE.md`
2. Controlla i log per errori specifici
3. Cerca l'errore su Google/Stack Overflow
4. Contatta il supporto del tuo hosting
5. Apri una issue su GitHub (se open source)

---

**Ultimo aggiornamento**: Gennaio 2025
