# Istruzioni per Testare la Sezione Studi Legali

## Passo 1: Pulire la Cache del Browser

1. Apri il browser in modalità incognito O pulisci la cache:
   - Chrome: `Ctrl+Shift+Delete` → Seleziona "Cookie e dati dei siti" → Cancella
   - Firefox: `Ctrl+Shift+Delete` → Seleziona "Cookie" → Cancella

## Passo 2: Fare Login

1. Vai su `http://localhost:5173`
2. Clicca su "Login"
3. Usa queste credenziali:

```
Email: admin@valior.com
Password: admin123
```

## Passo 3: Verificare il Menu

Dopo il login, dovresti vedere nella sidebar sinistra:

- ✅ Dashboard
- ✅ Tutti i Dipendenti
- ✅ Tasks
- ✅ Progetti
- ✅ Drive
- ✅ CRM
- ✅ Fatture
- ✅ Pagamenti
- ✅ Presenze
- ✅ Assenze
- ✅ Richieste Dipendenti
- ✅ Chat
- ✅ Contatti
- ✅ Ticket
- ⚖️ **Studi Legali** ← QUESTO DEVE ESSERCI
- ✅ Premi
- ✅ Videochiamate
- ✅ Team
- ✅ Email
- ✅ Progressi
- ✅ Classifica
- ✅ Analisi AI
- ✅ Impostazioni

## Passo 4: Cliccare su "Studi Legali"

1. Clicca sulla voce "Studi Legali" (icona bilancia ⚖️)
2. Dovresti vedere l'interfaccia del modulo Legal con:
   - Ricerca documenti legali
   - Gestione casi
   - Chat AI per consulenze legali

## Cosa Fare se Non Vedi "Studi Legali"

### Verifica 1: Console del Browser
Apri la console (F12) e cerca:
```
🔍 DashboardRouter Debug:
```

Verifica che ci sia:
- `company: { moduliAttivi: [...] }`
- Controlla se nell'array c'è "studi_legali"

### Verifica 2: LocalStorage
1. Apri DevTools (F12)
2. Vai su "Application" → "Local Storage" → `http://localhost:5173`
3. Trova la chiave "user"
4. Verifica che ci sia:
```json
{
  "company": {
    "moduliAttivi": ["...","studi_legali","..."]
  }
}
```

### Verifica 3: Network
1. Apri DevTools (F12) → Network
2. Fai login
3. Trova la richiesta `POST /api/auth/login`
4. Guarda la risposta → dovrebbe contenere:
```json
{
  "user": {
    "company": {
      "moduliAttivi": ["tasks","preventivi","...","studi_legali"]
    }
  }
}
```

## Se Ancora Non Funziona

Fammi sapere quale di queste verifiche fallisce:

1. ❌ Il menu "Studi Legali" non appare nella sidebar
2. ❌ Il menu appare ma non fa niente quando lo clicco
3. ❌ Il menu funziona ma dice "Non autorizzato"
4. ❌ La console mostra errori

E inviami:
- Screenshot della sidebar
- Screenshot della console (F12)
- Contenuto del localStorage (chiave "user")
