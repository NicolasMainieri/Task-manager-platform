# 🚀 Deploy su Render.com - Guida Completa

## Prerequisiti
- Account Render.com (gratuito)
- Repository GitHub pubblico con il codice

---

## 📦 STEP 1: Crea Database PostgreSQL

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configurazione:
   - **Name**: `planora-db`
   - **Database**: `planora`
   - **User**: `planora`
   - **Region**: Frankfurt (o più vicino a te)
   - **Plan**: **Free** (o Starter se vuoi più performance)
4. Click **"Create Database"**
5. **IMPORTANTE**: Salva la **Internal Database URL** che ti viene fornita

---

## 🔧 STEP 2: Deploy Backend

### A. Crea Web Service

1. Click **"New +"** → **"Web Service"**
2. **Connect Repository**:
   - Autorizza GitHub
   - Seleziona `Task-manager-platform`
3. Configurazione Base:
   - **Name**: `planora-backend`
   - **Region**: Frankfurt (stesso del database)
   - **Branch**: `main`
   - **Root Directory**: `backend` ← **FONDAMENTALE!**
   - **Runtime**: Node
   - **Plan**: Free

### B. Build & Start Commands

**Build Command**:
```bash
npm install && npx prisma generate
```

**Start Command**:
```bash
npx prisma migrate deploy && npm start
```

### C. Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Aggiungi queste variabili:

| Key | Value | Note |
|-----|-------|------|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Render usa questa porta |
| `DATABASE_URL` | *paste Internal Database URL* | Dal database creato prima |
| `JWT_SECRET` | *click "Generate Value"* | Render genera automaticamente |
| `FRONTEND_URL` | `http://localhost:5173` | Aggiorneremo dopo |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Aggiorneremo dopo |
| `OPENAI_API_KEY` | `your-api-key` | Solo se usi AI features |
| `OPENAI_MODEL` | `gpt-4o-mini` | |

### D. Health Check Path

- **Health Check Path**: `/api/health`

### E. Deploy!

Click **"Create Web Service"**

Render inizierà a buildare. Aspetta che lo status diventi **"Live"** (circa 5-10 minuti).

---

## 🌐 STEP 3: URL Backend

Dopo il deploy, Render ti darà un URL tipo:
```
https://planora-backend.onrender.com
```

**Testa l'health check**:
```bash
curl https://planora-backend.onrender.com/api/health
```

Dovresti vedere:
```json
{"status":"ok","timestamp":"2025-10-16T..."}
```

---

## 💻 STEP 4: Deploy Frontend su Vercel

### A. Configura Vercel

1. Vai su [vercel.com](https://vercel.com)
2. **"Add New Project"**
3. Import `Task-manager-platform` da GitHub
4. Configurazione:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### B. Environment Variable

Aggiungi questa variabile:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://planora-backend.onrender.com` |

### C. Deploy!

Click **"Deploy"**

Vercel ti darà un URL tipo:
```
https://planora.vercel.app
```

---

## 🔄 STEP 5: Aggiorna CORS

Torna su **Render** → Backend Service → Environment Variables

Aggiorna queste variabili:

| Key | Nuovo Value |
|-----|-------------|
| `FRONTEND_URL` | `https://planora.vercel.app` |
| `FRONTEND_ORIGIN` | `https://planora.vercel.app` |

Click **"Save Changes"**

Render rifarà il deploy automaticamente.

---

## 🎨 STEP 6: Dominio Personalizzato (Opzionale)

### Su Vercel (Frontend):
1. **Settings** → **Domains**
2. Aggiungi il tuo dominio (es: `www.planora.com`)
3. Configura DNS record come indicato

### Su Render (Backend):
1. **Settings** → **Custom Domains**
2. Aggiungi subdomain (es: `api.planora.com`)
3. Configura CNAME record come indicato

---

## ✅ STEP 7: Verifica Tutto Funzioni

1. **Frontend**: Apri `https://planora.vercel.app`
2. **Backend Health**: Vai su `https://planora-backend.onrender.com/api/health`
3. **Login Test**: Prova a registrarti/login

---

## 🐛 Troubleshooting Comuni

### Errore: "Could not find Prisma Schema"
✅ **Soluzione**: Assicurati che **Root Directory** sia impostato a `backend`

### Errore: "Port binding failed"
✅ **Soluzione**: Aggiungi `PORT=10000` nelle environment variables

### Database Connection Failed
✅ **Soluzione**: Controlla che `DATABASE_URL` sia corretto (deve essere l'Internal URL, non External)

### CORS Error nel browser
✅ **Soluzione**:
1. Verifica che `FRONTEND_URL` e `FRONTEND_ORIGIN` siano corretti
2. Assicurati che Render abbia riavviato dopo la modifica

### Deploy lento/timeouts
⚠️ **Nota**: Il piano Free di Render "dorme" dopo 15 minuti di inattività. La prima richiesta dopo il risveglio può richiedere 30-60 secondi.

**Soluzioni**:
- Upgrade a piano Starter ($7/mese) per evitare sleep
- Usa un servizio di ping (es: UptimeRobot) per mantenerlo attivo

---

## 📊 Monitoraggio

### Render Logs
**Dashboard** → **Service** → **Logs**

Vedrai tutti i log in real-time:
```
🚀 Server avviato su porta 10000
📊 Ambiente: production
🔗 API: http://localhost:10000/api
```

### Metriche
**Dashboard** → **Service** → **Metrics**

Vedi:
- CPU usage
- Memory usage
- Response times
- Uptime

---

## 💰 Costi

### Piano Free (Attuale):
- ✅ Backend: Gratis (con limitazioni)
- ✅ Database: 90 giorni gratis, poi $7/mese
- ✅ Frontend su Vercel: Gratis
- **Totale**: €0/mese per 90 giorni

### Piano Raccomandato (Produzione):
- Backend Starter: $7/mese
- Database Starter: $7/mese
- Frontend Vercel: Gratis
- **Totale**: ~€13/mese

---

## 🔐 Sicurezza

### Cose da NON fare:
❌ Non committare file `.env` con secrets
❌ Non usare `JWT_SECRET` deboli
❌ Non esporre API keys nei log

### Best Practices:
✅ Usa variabili d'ambiente per secrets
✅ Abilita HTTPS (automatico su Render/Vercel)
✅ Usa helmet.js per headers di sicurezza
✅ Rate limiting per API

---

## 🚀 Auto-Deploy da GitHub

Render fa auto-deploy quando fai push su `main`:

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

Render rileva il push e riavvia automaticamente! 🎉

---

## 📞 Supporto

- [Render Docs](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Vercel Docs](https://vercel.com/docs)

---

**Buon deploy! 🎊**
