# 📦 Guida Installazione XAMPP per Planora

Guida completa passo-passo per installare e configurare XAMPP sul tuo server.

---

## 🎯 Quale Versione di XAMPP?

### Consigliato per Planora:

**XAMPP 8.2.x o superiore**

- **PHP**: 8.2 o superiore (non necessario per Node.js, ma utile)
- **MySQL**: 8.0 o superiore (ESSENZIALE)
- **Apache**: 2.4.x (ESSENZIALE)

### Link Download:

- **Windows**: https://www.apachefriends.org/download.html
- **Linux**: https://www.apachefriends.org/download.html
- **macOS**: https://www.apachefriends.org/download.html

**Scarica**: XAMPP per Windows 8.2.12 (o versione più recente)

---

## 💻 Installazione XAMPP su Windows

### Step 1: Download XAMPP

1. Vai su https://www.apachefriends.org/
2. Clicca su **"Download"**
3. Scegli **"XAMPP for Windows"**
4. Scarica la versione **8.2.12** (o superiore)
5. File scaricato: `xampp-windows-x64-8.2.12-0-VS16-installer.exe` (~150MB)

### Step 2: Esegui l'Installer

1. **Fai doppio click** sul file `.exe` scaricato
2. **Windows potrebbe chiedere**: "Vuoi consentire a questa app di apportare modifiche?"
   - Clicca **"Sì"**

3. **Disabilita UAC (User Account Control) temporaneamente** se appare un warning:
   - Clicca **"OK"** e procedi

### Step 3: Selezione Componenti

L'installer ti chiederà quali componenti installare:

**✅ Seleziona questi (ESSENZIALI)**:
- [x] Apache
- [x] MySQL
- [x] phpMyAdmin

**❌ Puoi deselezionare** (non necessari per Planora):
- [ ] PHP (opzionale, ma consigliato)
- [ ] Perl
- [ ] Tomcat
- [ ] Webalizer
- [ ] Fake Sendmail
- [ ] Mercury
- [ ] FileZilla FTP Server

Clicca **"Next"**

### Step 4: Cartella di Installazione

1. **Cartella predefinita**: `C:\xampp`
2. **Consiglio**: Lascia la cartella predefinita
3. Se vuoi cambiarla, scegli un percorso **SENZA SPAZI** nel nome
   - ✅ Buono: `C:\xampp`
   - ✅ Buono: `D:\server\xampp`
   - ❌ Evita: `C:\Program Files\xampp` (ha spazi)

Clicca **"Next"**

### Step 5: Lingua

1. Scegli la lingua (Inglese o Italiano)
2. Clicca **"Next"**

### Step 6: Bitnami (Opzionale)

1. Ti chiederà se vuoi saperne di più su Bitnami
2. **Deseleziona** "Learn more about Bitnami"
3. Clicca **"Next"**

### Step 7: Installazione

1. Clicca **"Next"** per iniziare l'installazione
2. **Attendi 5-10 minuti** mentre installa
3. Vedrai una barra di progresso

### Step 8: Firewall Windows

Durante l'installazione, **Windows Firewall** potrebbe chiedere:

> "Windows Defender Firewall ha bloccato alcune funzionalità di Apache HTTP Server"

**IMPORTANTE**:
- [x] **Reti private** (come reti domestiche e aziendali) ✅ SELEZIONA
- [x] **Reti pubbliche** (come quelle in aeroporti e bar) - Opzionale
- Clicca **"Consenti accesso"**

Ripeti per MySQL se richiesto.

### Step 9: Completamento

1. L'installazione è completa!
2. [x] Seleziona "Do you want to start the Control Panel now?"
3. Clicca **"Finish"**

---

## 🚀 Primo Avvio XAMPP

### Apri XAMPP Control Panel

1. Se non si è aperto automaticamente:
   - Vai su `C:\xampp`
   - Fai doppio click su **`xampp-control.exe`**

2. **Windows potrebbe chiedere permessi admin**: Clicca **"Sì"**

### Avvia Apache e MySQL

