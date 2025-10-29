# 🚀 Task Management Platform - Planora

Piattaforma completa di gestione aziendale multi-tenant con task management, rewards system, progetti, chat, video call e molto altro.

## 📋 Indice

- [Caratteristiche Principali](#caratteristiche-principali)
- [Requisiti](#requisiti)
- [Installazione Rapida](#installazione-rapida)
- [Configurazione](#configurazione)
- [Avvio del Progetto](#avvio-del-progetto)
- [Struttura del Progetto](#struttura-del-progetto)
- [Funzionalità](#funzionalit%C3%A0)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ✨ Caratteristiche Principali

- 🏢 **Multi-Tenant**: Sistema isolato per azienda
- 📊 **Task Management**: Gestione completa task con subtask, timer di lavoro, assegnazioni
- 🎯 **Progetti**: Sistema di progetti con cartelle, documenti, note e task collegati
- 🏆 **Sistema Premi**: Gamification con punti, rewards e riscatti con gestione ritiro
- 💬 **Chat Aziendale**: Messaggistica in tempo reale tra dipendenti
- 📹 **Video Call**: Sistema di video chiamate integrate
- 📅 **Calendario**: Gestione eventi con integrazione Google Calendar
- 📧 **Email**: Gestione email con integrazione Gmail/IMAP
- 🤖 **Brain AI**: Assistente AI multi-model (OpenAI, Claude, Groq)
- 📈 **Analytics**: Dashboards e statistiche dettagliate
- 👥 **Gestione Utenti**: Ruoli, permessi e richieste

## 🛠️ Requisiti

- **Node.js**: v18 o superiore
- **npm** o **yarn**
- **Database**: SQLite (incluso) o PostgreSQL (configurabile)

## 🚀 Installazione Rapida

### 1. Clona il Repository

```bash
git clone <url-repository>
cd task-management-platform
```

### 2. Installa le Dipendenze

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configura le Variabili d'Ambiente

```bash
# Backend
cd backend
cp .env.example .env
# Modifica .env con i tuoi valori

# Frontend
cd ../frontend
cp .env.example .env
# Modifica .env con i tuoi valori
```

### 4. Inizializza il Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 5. Avvia i Server

```bash
# Terminale 1 - Backend
cd backend
npm run dev

# Terminale 2 - Frontend
cd frontend
npm run dev
```

L'applicazione sarà disponibile su:
- Frontend: http://localhost:5174
- Backend API: http://localhost:4000/api

## ⚙️ Configurazione

### Backend (.env)

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret (CAMBIA IN PRODUZIONE!)
JWT_SECRET="your-super-secret-jwt-key"

# Server
PORT=4000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Integr

azioni Opzionali
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GROQ_API_KEY=your-groq-api-key
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:4000
```

## 📁 Struttura del Progetto

```
task-management-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Schema database
│   │   └── dev.db            # Database SQLite
│   ├── src/
│   │   ├── controllers/      # Logica business
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, validazione
│   │   └── index.ts          # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Componenti React
│   │   ├── pages/            # Pagine principali
│   │   ├── contexts/         # Context API (Auth, Theme)
│   │   └── App.tsx
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## 🎯 Funzionalità

### Per Amministratori

- 👥 Gestione utenti e permessi
- 🏢 Configurazione azienda
- 🎁 Gestione premi e approvazioni
- 📊 Analytics e report avanzati
- ✅ Approvazione richieste dipendenti
- 📈 Monitoraggio progressi e performance
- 🗂️ Gestione progetti e task

### Per Dipendenti

- ✅ Gestione task personali con timer
- 🏆 Accumulo punti e riscatto premi
- 💬 Chat aziendale
- 📹 Video chiamate
- 📅 Calendario eventi
- 🤖 Assistente AI (Brain)
- 📧 Gestione email
- 🗂️ Accesso a progetti assegnati

## 🚀 Deployment

### Render.com (Consigliato)

1. Collega il repository a Render
2. Crea un Web Service per il backend:
   - Build Command: `cd backend && npm install && npx prisma generate && npx prisma db push`
   - Start Command: `cd backend && npm start`
3. Crea un Static Site per il frontend:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

### Vercel (Solo Frontend)

```bash
cd frontend
npm run build
vercel --prod
```

### Database in Produzione

Per produzione, considera PostgreSQL:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 🔧 Troubleshooting

### Porta già in uso

```bash
# Windows
netstat -ano | findstr :4000
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### Problemi con Prisma

```bash
cd backend
rm -rf node_modules/.prisma
npx prisma generate
npx prisma db push
```

### Reset Database

```bash
cd backend
rm prisma/dev.db
npx prisma db push
```

### Frontend non si connette al Backend

Verifica che:
1. Il backend sia avviato su porta 4000
2. Il file `frontend/.env` contenga `VITE_API_URL=http://localhost:4000`
3. CORS sia configurato correttamente in `backend/.env`

## 📝 Primo Accesso

1. Vai su http://localhost:5174
2. Clicca su "Registra Azienda"
3. Compila il form con i dati dell'azienda
4. Il primo utente sarà automaticamente Admin
5. Accedi con le credenziali create

## 🤝 Supporto

Per problemi o domande:
- Crea una issue su GitHub
- Consulta la documentazione inline nel codice

## 📄 Licenza

Proprietaria - Tutti i diritti riservati

---

Sviluppato con ❤️ per gestire team in modo efficiente
