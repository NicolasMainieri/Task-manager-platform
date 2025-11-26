# Planora - Deployment su XAMPP/MySQL

![Planora Logo](https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=Planora)

Sistema completo di gestione aziendale con task management, CRM, progetti, videochiamate, chat e molto altro.

## 🚀 Quick Start

```bash
# 1. Verifica prerequisiti
check-prerequisites.bat

# 2. Build per XAMPP
build-for-xampp.bat

# 3. Segui la guida di deployment
# Vedi: XAMPP-DEPLOYMENT-GUIDE.md
```

## 📋 Documentazione

| Documento | Descrizione |
|-----------|-------------|
| [QUICK-START-XAMPP.md](QUICK-START-XAMPP.md) | Guida rapida in 5 passi |
| [XAMPP-DEPLOYMENT-GUIDE.md](XAMPP-DEPLOYMENT-GUIDE.md) | Guida completa e dettagliata |
| [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) | Checklist completa per non dimenticare nulla |
| [FAQ-XAMPP.md](FAQ-XAMPP.md) | Domande frequenti e problemi comuni |
| [apache-config-example.conf](apache-config-example.conf) | Configurazione Apache di esempio |

## 🛠️ Tecnologie

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Three.js** - Animazioni 3D
- **Socket.IO** - Real-time communication

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Prisma** - ORM per MySQL
- **Socket.IO** - WebSocket server
- **JWT** - Autenticazione
- **OpenAI** - AI features

### Database
- **MySQL** - Database principale (via XAMPP)

## 📦 Struttura Deployment

```
www.licenzeoriginali.com/
├── planora/              # Frontend React
│   ├── index.html
│   ├── assets/
│   └── .htaccess
│
└── planora-api/          # Backend Node.js (porta 4000)
    ├── dist/             # Codice compilato
    ├── prisma/           # Schema e migrations
    ├── uploads/          # File caricati
    ├── .env              # Configurazione
    └── package.json
```

## ⚙️ Configurazione Richiesta

### Database MySQL
```env
DATABASE_URL="mysql://root:password@localhost:3306/planora_db"
```

### Server
```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://www.licenzeoriginali.com/planora
JWT_SECRET=your-super-secret-key-min-32-chars
```

## 🔧 Script Disponibili

| Script | Descrizione |
|--------|-------------|
| `check-prerequisites.bat` | Verifica prerequisiti (Node.js, npm, ecc.) |
| `build-for-xampp.bat` | Build completo per Windows |
| `build-for-xampp.sh` | Build completo per Linux/Mac |

## 📊 Features Principali

- ✅ **Gestione Task** - Kanban board, scadenze, priorità
- ✅ **Progetti** - Organizzazione progetti con membri e documenti
- ✅ **CRM Personalizzabile** - Crea i tuoi tracciati cliente
- ✅ **Chat Aziendale** - Messaggi, menzioni, thread
- ✅ **Videochiamate** - WebRTC con screen sharing
- ✅ **Calendario** - Eventi, meeting, integrazioni esterne
- ✅ **Sistema Note** - Tipo Notion con AI
- ✅ **Gamification** - Punti, reward, leaderboard
- ✅ **Preventivi AI** - Generazione automatica preventivi
- ✅ **Newsletter** - Editor HTML e invio programmato
- ✅ **Drive** - Upload documenti e cartelle

## 🚦 Requisiti Sistema

### Server (Produzione)
- XAMPP con Apache 2.4+
- MySQL 5.7+ o 8.0+
- Node.js 18+
- PM2 (process manager)
- SSL Certificate (consigliato)

### PC (Sviluppo)
- Node.js 18+
- npm 9+
- TypeScript 5+
- Git (opzionale)

## 📝 Processo di Deployment

### 1. Preparazione (sul tuo PC)

```bash
# Verifica prerequisiti
check-prerequisites.bat

# Build progetto
build-for-xampp.bat
```

### 2. Database (sul server)

```sql
-- In phpMyAdmin
CREATE DATABASE planora_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Upload File (con FileZilla)

- Frontend → `/htdocs/planora/`
- Backend → `/htdocs/planora-api/`

### 4. Configurazione (SSH sul server)

```bash
cd /htdocs/planora-api
cp .env.example .env
nano .env  # Modifica credenziali

npm install --production
npx prisma generate
npx prisma migrate deploy
```

### 5. Avvio Backend

```bash
npm install -g pm2
pm2 start dist/index.js --name planora-api
pm2 startup
pm2 save
```

### 6. Verifica

- Frontend: https://www.licenzeoriginali.com/planora
- Backend: https://www.licenzeoriginali.com/planora-api/api/health

## 🔒 Sicurezza

- [ ] Cambia `JWT_SECRET` con valore random
- [ ] Usa password MySQL robusta
- [ ] Abilita HTTPS (SSL/TLS)
- [ ] Configura firewall
- [ ] Backup automatici database
- [ ] File `.env` non accessibile via web

## 🐛 Troubleshooting

### Frontend non si carica
```bash
# Verifica .htaccess
cat /htdocs/planora/.htaccess

# Verifica mod_rewrite
sudo a2enmod rewrite
sudo service apache2 restart
```

### Backend non risponde
```bash
# Verifica PM2
pm2 status

# Controlla log
pm2 logs planora-api

# Riavvia
pm2 restart planora-api
```

### Errori database
```bash
# Testa connessione
mysql -u root -p planora_db

# Verifica migrazioni
npx prisma migrate status
```

Vedi [FAQ-XAMPP.md](FAQ-XAMPP.md) per altri problemi comuni.

## 📚 Risorse Utili

- [Prisma Docs](https://www.prisma.io/docs)
- [PM2 Docs](https://pm2.keymetrics.io/docs)
- [Apache Docs](https://httpd.apache.org/docs/)
- [XAMPP FAQ](https://www.apachefriends.org/faq.html)

## 🆘 Supporto

Per problemi o domande:

1. Consulta [FAQ-XAMPP.md](FAQ-XAMPP.md)
2. Verifica i log (browser, PM2, Apache)
3. Controlla [XAMPP-DEPLOYMENT-GUIDE.md](XAMPP-DEPLOYMENT-GUIDE.md)
4. Cerca su Stack Overflow
5. Contatta il supporto hosting

## 📄 Licenza

[Inserisci la tua licenza qui]

## 👨‍💻 Autore

[Il tuo nome/azienda]

---

**Versione**: 1.0.0
**Ultimo aggiornamento**: Gennaio 2025

---

## 🎯 Next Steps

Dopo il deployment:

1. ✅ Testa tutte le funzionalità
2. ✅ Configura backup automatici
3. ✅ Configura SSL/HTTPS
4. ✅ Ottimizza performance (cache, CDN)
5. ✅ Configura monitoraggio uptime
6. ✅ Prepara documentazione utente

---

**Ready to deploy? Start with:** `check-prerequisites.bat` 🚀