Nel XAMPP Control Panel vedrai questa interfaccia:

```
┌─────────────────────────────────────┐
│ Module    │ Status  │ Actions       │
├─────────────────────────────────────┤
│ Apache    │ Stopped │ [Start] [...]│
│ MySQL     │ Stopped │ [Start] [...]│
│ FileZilla │ Stopped │ [Start] [...]│
│ Mercury   │ Stopped │ [Start] [...]│
│ Tomcat    │ Stopped │ [Start] [...]│
└─────────────────────────────────────┘
```

**Azioni**:

1. Clicca **"Start"** accanto ad **Apache**
   - Status diventerà verde: "Running"
   - Porta predefinita: 80 (HTTP) e 443 (HTTPS)

2. Clicca **"Start"** accanto a **MySQL**
   - Status diventerà verde: "Running"
   - Porta predefinita: 3306

**✅ Se tutto è verde**: XAMPP è attivo!

---

## ⚠️ Risoluzione Problemi Comuni

### Problema 1: Porta 80 già in uso

**Errore**: "Apache non si avvia - Porta 80 occupata"

**Causa**: Skype, IIS, o altri programmi usano la porta 80

**Soluzione 1 - Cambia porta Apache**:

1. Nel Control Panel, clicca **"Config"** accanto ad Apache
2. Scegli **"httpd.conf"**
3. Cerca questa riga:
   ```apache
   Listen 80
   ```
4. Cambiala in:
   ```apache
   Listen 8080
   ```
5. Cerca anche:
   ```apache
   ServerName localhost:80
   ```
6. Cambiala in:
   ```apache
   ServerName localhost:8080
   ```
7. Salva il file
8. Riavvia Apache

**Soluzione 2 - Disabilita Skype/IIS**:

Per Skype:
- Apri Skype > Impostazioni > Avanzate
- Deseleziona "Usa porte 80 e 443"

Per IIS:
- Pannello di controllo > Programmi > Attiva/Disattiva funzionalità Windows
- Deseleziona "Internet Information Services"

### Problema 2: Porta 3306 già in uso

**Errore**: "MySQL non si avvia - Porta 3306 occupata"

**Causa**: Hai già MySQL installato sul sistema

**Soluzione 1 - Usa MySQL esistente**:
- Se hai già MySQL installato, usa quello invece di XAMPP MySQL
- Nel file `.env`: `DATABASE_URL="mysql://root:password@localhost:3306/planora_db"`

**Soluzione 2 - Cambia porta XAMPP MySQL**:

1. Nel Control Panel, clicca **"Config"** accanto a MySQL
2. Scegli **"my.ini"**
3. Cerca:
   ```ini
   port=3306
   ```
4. Cambiala in:
   ```ini
   port=3307
   ```
5. Salva
6. Riavvia MySQL
7. Aggiorna `.env`: `DATABASE_URL="mysql://root:password@localhost:3307/planora_db"`

### Problema 3: Firewall blocca le connessioni

**Soluzione**:

1. Pannello di controllo Windows
2. Windows Defender Firewall
3. Impostazioni avanzate
4. Regole in entrata
5. Nuova regola per Apache (porta 80 o 8080)
6. Nuova regola per MySQL (porta 3306)

---

## 🔧 Configurazione Post-Installazione

### 1. Configura phpMyAdmin

1. Apri browser
2. Vai su: `http://localhost/phpmyadmin`
3. **Login predefinito**:
   - Username: `root`
   - Password: (vuota - lascia in bianco)
4. Clicca **"Vai"**

**✅ Se vedi il pannello phpMyAdmin**: MySQL funziona!

### 2. Cambia Password Root MySQL (IMPORTANTE)

**Per sicurezza, cambia la password root**:

1. In phpMyAdmin, vai su **"Account utente"**
2. Clicca su **"root"** (localhost)
3. Clicca **"Modifica privilegi"**
4. Clicca **"Cambia password"**
5. Scegli una password sicura
6. Clicca **"Esegui"**

