# 🤖 AI Features Documentation

Questa piattaforma integra funzionalità AI avanzate powered by OpenAI per migliorare produttività, automazione e decision-making.

## 📋 Indice

1. [Setup Iniziale](#setup-iniziale)
2. [Task AI Assistant](#task-ai-assistant)
3. [Smart Ticket Routing](#smart-ticket-routing)
4. [Productivity Analytics](#productivity-analytics)
5. [Notes AI Assistant](#notes-ai-assistant)
6. [Email & Calendar Intelligence](#email--calendar-intelligence)
7. [Company Chatbot](#company-chatbot)

---

## Setup Iniziale

### 1. Configurazione API Key

Aggiungi la tua chiave API OpenAI nel file `.env` del backend:

```bash
# Backend .env
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o-mini"  # or gpt-4, gpt-4-turbo, etc.
```

**IMPORTANTE**:
- Non committare mai la tua API key su Git
- Il file `.env` è già nel `.gitignore`
- Usa `.env.example` come template

### 2. Installazione Dipendenze

```bash
cd backend
npm install  # openai package già installato
```

### 3. Verifica Setup

```bash
# Test che il backend si avvii correttamente
npm run dev
```

---

## 🎯 Task AI Assistant

Funzionalità AI per aiutare nella gestione e pianificazione dei task.

### API Endpoints

#### 1. Suggerisci Priorità e Difficoltà

**POST** `/api/ai/tasks/suggest-metadata`

Analizza il titolo e descrizione di un task e suggerisce priorità e difficoltà appropriate.

**Request Body:**
```json
{
  "titolo": "Implementare sistema di autenticazione OAuth2",
  "descrizione": "Integrare Google e Microsoft OAuth con JWT tokens"
}
```

**Response:**
```json
{
  "priorita": "alta",
  "difficolta": 4,
  "reasoning": "L'implementazione OAuth2 richiede conoscenze di sicurezza avanzate e integrazione con provider esterni. È critico per la sicurezza dell'applicazione."
}
```

#### 2. Genera Subtask Automaticamente

**POST** `/api/ai/tasks/generate-subtasks`

Genera automaticamente una lista di subtask actionable da un task principale.

**Request Body:**
```json
{
  "titolo": "Implementare sistema di notifiche",
  "descrizione": "Sistema real-time con email, push e in-app notifications",
  "numSubtasks": 5
}
```

**Response:**
```json
{
  "subtasks": [
    {
      "titolo": "Configurare servizio email (SendGrid/AWS SES)",
      "descrizione": "Setup SMTP e template email"
    },
    {
      "titolo": "Implementare WebSocket per notifiche real-time",
      "descrizione": "Configurare Socket.io per comunicazione bidirezionale"
    },
    {
      "titolo": "Creare modello database per notifiche",
      "descrizione": "Schema Prisma con stato letto/non letto"
    },
    {
      "titolo": "Sviluppare componente UI toast notifications",
      "descrizione": "React component per notifiche in-app"
    },
    {
      "titolo": "Implementare sistema di preferenze notifiche",
      "descrizione": "Permettere agli utenti di configurare canali preferiti"
    }
  ]
}
```

#### 3. Stima Tempo di Completamento

**POST** `/api/ai/tasks/estimate-time`

Stima il tempo necessario per completare un task basandosi su difficoltà e task simili passati.

**Request Body:**
```json
{
  "titolo": "Refactoring sistema di routing",
  "descrizione": "Migrare da Express a Fastify per migliori performance",
  "difficolta": 3
}
```

**Response:**
```json
{
  "stima_ore": 8,
  "stima_min": 6,
  "stima_max": 12,
  "reasoning": "Basandosi su task simili di refactoring, la migrazione richiede circa 8 ore considerando test e debugging. Range 6-12 ore a seconda della complessità del routing esistente."
}
```

---

## 🎫 Smart Ticket Routing

AI per analizzare, categorizzare e instradare ticket automaticamente.

### API Endpoints

#### 1. Analizza Ticket e Suggerisci Routing

**POST** `/api/ai/tickets/analyze`

Analizza il contenuto di un ticket e suggerisce categoria, ruolo e urgenza ottimali.

**Request Body:**
```json
{
  "titolo": "Bug nel sistema di pagamento",
  "descrizione": "Gli utenti non riescono a completare il checkout con PayPal. Errore 500 nel log."
}
```

**Response:**
```json
{
  "categoria_suggerita": "uuid-della-categoria-bug-backend",
  "ruolo_suggerito": "uuid-ruolo-backend-developer",
  "confidence": 0.92,
  "reasoning": "Il ticket riguarda un errore server-side nel sistema di pagamento, richiede competenze backend per debug e fix.",
  "urgenza_suggerita": "alta"
}
```

#### 2. Suggerisci Soluzioni da Ticket Simili

**GET** `/api/ai/tickets/:ticketId/suggest-solutions`

Cerca ticket simili risolti in passato e suggerisce soluzioni.

**Response:**
```json
{
  "soluzioni_suggerite": [
    {
      "soluzione": "Verificare le credenziali API PayPal nell'ambiente di produzione. Spesso l'errore 500 è causato da chiavi sandbox usate in prod.",
      "confidence": 0.85,
      "reasoning": "Ticket simile #1234 risolto con questo approccio"
    },
    {
      "soluzione": "Controllare il timeout delle richieste HTTP verso PayPal API. Aumentare a 30 secondi se necessario.",
      "confidence": 0.72,
      "reasoning": "Ticket #5678 aveva lo stesso pattern di errore"
    }
  ]
}
```

#### 3. Analizza Sentiment di Messaggi

**POST** `/api/ai/tickets/analyze-sentiment`

Analizza il tono emotivo e urgenza di un messaggio.

**Request Body:**
```json
{
  "contenuto": "URGENTE! Il sistema è completamente down da 2 ore, i clienti non possono accedere e stiamo perdendo vendite!"
}
```

**Response:**
```json
{
  "sentiment": "urgente",
  "score": -0.7,
  "emotional_tone": "Frustrato e preoccupato per l'impatto business",
  "urgency_level": "alto",
  "requires_immediate_attention": true
}
```

---

## 📊 Productivity Analytics

Analisi AI dei pattern di produttività con suggerimenti personalizzati.

### API Endpoints

#### Analizza Produttività Personale

**GET** `/api/ai/productivity/analyze`

Analizza i dati di produttività dell'utente e fornisce insights e suggerimenti.

**Response:**
```json
{
  "productivity_score": 78,
  "strengths": [
    "Alto tasso di completamento task (85%)",
    "Ottima gestione delle priorità",
    "Consistenza nel completare task durante le ore mattutine"
  ],
  "areas_for_improvement": [
    "Tendenza a procrastinare task di difficoltà alta",
    "Troppe interruzioni nel pomeriggio",
    "Scadenze mancate su task senza priorità chiara"
  ],
  "suggestions": [
    {
      "type": "time_management",
      "suggestion": "Riserva le prime 2 ore della giornata (9-11) per task ad alta difficoltà, quando la tua produttività è al massimo.",
      "priority": "alta"
    },
    {
      "type": "task_prioritization",
      "suggestion": "Assegna sempre una priorità esplicita ai task entro 1 ora dalla creazione per evitare procrastinazione.",
      "priority": "media"
    },
    {
      "type": "break_schedule",
      "suggestion": "Implementa tecnica Pomodoro (25 min lavoro + 5 min pausa) nelle ore pomeridiane per mantenere focus.",
      "priority": "media"
    }
  ],
  "burnout_risk": "medio",
  "burnout_indicators": [
    "Aumento delle ore lavorative (+15% rispetto al mese scorso)",
    "Riduzione qualità completamento task",
    "Meno pause durante la giornata"
  ]
}
```

---

## 📝 Notes AI Assistant

Funzionalità AI per gestione intelligente delle note.

### API Endpoints

#### 1. Riassumi Nota

**POST** `/api/ai/notes/summarize`

Crea un riassunto conciso di una nota lunga.

**Request Body:**
```json
{
  "noteId": "uuid-della-nota",
  "maxWords": 100
}
```

**Response:**
```json
{
  "summary": "Meeting Q1 2025 Planning: Discussi obiettivi trimestre con focus su migrazione cloud e nuovo sistema CRM. Budget approvato €50K. Team di 5 sviluppatori assegnati. Deadline finale 31 marzo. Rischi identificati: integrazione legacy systems e formazione utenti.",
  "key_points": [
    "Obiettivo: Migrazione cloud completa entro Q1",
    "Budget: €50,000 approvati",
    "Team: 5 sviluppatori full-time",
    "Rischi: Integrazione legacy systems",
    "Deadline: 31 marzo 2025"
  ],
  "word_count": 87
}
```

#### 2. Estrai Action Items

**POST** `/api/ai/notes/extract-action-items`

Identifica automaticamente tutti i task da fare menzionati nella nota.

**Request Body:**
```json
{
  "noteId": "uuid-della-nota"
}
```

**Response:**
```json
{
  "action_items": [
    {
      "task": "Preparare presentazione per stakeholders entro venerdì",
      "priority": "alta",
      "mentioned_people": ["Marco", "CEO"]
    },
    {
      "task": "Schedulare meeting con team DevOps per pianificare migrazione",
      "priority": "alta",
      "mentioned_people": ["Team DevOps"]
    },
    {
      "task": "Richiedere preventivi da 3 cloud provider",
      "priority": "media",
      "mentioned_people": []
    },
    {
      "task": "Aggiornare documentazione tecnica",
      "priority": "bassa",
      "mentioned_people": ["Luca"]
    }
  ]
}
```

#### 3. Trova Note Correlate

**GET** `/api/ai/notes/:noteId/related`

Trova note semanticamente correlate basandosi sul contenuto.

**Response:**
```json
{
  "related_notes": [
    {
      "note_id": "uuid-1",
      "relevance_score": 0.89,
      "reasoning": "Entrambe discutono la migrazione cloud e menzionano AWS come provider"
    },
    {
      "note_id": "uuid-2",
      "relevance_score": 0.76,
      "reasoning": "Argomenti comuni: budget Q1, team allocation, deadline marzo"
    },
    {
      "note_id": "uuid-3",
      "relevance_score": 0.65,
      "reasoning": "Meeting notes dello stesso progetto con overlap di stakeholders"
    }
  ]
}
```

---

## 📧 Email & Calendar Intelligence

AI per gestione intelligente di email e calendario.

### API Endpoints

#### 1. Suggerisci Risposta Email

**POST** `/api/ai/email/suggest-response`

Genera una bozza di risposta appropriata per una email.

**Request Body:**
```json
{
  "emailContent": "Ciao team,\n\nPotreste confermare la vostra disponibilità per il meeting di review del progetto la prossima settimana?\n\nGrazie,\nMaria",
  "context": "Sono disponibile martedì e giovedì",
  "tone": "formal"
}
```

**Response:**
```json
{
  "suggested_response": "Gentile Maria,\n\nGrazie per l'invito. Confermo la mia disponibilità per il meeting di review. Sono disponibile martedì e giovedì della prossima settimana.\n\nFammi sapere quale giorno preferite e provvederò a bloccare l'agenda.\n\nCordiali saluti",
  "key_points_to_address": [
    "Confermare disponibilità",
    "Specificare giorni disponibili",
    "Richiedere conferma orario"
  ],
  "tone_match": "Risposta formale e professionale come richiesto"
}
```

#### 2. Estrai Meeting e Deadline da Email

**POST** `/api/ai/email/extract-meetings`

Identifica automaticamente meeting e deadline menzionati nell'email.

**Request Body:**
```json
{
  "emailContent": "Ciao,\n\nTi ricordo il nostro meeting di domani alle 14:30 in sala riunioni B per discutere il progetto. Inoltre, la deadline per inviare il report è venerdì 20 gennaio entro le 17:00.\n\nA domani!"
}
```

**Response:**
```json
{
  "meetings": [
    {
      "title": "Meeting progetto",
      "date": "2025-01-16",
      "time": "14:30",
      "duration_minutes": 60,
      "location": "Sala riunioni B"
    }
  ],
  "deadlines": [
    {
      "task": "Inviare report",
      "date": "2025-01-20",
      "urgency": "media"
    }
  ]
}
```

#### 3. Suggerisci Slot per Meeting

**POST** `/api/ai/calendar/suggest-slots`

Suggerisce slot ottimali per un meeting considerando disponibilità e produttività.

**Request Body:**
```json
{
  "participants": ["alice@company.com", "bob@company.com", "charlie@company.com"],
  "duration": 60,
  "existingMeetings": [
    { "start": "2025-01-16T09:00:00", "end": "2025-01-16T10:00:00" },
    { "start": "2025-01-16T14:00:00", "end": "2025-01-16T15:30:00" }
  ],
  "workingHours": { "start": "09:00", "end": "18:00" }
}
```

**Response:**
```json
{
  "suggested_slots": [
    {
      "date": "2025-01-16",
      "start_time": "10:30",
      "end_time": "11:30",
      "score": 0.95,
      "reasoning": "Slot mattutino quando la produttività è alta, buffer di 30 min dopo meeting precedente, tutti i partecipanti disponibili"
    },
    {
      "date": "2025-01-16",
      "start_time": "16:00",
      "end_time": "17:00",
      "score": 0.82,
      "reasoning": "Ultima parte della giornata, permette di concludere decisioni prima di fine giornata"
    },
    {
      "date": "2025-01-17",
      "start_time": "09:00",
      "end_time": "10:00",
      "score": 0.88,
      "reasoning": "Inizio giornata fresco, ottimo per meeting strategici"
    }
  ]
}
```

---

## 💬 Company Chatbot

Assistente virtuale aziendale intelligente per rispondere a domande su task, progetti e procedure.

### API Endpoints

#### 1. Fai una Domanda al Chatbot

**POST** `/api/ai/chatbot/ask`

Il chatbot cerca informazioni rilevanti nel sistema e risponde alla domanda.

**Request Body:**
```json
{
  "question": "Quali sono i task in scadenza questa settimana per il progetto mobile app?"
}
```

**Response:**
```json
{
  "answer": "Ho trovato 3 task in scadenza questa settimana per il progetto mobile app:\n\n1. **Implementazione login social** (Scadenza: Mercoledì 18/01)\n   - Priorità: Alta\n   - Assegnato a: Marco Rossi\n   - Stato: In corso\n\n2. **Testing performance su iOS** (Scadenza: Giovedì 19/01)\n   - Priorità: Media\n   - Assegnato a: Laura Bianchi\n   - Stato: Da fare\n\n3. **Ottimizzazione caricamento immagini** (Scadenza: Venerdì 20/01)\n   - Priorità: Alta\n   - Assegnato a: Giuseppe Verdi\n   - Stato: In corso\n\nTi consiglio di dare priorità al testing iOS che è ancora da iniziare.",
  "confidence": 0.91,
  "sources": [
    "Task #1234: Implementazione login social",
    "Task #1235: Testing performance iOS",
    "Task #1236: Ottimizzazione immagini"
  ],
  "follow_up_questions": [
    "Vuoi vedere i dettagli di un task specifico?",
    "Quali membri del team sono più carichi di lavoro?",
    "Ci sono blockers su questi task?"
  ]
}
```

**Esempi di domande che il chatbot può rispondere:**

- "Quali task ho assegnati oggi?"
- "Chi è responsabile del progetto X?"
- "Come si crea un nuovo ticket?"
- "Quali sono le procedure per richiedere ferie?"
- "Chi contatto per problemi con il sistema di deploy?"
- "Mostrami i progetti attivi del team marketing"
- "Qual è la deadline del prossimo sprint?"

#### 2. Genera Contenuto Onboarding (Solo Admin)

**GET** `/api/ai/chatbot/onboarding/:employeeId`

Genera automaticamente contenuto di onboarding personalizzato per un nuovo dipendente.

**Response:**
```json
{
  "welcome_message": "Benvenuto/a in TechCorp! Siamo entusiasti di averti nel nostro team come Backend Developer. Questa guida ti aiuterà a iniziare il tuo percorso con noi e a integrarti rapidamente nel team.",
  "first_week_checklist": [
    {
      "task": "Setup ambiente di sviluppo",
      "description": "Installa Node.js, Docker, VS Code e configura l'accesso ai repository GitHub",
      "priority": "alta"
    },
    {
      "task": "Meeting 1-on-1 con il tuo manager",
      "description": "Discussione obiettivi, aspettative e piano di crescita per i primi 90 giorni",
      "priority": "alta"
    },
    {
      "task": "Completare training sulla sicurezza aziendale",
      "description": "Corso online obbligatorio su GDPR, security best practices e policy aziendali",
      "priority": "alta"
    },
    {
      "task": "Conoscere il team",
      "description": "Coffee chat informale con ogni membro del team (programmato dal team leader)",
      "priority": "media"
    },
    {
      "task": "Studiare architettura sistema",
      "description": "Leggere documentazione tecnica e architettura microservizi dell'applicazione principale",
      "priority": "media"
    },
    {
      "task": "Primo ticket assignment",
      "description": "Risolvere un bug di difficoltà bassa per familiarizzare con il codebase",
      "priority": "bassa"
    }
  ],
  "key_contacts": [
    {
      "role": "Team Leader - Marco Rossi",
      "why_contact": "Per domande tecniche, code review e guidance su architettura"
    },
    {
      "role": "HR Manager - Laura Bianchi",
      "why_contact": "Per questioni amministrative, benefit e policy aziendali"
    },
    {
      "role": "DevOps Lead - Giuseppe Verdi",
      "why_contact": "Per accesso a sistemi, deployment e configurazione ambienti"
    },
    {
      "role": "Buddy - Alice Neri",
      "why_contact": "Il tuo punto di riferimento per qualsiasi domanda durante il primo mese"
    }
  ],
  "learning_resources": [
    {
      "topic": "Codebase walkthrough",
      "description": "Video tutorial che spiega struttura del progetto, pattern usati e best practices del team",
      "estimated_time": "2 ore"
    },
    {
      "topic": "API Documentation",
      "description": "Documentazione completa delle API interne con esempi e use cases",
      "estimated_time": "3 ore"
    },
    {
      "topic": "Testing Guidelines",
      "description": "Guida su come scrivere unit test, integration test e best practices TDD",
      "estimated_time": "1 ora"
    },
    {
      "topic": "Deployment Process",
      "description": "Come funziona il nostro CI/CD, staging, produzione e rollback procedure",
      "estimated_time": "1.5 ore"
    }
  ]
}
```

---

## 🔧 Best Practices

### Gestione Costi API

- **Usa modelli appropriati**: `gpt-4o-mini` per task semplici, `gpt-4` per analisi complesse
- **Implementa caching**: Cache le risposte comuni per ridurre chiamate API
- **Limita token**: Usa `maxTokens` per controllare la lunghezza delle risposte
- **Batch requests**: Raggruppa richieste simili quando possibile

### Sicurezza

- ✅ Tutte le API AI richiedono autenticazione JWT
- ✅ Isolamento dati per company (multi-tenant)
- ✅ Non inviare mai dati sensibili (password, API keys) all'AI
- ✅ Validazione input per prevenire prompt injection

### Performance

- Usa `temperature` bassa (0.2-0.3) per risposte deterministiche
- Usa `jsonMode: true` quando possibile per parsing più affidabile
- Implementa timeout appropriati per le chiamate API
- Monitora latenza e implementa fallback per timeout

### Error Handling

```typescript
try {
  const result = await aiTaskService.suggestTaskMetadata(title, description);
  // Use result
} catch (error) {
  if (error.message.includes('API key not configured')) {
    // Gestisci mancanza API key
  } else if (error.message.includes('rate limit')) {
    // Gestisci rate limit
  } else {
    // Generic error
  }
}
```

---

## 📈 Metriche e Monitoring

Metriche consigliate da trackare:

- **API Usage**: Numero chiamate per endpoint
- **Response Time**: Latenza media per tipo di richiesta
- **Success Rate**: % di chiamate riuscite vs fallite
- **Cost**: Costo mensile per feature AI
- **User Engagement**: Quanti utenti usano le feature AI
- **Accuracy**: Feedback utenti sulla qualità delle risposte

---

## 🚀 Prossimi Sviluppi

Feature AI in roadmap:

- [ ] **Code Review AI**: Analisi automatica PR con suggerimenti
- [ ] **Meeting Transcription**: Trascrizione automatica videochiamate con action items
- [ ] **Smart Search**: Ricerca semantica cross-platform (task, note, email)
- [ ] **Predictive Analytics**: Previsione deadline misses e bottleneck
- [ ] **Voice Assistant**: Integrazione voice-to-text per creare task vocalmente
- [ ] **AI-Generated Reports**: Report automatici su produttività e KPI

---

## 🆘 Troubleshooting

### Errore: "OpenAI API key not configured"

**Soluzione**: Aggiungi `OPENAI_API_KEY` al file `.env` del backend

### Errore: "Rate limit exceeded"

**Soluzione**: OpenAI ha limiti di rate. Implementa retry con exponential backoff o upgrade piano OpenAI

### Risposte lente (>10 secondi)

**Possibili cause**:
- Prompt troppo lunghi
- Modello troppo pesante (prova gpt-4o-mini)
- Connessione OpenAI API lenta

### Risposte non accurate

**Suggerimenti**:
- Aggiungi più contesto nei prompt
- Abbassa `temperature` per risposte più deterministiche
- Fornisci esempi nel prompt (few-shot learning)

---

## 📞 Support

Per domande o problemi:
- 📧 Email: support@yourcompany.com
- 💬 Slack: #ai-features
- 📚 Docs: https://docs.yourcompany.com/ai

---

**Ultimo aggiornamento**: Gennaio 2025
**Versione API**: 1.0.0
