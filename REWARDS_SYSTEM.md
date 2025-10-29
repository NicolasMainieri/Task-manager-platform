# Sistema Premi - Documentazione

## Panoramica

Il sistema di premi permette agli amministratori di creare premi (es: iPhone, buoni regalo, ecc.) che i dipendenti possono riscattare accumulando punti attraverso il completamento delle task.

## Caratteristiche

### Per gli Admin:
- Creare, modificare ed eliminare premi
- Impostare costi in punti totali e mensili
- Gestire la disponibilità e quantità
- Approvare/rifiutare richieste di riscatto
- Monitorare tutti i riscatti

### Per i Dipendenti:
- Visualizzare premi disponibili
- Vedere i propri punti (totali e mensili)
- Richiedere riscatto premi
- Tracciare lo stato delle richieste

## Struttura Database

### Tabella `Reward`
```prisma
model Reward {
  id          String   @id @default(uuid())
  nome        String   // Nome del premio
  descrizione String?  // Descrizione
  immagine    String?  // URL immagine

  // Costi
  costoScore      Int  // Punti totali richiesti
  costoMensile    Int  // Punti mensili richiesti

  // Disponibilità
  quantita        Int      @default(1)  // -1 = illimitato
  disponibile     Boolean  @default(true)

  // Relazioni
  companyId   String
  redemptions RewardRedemption[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Tabella `RewardRedemption`
```prisma
model RewardRedemption {
  id          String   @id @default(uuid())

  // Riferimenti
  rewardId    String
  reward      Reward   @relation(...)
  userId      String
  user        User     @relation(...)

  // Stato
  stato       String   @default("pending")
  // Stati: 'pending', 'approved', 'rejected', 'delivered'

  adminNote   String?  // Note dell'admin
  companyId   String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## API Endpoints

### Premi (Rewards)

#### GET `/api/rewards`
Lista premi disponibili (autenticato)
- **Response**: Array di premi con quantità rimanente

#### GET `/api/rewards/admin`
Lista premi per admin (include premi disabilitati e riscatti)
- **Auth**: Solo admin
- **Response**: Array di premi con statistiche complete

#### POST `/api/rewards`
Crea nuovo premio
- **Auth**: Solo admin
- **Body**:
```json
{
  "nome": "iPhone 17 Pro Max",
  "descrizione": "Ultimo modello Apple",
  "immagine": "https://...",
  "costoScore": 1000,
  "costoMensile": 200,
  "quantita": 1
}
```

#### PUT `/api/rewards/:id`
Aggiorna premio
- **Auth**: Solo admin
- **Body**: Campi da aggiornare

#### DELETE `/api/rewards/:id`
Elimina premio
- **Auth**: Solo admin

#### POST `/api/rewards/:id/redeem`
Riscatta premio
- **Auth**: Dipendente
- **Validazioni**:
  - Punti totali sufficienti
  - Punti mensili sufficienti
  - Premio disponibile
  - Quantità disponibile
  - Non già richiesto

#### GET `/api/rewards/redemptions/my`
Ottieni i propri riscatti
- **Auth**: Utente autenticato

#### PUT `/api/rewards/redemptions/:id`
Aggiorna stato riscatto
- **Auth**: Solo admin
- **Body**:
```json
{
  "stato": "approved",
  "adminNote": "Approvato!"
}
```

#### GET `/api/rewards/stats`
Statistiche utente (punti disponibili)
- **Auth**: Utente autenticato
- **Response**:
```json
{
  "totalScore": 1250,
  "monthlyScore": 350,
  "currentPeriod": "2025-10"
}
```

## Flusso di Lavoro

### 1. Admin Crea Premio
```
Admin → Premi → Nuovo Premio
   ↓
Compila form:
  - Nome: iPhone 17 Pro Max
  - Costo Totale: 1000 punti
  - Costo Mensile: 200 punti
  - Quantità: 1
   ↓
Salva → Premio creato
```

### 2. Dipendente Accumula Punti
```
Dipendente completa task
   ↓
Sistema calcola punti in base a:
  - Difficoltà task
  - Qualità completamento
  - Puntualità
   ↓
Punti aggiunti al totale e mensile
```

### 3. Dipendente Riscatta Premio
```
Dipendente → Premi → Vede premi disponibili
   ↓
Verifica punteggi:
  ✓ Totale: 1050/1000
  ✓ Mensile: 250/200
   ↓
Click "Riscatta Premio"
   ↓
Sistema valida requisiti
   ↓
Crea richiesta (stato: pending)
   ↓
Notifica inviata all'admin
```

### 4. Admin Approva
```
Admin → Premi → Riscatti
   ↓
Vede richiesta pending
   ↓
Opzioni:
  - Approva → stato: approved
  - Rifiuta → stato: rejected (+ motivo)
   ↓
Notifica inviata al dipendente
   ↓
Quando consegnato:
  Admin → Segna come Consegnato
  → stato: delivered
```

## Validazioni

### Riscatto Premio

Il sistema verifica:

1. **Punteggio Totale**
   ```typescript
   if (userTotalScore < reward.costoScore) {
     throw new Error('Punteggio totale insufficiente');
   }
   ```

2. **Punteggio Mensile**
   ```typescript
   if (userMonthlyScore < reward.costoMensile) {
     throw new Error('Punteggio mensile insufficiente');
   }
   ```

3. **Disponibilità Premio**
   ```typescript
   if (!reward.disponibile) {
     throw new Error('Premio non disponibile');
   }
   ```

4. **Quantità Rimanente**
   ```typescript
   const remaining = reward.quantita - redemptionsCount;
   if (remaining <= 0 && reward.quantita !== -1) {
     throw new Error('Premio esaurito');
   }
   ```

5. **Richiesta Duplicata**
   ```typescript
   const existing = await findExisting({
     userId,
     rewardId,
     stato: ['pending', 'approved']
   });
   if (existing) {
     throw new Error('Hai già richiesto questo premio');
   }
   ```

## UI Components

### Admin: `AdminRewardsManagement.tsx`
- **Path**: `/admin` → Menu "Premi"
- **Features**:
  - Griglia premi con card
  - Modal creazione/modifica
  - Modal gestione riscatti
  - Statistiche: totali, disponibili, in attesa
  - Toggle disponibilità premio
  - Approvazione/rifiuto riscatti
  - Segna come consegnato

### Dipendente: `EmployeeRewards.tsx`
- **Path**: `/dashboard` → Menu "Premi"
- **Features**:
  - Card statistiche punti (totale/mensile/riscattati)
  - Tab "Premi Disponibili"
  - Tab "I Miei Riscatti"
  - Indicatori requisiti (verde/rosso)
  - Stato riscatti con colori
  - Note admin visibili

## Notifiche

### Quando un dipendente riscatta:
```typescript
{
  tipo: 'reward_redemption',
  titolo: 'Nuova richiesta premio',
  messaggio: 'Mario Rossi ha richiesto il premio "iPhone 17 Pro Max"',
  link: '/admin/premi'
}
```

### Quando l'admin aggiorna:
```typescript
{
  tipo: 'reward_status',
  titolo: 'Premio approvato', // o rifiutato/consegnato
  messaggio: 'La tua richiesta per "iPhone 17 Pro Max" è stata approvata',
  link: '/premi'
}
```

## Best Practices

### Admin:
1. **Imposta costi realistici** - Basati sui punti medi mensili dei dipendenti
2. **Usa immagini accattivanti** - URL da servizi di hosting immagini
3. **Descrizioni chiare** - Spiega cosa include il premio
4. **Gestisci prontamente** - Approva/rifiuta richieste in 24-48h
5. **Quantità limitata** - Per premi costosi, limita a 1-2 pezzi

### Dipendenti:
1. **Monitora i punti** - Controlla regolarmente il tuo progresso
2. **Pianifica il riscatto** - Alcuni premi richiedono punti mensili alti
3. **Leggi le descrizioni** - Verifica cosa include il premio
4. **Controlla lo stato** - Dopo la richiesta, monitora l'approvazione

## Esempi Configurazione Premi

### Budget Basso (€50-200)
```json
{
  "nome": "Buono Amazon €50",
  "costoScore": 500,
  "costoMensile": 100,
  "quantita": 10
}
```

### Budget Medio (€200-500)
```json
{
  "nome": "AirPods Pro",
  "costoScore": 1500,
  "costoMensile": 300,
  "quantita": 3
}
```

### Budget Alto (€500-1500)
```json
{
  "nome": "iPhone 17 Pro Max",
  "costoScore": 5000,
  "costoMensile": 800,
  "quantita": 1
}
```

### Premio Simbolico
```json
{
  "nome": "Giornata di Ferie Extra",
  "costoScore": 800,
  "costoMensile": 200,
  "quantita": -1
}
```

## Calcolo Punti Mensili

I punti vengono tracciati per periodo (formato: `YYYY-MM`):

```typescript
const now = new Date();
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// Esempio: "2025-10" per Ottobre 2025
```

Ogni mese il contatore mensile riparte da 0, ma il totale si accumula.

## Troubleshooting

### "Punteggio insufficiente" ma ho abbastanza punti
- **Causa**: Controlla se ti mancano punti MENSILI
- **Soluzione**: Aspetta il prossimo mese o completa più task questo mese

### "Hai già richiesto questo premio"
- **Causa**: Hai una richiesta pending o approved
- **Soluzione**: Aspetta l'approvazione o contatta l'admin

### "Premio esaurito"
- **Causa**: Tutti i pezzi sono stati riscattati
- **Soluzione**: Chiedi all'admin di aumentare la quantità

### Premi non visibili ai dipendenti
- **Causa**: Premio disabilitato dall'admin
- **Soluzione**: Admin deve riattivare il premio

---

## Roadmap Future

- [ ] Upload immagini diretto (senza URL esterni)
- [ ] Categorie premi (tech, viaggi, buoni, ecc.)
- [ ] Sistema di wishlist per dipendenti
- [ ] Report analytics sui premi più richiesti
- [ ] Premi a scadenza (disponibili solo per un periodo)
- [ ] Premi team-based (riscattabili da un team intero)
- [ ] Badge e achievement per milestone

---

Buon lavoro con il sistema premi! 🎁🏆