**IMPORTANTE**: Annota questa password! Ti servirà per `.env`

### 3. Crea Database Planora

1. In phpMyAdmin, clicca **"Nuovo"** (sidebar sinistra)
2. Nome database: `planora_db`
3. Codifica: `utf8mb4_unicode_ci`
4. Clicca **"Crea"**

**✅ Database creato!**

### 4. Configura Auto-Start (Opzionale)

Per far partire XAMPP automaticamente all'avvio di Windows:

1. Apri XAMPP Control Panel
2. Clicca **"Config"** (angolo in alto a destra)
3. Seleziona:
   - [x] Apache - Autostart
   - [x] MySQL - Autostart
4. Clicca **"Save"**

---

## 📁 Struttura Cartelle XAMPP

Dopo l'installazione, avrai questa struttura:

```
C:\xampp\
├── apache\          # Apache web server
├── mysql\           # Database MySQL
├── htdocs\          # ⭐ QUI vanno i tuoi file web!
│   └── (qui caricherai planora/)
├── phpMyAdmin\      # Interfaccia database
├── php\             # PHP (opzionale)
├── perl\            # Perl (se installato)
├── FileZilla\       # FTP server (se installato)
├── xampp-control.exe  # Control Panel
└── ...
```

**IMPORTANTE**: I tuoi file vanno in `C:\xampp\htdocs\`

Per Planora:
- Frontend: `C:\xampp\htdocs\planora\`
- Backend: `C:\xampp\htdocs\planora-api\`

---

## 🌐 Test XAMPP

### Test Apache

1. Apri browser
2. Vai su: `http://localhost`
3. Dovresti vedere la pagina di benvenuto XAMPP

**✅ Se vedi la pagina**: Apache funziona!

### Test MySQL

1. Apri browser
2. Vai su: `http://localhost/phpmyadmin`
3. Login con username `root` e password (quella che hai impostato)

**✅ Se accedi**: MySQL funziona!

### Test Creazione File

1. Vai in `C:\xampp\htdocs\`
2. Crea un file `test.html`:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Test</title>
   </head>
   <body>
       <h1>XAMPP Funziona! ✅</h1>
   </body>
   </html>
   ```
3. Salva
4. Apri browser: `http://localhost/test.html`

**✅ Se vedi "XAMPP Funziona!"**: Tutto OK!

---

## 🔐 Sicurezza XAMPP

### Per Ambiente Locale (Sviluppo)

Se usi XAMPP solo sul tuo PC:
- ✅ Password root MySQL opzionale
- ✅ Firewall Windows sufficiente

### Per Server di Produzione

Se XAMPP è su un server pubblico:

1. **Cambia password root MySQL** (OBBLIGATORIO)
2. **Configura .htaccess** per proteggere cartelle
3. **Disabilita directory listing**:
   - Apri `C:\xampp\apache\conf\httpd.conf`
   - Cerca `Options Indexes FollowSymLinks`
   - Cambia in `Options -Indexes +FollowSymLinks`

4. **Abilita SSL/HTTPS**:
   - Nel Control Panel, clicca **"Config"** > **"Apache (httpd-ssl.conf)"**
   - Configura certificato SSL

5. **Limita accesso phpMyAdmin**:
   - Apri `C:\xampp\phpMyAdmin\config.inc.php`
   - Aggiungi restrizioni IP

---

## 🚀 XAMPP è Pronto!

Ora che XAMPP è installato e configurato:

### ✅ Checklist

- [x] XAMPP installato
- [x] Apache funzionante (porta 80 o 8080)
- [x] MySQL funzionante (porta 3306)
- [x] phpMyAdmin accessibile
- [x] Database `planora_db` creato
- [x] Password root MySQL impostata
- [x] Test file HTML riuscito

### 📋 Prossimi Step

Ora puoi procedere con il deployment di Planora:

1. **Sul tuo PC di sviluppo**:
   - Esegui `build-for-xampp.bat`
   - Questo crea la cartella `xampp-deploy/`

