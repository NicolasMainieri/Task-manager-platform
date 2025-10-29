# Guida al Deployment - Task Management Platform con Sistema Premi

## Architettura

- **Backend**: API REST Node.js/Express (Render Web Service)
- **Frontend**: React/Vite SPA (Vercel o Render Static Site)
- **Database**: SQLite (incluso nel backend su Render)

## 1. Deploy Backend su Render ✅ (Completato)

Il tuo backend è già deployato su Render e funzionante!

### Verifica che funzioni:

```bash
curl https://tuo-backend.onrender.com/api/auth/login
```

Dovresti vedere un errore come "Method not allowed" o simile, il che significa che l'API è attiva.

**Importante**: Prendi nota dell'URL del tuo backend (es: `https://task-management-api.onrender.com`)

---

## 2. Deploy Frontend su Vercel (Consigliato)

### Step 1: Prepara il progetto

1. Apri il file `frontend/.env.production`
2. Sostituisci l'URL con quello del tuo backend Render:

```env
VITE_API_URL=https://tuo-backend.onrender.com
```

### Step 2: Crea account Vercel

1. Vai su [vercel.com](https://vercel.com)
2. Registrati con GitHub/GitLab/Bitbucket

### Step 3: Deploy

#### Opzione A: Da GitHub (Consigliato)

1. Pusha il codice su GitHub:
```bash
git add .
git commit -m "Add rewards system and deployment config"
git push origin main
```

2. Su Vercel:
   - Click "New Project"
   - Importa il tuo repository GitHub
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: Aggiungi:
     - `VITE_API_URL` = `https://tuo-backend.onrender.com`

3. Click "Deploy"

#### Opzione B: Deploy Manuale (CLI)

```bash
# Installa Vercel CLI
npm i -g vercel

# Vai nella cartella frontend
cd frontend

# Login
vercel login

# Deploy
vercel --prod
```

Quando richiesto:
- Set up and deploy? **Y**
- Scope: seleziona il tuo account
- Link to existing project? **N**
- Project name: `task-management-frontend`
- In which directory is your code? `./`
- Override settings? **Y**
- Build command: `npm run build`
- Output directory: `dist`
- Development command: `npm run dev`

---

## 3. Alternativa: Deploy Frontend su Render

Se preferisci tenere tutto su Render:

1. Su Render Dashboard, click "New +" → "Static Site"
2. Collega il repository GitHub
3. Configurazione:
   - **Name**: task-management-frontend
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL` = `https://tuo-backend.onrender.com`

---

## 4. Configurazione CORS Backend

Assicurati che il backend accetti richieste dal tuo frontend in produzione.

Nel file `backend/src/index.ts` (o `server.ts`), aggiungi l'URL del frontend:

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://tuo-frontend.vercel.app', // Aggiungi questo
    'https://tuo-frontend.onrender.com' // O questo se usi Render
  ],
  credentials: true
}));
```

Fai il commit e Render farà il redeploy automatico.

---

## 5. Test del Sistema Completo

### A. Verifica Backend
```bash
# Health check
curl https://tuo-backend.onrender.com/api/auth/login

# Dovrebbe rispondere (anche con errore, l'importante è che risponda)
```

### B. Accedi al Frontend
```
https://tuo-frontend.vercel.app
```

### C. Testa il Sistema Premi

1. **Login come Admin**
2. Vai su "Premi" nel menu
3. Crea un premio:
   - Nome: "iPhone 17 Pro Max"
   - Costo Totale: 1000 punti
   - Costo Mensile: 200 punti
   - Quantità: 1

4. **Login come Dipendente**
5. Vai su "Premi"
6. Verifica di vedere il premio
7. Completa task per accumulare punti
8. Quando hai abbastanza punti, riscatta il premio

9. **Torna come Admin**
10. Vai su "Premi" → Click "Riscatti"
11. Approva/Rifiuta il riscatto
12. Marca come "Consegnato"

---

## 6. Monitoraggio

### Render (Backend)
- Dashboard Render → Il tuo servizio → "Logs"
- Vedi errori in tempo reale

### Vercel (Frontend)
- Dashboard Vercel → Il tuo progetto → "Deployments"
- Click su un deployment → "View Function Logs"

---

## 7. Variabili d'Ambiente

### Backend (Render)
```env
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=il-tuo-secret-sicuro-in-produzione
PORT=4000
FRONTEND_ORIGIN=https://tuo-frontend.vercel.app
```

### Frontend (Vercel)
```env
VITE_API_URL=https://tuo-backend.onrender.com
```

---

## 8. Troubleshooting

### Errore: "Cannot GET /"
**Problema**: Stai accedendo direttamente al backend
**Soluzione**: Accedi al frontend invece (Vercel URL)

### Errore: "Network Error" o "CORS"
**Problema**: CORS non configurato
**Soluzione**: Aggiungi l'URL del frontend nel CORS del backend

### Errore: 404 su route frontend
**Problema**: Manca la configurazione SPA routing
**Soluzione**: Crea `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Backend lento su Render (Free tier)
**Problema**: Il servizio va in sleep dopo 15 minuti di inattività
**Soluzione**:
- Upgrade a piano paid
- Usa un servizio di ping (es: UptimeRobot)

---

## 9. URL Finali

Dopo il deployment avrai:

- **Frontend**: `https://task-management.vercel.app`
- **Backend**: `https://task-management-api.onrender.com`

Gli utenti accedono SOLO al frontend! 🎉

---

## 10. Prossimi Passi (Opzionale)

- [ ] Aggiungi un dominio personalizzato (es: `tuaazienda.com`)
- [ ] Configura SSL (automatico su Vercel/Render)
- [ ] Aggiungi monitoring (Sentry, LogRocket)
- [ ] Migra da SQLite a PostgreSQL per produzione seria
- [ ] Aggiungi CI/CD automatico con GitHub Actions

---

## Note Importanti

1. **Database**: SQLite funziona su Render ma i dati vengono persi se il servizio si riavvia. Per produzione seria, usa PostgreSQL.

2. **Render Free Tier**: Il servizio va in sleep dopo 15 minuti. Primo caricamento sarà lento (~30 secondi).

3. **Costi**:
   - Vercel: Free per progetti personali
   - Render: $7/mese per il piano Starter (no sleep)

---

Hai bisogno di aiuto? Scrivimi! 🚀
