# Legal AI - Guida Rapida

## 🚀 Start Rapido

### 1. Configurazione (OBBLIGATORIO)

Crea/modifica il file `backend/.env` e aggiungi:

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

**Come ottenere la chiave:**
1. Vai su https://platform.openai.com/api-keys
2. Crea un nuovo progetto
3. Genera una nuova API key
4. Copia e incolla nel `.env`

**Costo stimato**: ~$46/mese per 1000 domande legali

### 2. Riavvia Backend

```bash
cd backend
npm run dev
```

Dovresti vedere:
```
✅ Server running on port 4000
✅ 160 routes loaded
```

### 3. Test Immediato

Usa questo comando per testare l'AI:

```bash
curl -X POST http://localhost:4000/api/legal/ai/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"question\": \"Cosa prevede il codice civile per i contratti di locazione?\"}"
```

---

## 💡 Esempi Pratici

### Esempio 1: Domanda Legale Semplice

**Request:**
```javascript
fetch('http://localhost:4000/api/legal/ai/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    question: "Quali sono i termini di preavviso per il licenziamento?"
  })
})
```

**Response:**
```json
{
  "success": true,
  "answer": "Secondo l'articolo 2118 del Codice Civile e l'articolo 2 della Legge 604/1966, i termini di preavviso variano in base all'inquadramento...",
  "sources": [
    {
      "tipo": "Codice Civile",
      "titolo": "Codice Civile - Libro V",
      "numero": "262",
      "anno": "1942"
    }
  ],
  "confidence": 0.85
}
```

### Esempio 2: Analisi Caso con Sentenze Simili

**Request:**
```javascript
fetch('http://localhost:4000/api/legal/ai/analyze-case', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    caseDescription: "Un dipendente licenziato per giusta causa contesta la decisione sostenendo che la procedura disciplinare non è stata seguita correttamente. Non ha ricevuto contestazione scritta prima del licenziamento."
  })
})
```

**Response:**
```json
{
  "success": true,
  "similarCases": [
    {
      "numero": "12345",
      "anno": "2024",
      "sezione": "Sezione Lavoro",
      "massima": "In tema di licenziamento disciplinare, la mancata contestazione scritta degli addebiti rende illegittimo il licenziamento...",
      "dispositivo": "Accoglie il ricorso"
    }
  ],
  "analysis": "La giurisprudenza consolidata della Cassazione richiede che la procedura disciplinare sia rispettata rigorosamente...",
  "recommendations": [
    "Verificare la presenza di contestazione scritta degli addebiti",
    "Controllare se il CCNL applicabile prevede un termine specifico",
    "Raccogliere prove documentali della mancata procedura"
  ]
}
```

### Esempio 3: Generazione Atto Legale

**Request:**
```javascript
fetch('http://localhost:4000/api/legal/ai/generate-document', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    tipo: "ricorso",
    parti: {
      ricorrente: "Mario Rossi",
      resistente: "ABC S.p.A."
    },
    fatti: "Il ricorrente, dipendente della società resistente dal 2015, è stato licenziato in data 15/01/2024 per asserite irregolarità contabili. Il ricorrente contesta il licenziamento in quanto non ha mai ricevuto contestazione scritta degli addebiti.",
    richieste: "Si chiede l'annullamento del licenziamento e la reintegra nel posto di lavoro ai sensi dell'art. 18 dello Statuto dei Lavoratori, oltre al risarcimento del danno."
  })
})
```

**Response:**
```json
{
  "success": true,
  "document": "TRIBUNALE DI ROMA\nSezione Lavoro\n\nRICORSO EX ART. 18 LEGGE 300/1970\n\nPer il Sig. Mario Rossi\nC.F. RSSMRA80A01H501X\nrappresentato e difeso dall'Avv. [Nome Cognome]\n\nContro\n\nABC S.p.A.\nP.IVA 12345678901\n\nESPOSIZIONE DEI FATTI\n\nIl ricorrente, assunto alle dipendenze della società resistente in data 01/03/2015 con qualifica di impiegato amministrativo, in data 15/01/2024 ha ricevuto comunicazione di licenziamento per giusta causa...\n\n[Documento completo]"
}
```

### Esempio 4: Ricerca Normativa Italiana

