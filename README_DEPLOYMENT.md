# Quick Start - Deployment

## 🚨 Problema Attuale

Vedi "Cannot GET /" perché stai accedendo al **backend** su Render. Il backend è solo un'API REST, non ha un'interfaccia web!

## ✅ Soluzione Rapida

Devi deployare anche il **frontend** (l'interfaccia utente React).

### Step 1: Configura l'URL del Backend

1. Prendi l'URL del tuo backend Render (es: `https://task-management-api.onrender.com`)

2. Apri: `frontend/.env.production`

3. Modifica:
```env
VITE_API_URL=https://task-management-api.onrender.com
```

### Step 2: Deploy Frontend su Vercel (5 minuti)

1. Vai su [vercel.com](https://vercel.com) e registrati

2. Click "New Project" → Importa da GitHub

3. Configurazione:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variable**:
     - Nome: `VITE_API_URL`
     - Valore: `https://tuo-backend.onrender.com`

4. Click "Deploy"

### Step 3: Configura CORS Backend

Nel file `backend/src/index.ts`, aggiungi:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://tuo-frontend.vercel.app' // ← Aggiungi questo
  ]
}));
```

Commit e push → Render rideploya automaticamente.

### Step 4: Accedi al Sito!

Vai su: `https://tuo-frontend.vercel.app`

---

## 📚 Documentazione Completa

- **Deployment Completo**: Vedi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Sistema Premi**: Vedi [REWARDS_SYSTEM.md](./REWARDS_SYSTEM.md)

---

## 🎯 Come Funziona

```
Utente → Frontend (Vercel) → Backend API (Render) → Database SQLite
         https://frontend        https://backend      (nel backend)
```

Gli utenti accedono **SOLO** al frontend!

---

## 🆘 Problemi Comuni

### "Cannot GET /"
**Problema**: Stai accedendo al backend
**Soluzione**: Accedi al frontend invece

### "Network Error"
**Problema**: CORS non configurato
**Soluzione**: Aggiungi frontend URL nel CORS

### Backend lento
**Problema**: Render free tier va in sleep
**Soluzione**: Primo caricamento ~30 secondi (normale)

---

## 🎁 Sistema Premi Implementato

Abbiamo appena implementato un sistema completo di premi per gamificare la produttività!

### Features:
✅ Admin può creare premi (es: iPhone, buoni regalo)
✅ Dipendenti vedono i premi e i propri punti
✅ Sistema di riscatto con requisiti (punti totali + mensili)
✅ Workflow approvazione: pending → approved → delivered
✅ Notifiche automatiche admin/dipendente

**Accedi**: Menu → "Premi" 🎉

---

Hai bisogno di aiuto? Apri [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)!
