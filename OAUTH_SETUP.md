# OAuth2 Setup Guide - Calendar & Email Integration

## Google Calendar & Gmail Integration

### 1. Create Google Cloud Project

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita le API necessarie:
   - Google Calendar API
   - Gmail API

### 2. Configure OAuth2 Consent Screen

1. Nel menu laterale, vai su **APIs & Services** > **OAuth consent screen**
2. Scegli **External** (per test) o **Internal** (solo per organizzazioni Google Workspace)
3. Compila i campi obbligatori:
   - App name: "Task Management Platform"
   - User support email: tua email
   - Developer contact information: tua email
4. Aggiungi gli scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`

### 3. Create OAuth2 Credentials

1. Vai su **APIs & Services** > **Credentials**
2. Clicca **Create Credentials** > **OAuth client ID**
3. Scegli **Web application**
4. Configura:
   - Name: "Task Management Web Client"
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:4000/api/integrations/google/callback`
5. Copia **Client ID** e **Client Secret**
6. Aggiungili al file `.env`:
   ```
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

---

## Microsoft Outlook Calendar & Email Integration

### 1. Register Azure AD Application

1. Vai su [Azure Portal](https://portal.azure.com/)
2. Cerca e seleziona **Azure Active Directory**
3. Nel menu laterale, vai su **App registrations**
4. Clicca **New registration**

### 2. Configure Application

1. Compila i campi:
   - Name: "Task Management Platform"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI:
     - Platform: **Web**
     - URI: `http://localhost:4000/api/integrations/microsoft/callback`
2. Clicca **Register**

### 3. Configure API Permissions

1. Nel menu laterale, vai su **API permissions**
2. Clicca **Add a permission** > **Microsoft Graph**
3. Scegli **Delegated permissions**
4. Aggiungi le permission:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `offline_access` (per refresh token)
   - `openid`
   - `profile`
   - `email`
5. Clicca **Grant admin consent** (se disponibile)

### 4. Create Client Secret

1. Nel menu laterale, vai su **Certificates & secrets**
2. Nella tab **Client secrets**, clicca **New client secret**
3. Descrizione: "Task Management Secret"
4. Scadenza: 24 months (o custom)
5. Clicca **Add**
6. **IMPORTANTE**: Copia immediatamente il **Value** (non sarà più visualizzabile)

### 5. Update .env File

1. Nella pagina **Overview**, copia l'**Application (client) ID**
2. Aggiorna il file `.env`:
   ```
   MICROSOFT_CLIENT_ID="your-application-id"
   MICROSOFT_CLIENT_SECRET="your-client-secret-value"
   ```

---

## IMAP/POP3 Email Configuration

### Gmail con IMAP

1. Abilita IMAP nelle impostazioni Gmail:
   - Vai su Gmail > Impostazioni > Inoltro e POP/IMAP
   - Abilita IMAP
2. Crea una App Password:
   - Vai su [Google Account Security](https://myaccount.google.com/security)
   - Abilita 2-Step Verification
   - Vai su **App passwords**
   - Genera una nuova password per "Mail"
3. Usa queste impostazioni:
   - Host IMAP: `imap.gmail.com`
   - Porta: `993`
   - Secure: `true`
   - Host SMTP: `smtp.gmail.com`
   - Porta: `587`
   - Email: tua email Gmail
   - Password: App Password generata

### Outlook.com con IMAP

1. Abilita IMAP in Outlook.com (già abilitato di default)
2. Usa queste impostazioni:
   - Host IMAP: `outlook.office365.com`
   - Porta: `993`
   - Secure: `true`
   - Host SMTP: `smtp.office365.com`
   - Porta: `587`
   - Email: tua email Outlook
   - Password: password del tuo account

### Provider Email Generico

Per altri provider (Libero, Aruba, etc.), consulta la documentazione del provider per:
- Host IMAP e porta
- Host SMTP e porta
- Impostazioni SSL/TLS

---

## Testing OAuth2 Flow

### Google Test Flow

1. Avvia l'applicazione
2. Vai su Calendario o Email
3. Clicca "Collega Google Calendar" o "Collega Gmail"
4. Verrai reindirizzato alla pagina di consenso Google
5. Accetta le permission richieste
6. Verrai reindirizzato all'app con il token salvato

### Microsoft Test Flow

1. Avvia l'applicazione
2. Vai su Calendario o Email
3. Clicca "Collega Outlook Calendar" o "Collega Outlook Email"
4. Verrai reindirizzato alla pagina di login Microsoft
5. Accedi con il tuo account Microsoft
6. Accetta le permission richieste
7. Verrai reindirizzato all'app con il token salvato

---

## Troubleshooting

### "redirect_uri_mismatch" Error

- Verifica che gli URI di redirect nel provider OAuth2 corrispondano esattamente a quelli nel `.env`
- Attenzione a `http` vs `https` e trailing slashes

### "invalid_scope" Error

- Assicurati che tutti gli scopes richiesti siano abilitati nel consent screen
- Per Google: verifica che le API siano abilitate nel progetto

### Token Expiry Issues

- I token OAuth2 hanno una scadenza (solitamente 1 ora)
- L'app usa automaticamente il refresh token per ottenere nuovi access token
- Se i refresh token scadono (dopo 6 mesi di inattività), l'utente dovrà ricollegare l'account

---

## Security Best Practices

1. **Mai committare il file `.env`** nel repository
2. **Usa HTTPS in produzione** - OAuth2 richiede HTTPS per produzione
3. **Rigenera i secret regolarmente** per maggiore sicurezza
4. **Implementa rate limiting** per le API di integrazione
5. **Cripta i token nel database** usando encryption-at-rest
6. **Monitora l'accesso** ai token e revoca quelli sospetti