**Request:**
```javascript
fetch('http://localhost:4000/api/legal/search/italian-legislation?query=lavoro agile', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "legge-2017-81",
      "urn": "urn:nir:stato:legge:2017;81",
      "tipo": "Legge",
      "titolo": "Misure per la tutela del lavoro autonomo non imprenditoriale",
      "numero": "81",
      "anno": "2017",
      "descrizione": "Disciplina organica del lavoro agile (smart working)",
      "gazzetta": "GU Serie Generale n.135 del 13-06-2017"
    }
  ],
  "count": 1
}
```

### Esempio 5: Ricerca Sentenze Cassazione

**Request:**
```javascript
fetch('http://localhost:4000/api/legal/search/cassazione?text=licenziamento discriminatorio&year=2024', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "numero": "67890",
      "anno": "2024",
      "sezione": "Sezione Lavoro",
      "data": "2024-05-22",
      "massima": "Costituisce licenziamento discriminatorio quello motivato da ragioni politiche, religiose o sindacali...",
      "dispositivo": "Accoglie il ricorso e dichiara la nullità del licenziamento"
    }
  ],
  "count": 1
}
```

---

## 🎨 Integrazione Frontend

### React Component Esempio

```typescript
import React, { useState } from 'react';

const LegalChatAI: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/legal/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="legal-chat">
      <h2>Assistente Legale AI</h2>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Fai una domanda legale..."
        rows={4}
      />

      <button onClick={askAI} disabled={loading}>
        {loading ? 'Elaborazione...' : 'Chiedi all\'AI'}
      </button>

      {response && (
        <div className="response">
          <h3>Risposta</h3>
          <p>{response.answer}</p>

          <h4>Fonti</h4>
          <ul>
            {response.sources.map((source: any, idx: number) => (
              <li key={idx}>
                {source.tipo} - {source.titolo} ({source.numero}/{source.anno})
                <span className="relevance">Rilevanza: {(source.relevance * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>

          <div className="confidence">
            Confidenza: {(response.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalChatAI;
```

---

## 🔧 Personalizzazione

### Modificare la Temperatura AI

Nel file `backend/src/services/legal/ai-legal.service.ts`:

```typescript
temperature: 0.3  // Più basso = più deterministico (consigliato per legal)
                  // Più alto = più creativo (max 1.0)
```

### Aumentare il Numero di Fonti

```typescript
const topLegislation = legislation.slice(0, 5);  // Default: 2
const topSentences = sentences.slice(0, 10);     // Default: 3
```

**Attenzione**: Più fonti = più token = costi maggiori

### Modificare Max Token Risposta

```typescript
max_tokens: 1500  // Default: 1500
                  // Aumenta per risposte più lunghe
                  // Diminuisci per risposte più concise
```

---

## 📊 Monitoring e Debug

### Verificare Token Usage

Ogni richiesta a GPT-4 costa token. Monitora l'uso:

```typescript
const response = await this.openai.chat.completions.create({...});
console.log('Token usati:', response.usage);
// Output: { prompt_tokens: 450, completion_tokens: 320, total_tokens: 770 }
```

**Calcolo costo**:
- Input: 450 tokens × $10 / 1M = $0.0045
- Output: 320 tokens × $30 / 1M = $0.0096
- **Totale**: $0.0141 per domanda

### Log delle Query

Aggiungi logging per tracciare l'uso:

```typescript
console.log(`[Legal AI] User ${req.user.id} asked: "${question}"`);
console.log(`[Legal AI] Found ${legislation.length} laws, ${sentences.length} sentences`);
console.log(`[Legal AI] Response confidence: ${confidence}`);
```

---

## ⚠️ Limitazioni Attuali (Mock Data)

I dati attuali sono **mock realistici** per testing:
- ✅ Struttura JSON identica a quella reale
- ✅ Esempi reali di leggi e sentenze italiane
- ❌ Database limitato a ~10 documenti
- ❌ Ricerca keyword-based invece di semantic

**Per produzione**: Sostituire con chiamate API reali a Normattiva e Italgiure.

---

## 🎯 Prossimi Passi

1. **Configurare OPENAI_API_KEY** nel `.env`
2. **Testare endpoint** con curl o Postman
3. **Integrare componenti frontend** (LegalChatAI, DocumentSearch)
4. **Monitorare costi** OpenAI nei primi giorni
5. **Sostituire mock data** con API reali quando pronto

---

**Generato**: 2025-01-26
**Versione**: 1.0
**Status**: Ready to use (con API key configurata)