2. **Copia i file in XAMPP**:
   - **Frontend**: Copia `xampp-deploy/frontend/*` in `C:\xampp\htdocs\planora\`
   - **Backend**: Copia `xampp-deploy/backend/*` in `C:\xampp\htdocs\planora-api\`

3. **Segui la guida deployment**:
   - Leggi [START-HERE.md](START-HERE.md)
   - Segui [QUICK-START-XAMPP.md](QUICK-START-XAMPP.md)

---

## 📞 Comandi Utili XAMPP

### Avviare/Fermare Servizi

**Tramite Control Panel**:
- Clicca **"Start"** / **"Stop"** accanto al servizio

**Tramite Riga di Comando**:

```bash
# Avvia Apache
C:\xampp\apache\bin\httpd.exe

# Ferma Apache
C:\xampp\apache\bin\httpd.exe -k stop

# Avvia MySQL
C:\xampp\mysql\bin\mysqld.exe

# Ferma MySQL
C:\xampp\mysql\bin\mysqladmin.exe -u root -p shutdown
```

### Restart Servizi

Nel Control Panel:
1. Clicca **"Stop"**
2. Attendi che si fermi
3. Clicca **"Start"**

### Aprire Log Files

**Apache Logs**:
- Error log: `C:\xampp\apache\logs\error.log`
- Access log: `C:\xampp\apache\logs\access.log`

**MySQL Logs**:
- Error log: `C:\xampp\mysql\data\mysql_error.log`

Nel Control Panel, clicca **"Logs"** per aprirli rapidamente.

---

## 🛠️ Troubleshooting Avanzato

### Apache non si avvia - Porta 80 bloccata

**Verifica quale programma usa la porta 80**:

```bash
netstat -ano | findstr :80
```

Output esempio:
```
TCP    0.0.0.0:80    0.0.0.0:0    LISTENING    4532
```

Il numero `4532` è il PID del processo.

**Trova il programma**:
```bash
tasklist | findstr 4532
```

**Ferma il programma** dal Task Manager o cambia porta Apache.

### MySQL non si avvia

1. Controlla log: `C:\xampp\mysql\data\mysql_error.log`
2. Cerca errori specifici
3. Possibili cause:
   - Porta 3306 occupata
   - File `ibdata1` corrotto
   - Permessi file mancanti

**Reset MySQL** (ATTENZIONE: cancella dati):
```bash
cd C:\xampp\mysql\bin
mysqld --initialize-insecure --datadir=C:\xampp\mysql\data
```

### Reimpostare Password Root

Se hai dimenticato la password root:

1. Ferma MySQL
2. Apri `C:\xampp\mysql\bin\my.ini`
3. Aggiungi sotto `[mysqld]`:
   ```ini
   skip-grant-tables
   ```
4. Riavvia MySQL
5. Apri phpMyAdmin
6. Vai su SQL e esegui:
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'nuova_password';
   FLUSH PRIVILEGES;
   ```
7. Rimuovi `skip-grant-tables` da `my.ini`
8. Riavvia MySQL

---

## 📚 Risorse Utili

- **Sito Ufficiale**: https://www.apachefriends.org/
- **Forum XAMPP**: https://community.apachefriends.org/
- **Wiki XAMPP**: https://www.apachefriends.org/community.html
- **Apache Docs**: https://httpd.apache.org/docs/
- **MySQL Docs**: https://dev.mysql.com/doc/

---

## ✅ Riepilogo

Ora hai:

1. ✅ XAMPP installato e funzionante
2. ✅ Apache attivo su porta 80 (o 8080)
3. ✅ MySQL attivo su porta 3306
4. ✅ phpMyAdmin configurato
5. ✅ Database `planora_db` creato
6. ✅ Password MySQL impostata

**Sei pronto per deployare Planora!**

Prossimo step: [START-HERE.md](START-HERE.md) ⭐

---

**Buona installazione! 🚀**

Se hai problemi, consulta la sezione Troubleshooting o [FAQ-XAMPP.md](FAQ-XAMPP.md)
