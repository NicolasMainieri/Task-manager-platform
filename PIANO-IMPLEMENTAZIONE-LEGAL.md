# Piano Implementazione Modulo Studi Legali

## 🎯 Obiettivo
Creare un sistema completo per studi legali con:
- Ricerca di leggi, sentenze, decreti italiani
- AI Assistant per consulenze legali
- Gestione casi e documenti
- Ricerca semantica con RAG

---

## 📚 FASE 1: Setup API Gratuite (2-3 ore)

### 1.1 Normattiva API (Leggi e Decreti)
```bash
# Backend service
mkdir -p backend/src/services/legal
touch backend/src/services/legal/normattiva.service.ts
```

**File**: `backend/src/services/legal/normattiva.service.ts`
```typescript
import axios from 'axios';

class NormativaService {
  private baseUrl = 'https://www.normattiva.it';

  async searchLegislation(query: string) {
    // Ricerca per testo
    const response = await axios.get(`${this.baseUrl}/do/ricerca/base`, {
      params: {
        q: query,
        formato: 'json'
      }
    });
    return response.data;
  }

  async getLegislationByURN(urn: string) {
    // Es: urn:nir:stato:decreto.legge:2020;18
    const response = await axios.get(`${this.baseUrl}/do/atto/export`, {
      params: {
        tipo: 'originario',
        formato: 'json',
        atto: urn
      }
    });
    return response.data;
  }

  async getVersions(urn: string) {
    // Versioni nel tempo della legge
    const response = await axios.get(`${this.baseUrl}/do/atto/versioni`, {
      params: { atto: urn }
    });
    return response.data;
  }
}

export default new NormativaService();
```

### 1.2 EUR-Lex API (Normativa UE)
```typescript
// backend/src/services/legal/eurlex.service.ts
class EurLexService {
  private baseUrl = 'https://eur-lex.europa.eu';

  async searchEULegislation(query: string) {
    const response = await axios.get(`${this.baseUrl}/search.html`, {
      params: {
        qid: Date.now(),
        text: query,
        scope: 'EURLEX',
        type: 'quick',
        lang: 'it'
      }
    });
    return this.parseResults(response.data);
  }

  async getDocumentByCELEX(celex: string) {
    // Es: 32020R0852
    const response = await axios.get(
      `${this.baseUrl}/legal-content/IT/TXT/?uri=CELEX:${celex}`
    );
    return response.data;
  }
}

export default new EurLexService();
```

### 1.3 Web Scraper per Italgiure (Cassazione)
```typescript
// backend/src/services/legal/cassazione.scraper.ts
import * as cheerio from 'cheerio';
import axios from 'axios';

class CassazioneScraper {
  private baseUrl = 'http://www.italgiure.giustizia.it';

  async searchSentences(params: {
    text?: string;
    year?: number;
    number?: number;
    section?: string;
  }) {
    // Richiede registrazione gratuita
    const response = await axios.post(`${this.baseUrl}/ricerca`, params, {
      headers: {
        'Cookie': process.env.ITALGIURE_SESSION // Dopo login
      }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.risultato').each((i, elem) => {
      results.push({
        numero: $(elem).find('.numero').text(),
        data: $(elem).find('.data').text(),
        massima: $(elem).find('.massima').text(),
        link: $(elem).find('a').attr('href')
      });
    });

    return results;
  }

  async getSentenceDetail(id: string) {
    const response = await axios.get(`${this.baseUrl}/sentenza/${id}`);
    const $ = cheerio.load(response.data);

    return {
      numero: $('.numero').text(),
      data: $('.data').text(),
      sezione: $('.sezione').text(),
      presidente: $('.presidente').text(),
      relatore: $('.relatore').text(),
      massima: $('.massima').text(),
      testoCompleto: $('.testo-completo').html()
    };
  }
}

export default new CassazioneScraper();
```

---

## 🤖 FASE 2: AI Integration con RAG (3-4 ore)

### 2.1 Setup Vector Database (Pinecone - GRATUITO)
```bash
npm install @pinecone-database/pinecone openai
```

**Environment Variables**:
```env
PINECONE_API_KEY=your_key_here
PINECONE_ENVIRONMENT=us-west1-gcp
OPENAI_API_KEY=your_existing_key
```

### 2.2 Servizio Embeddings
```typescript
// backend/src/services/legal/embedding.service.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

class EmbeddingService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName = 'legal-documents';

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small', // Economico: $0.00002/1K tokens
      input: text
    });
    return response.data[0].embedding;
  }

  async indexDocument(doc: {
    id: string;
    tipo: 'legge' | 'sentenza' | 'decreto' | 'direttiva_ue';
    titolo: string;
    testo: string;
    metadata: any;
  }) {
    const embedding = await this.createEmbedding(doc.testo);
    const index = this.pinecone.index(this.indexName);

    await index.upsert([{
      id: doc.id,
      values: embedding,
      metadata: {
        tipo: doc.tipo,
        titolo: doc.titolo,
        testo: doc.testo.substring(0, 10000), // Max 10K chars in metadata
        ...doc.metadata
      }
    }]);
  }

  async searchSimilar(query: string, topK: number = 5) {
    const queryEmbedding = await this.createEmbedding(query);
    const index = this.pinecone.index(this.indexName);

    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });

    return results.matches;
  }
}

export default new EmbeddingService();
```

### 2.3 RAG Service per AI Responses
```typescript
// backend/src/services/legal/rag.service.ts
import embeddingService from './embedding.service';
import OpenAI from 'openai';

class RAGService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async answerLegalQuestion(question: string) {
    // 1. Cerca documenti rilevanti
    const relevantDocs = await embeddingService.searchSimilar(question, 5);

    // 2. Costruisci context
    const context = relevantDocs
      .map(doc => `
[${doc.metadata.tipo.toUpperCase()}] ${doc.metadata.titolo}
${doc.metadata.testo}
---
      `)
      .join('\n');

    // 3. Chiedi a GPT-4 con context
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Sei un assistente legale esperto in diritto italiano.
Rispondi SOLO basandoti sui documenti forniti come context.
Se la risposta non è nei documenti, dillo chiaramente.
Cita sempre le fonti specifiche (numero legge, sentenza, ecc).

CONTEXT:
${context}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.3, // Più deterministico per risposte legali
      max_tokens: 1000
    });

    return {
      answer: response.choices[0].message.content,
      sources: relevantDocs.map(doc => ({
        tipo: doc.metadata.tipo,
        titolo: doc.metadata.titolo,
        score: doc.score
      }))
    };
  }

  async analyzeSimilarCases(caseDescription: string) {
    const similarCases = await embeddingService.searchSimilar(
      caseDescription,
      10
    );

    const casesContext = similarCases
      .filter(doc => doc.metadata.tipo === 'sentenza')
      .map(doc => ({
        tribunale: doc.metadata.tribunale,
        data: doc.metadata.data,
        massima: doc.metadata.massima,
        score: doc.score
      }));

    return {
      similarCases: casesContext,
      summary: await this.summarizeCases(casesContext)
    };
  }

  private async summarizeCases(cases: any[]) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Riassumi i principi comuni di queste sentenze in modo conciso.'
        },
        {
          role: 'user',
          content: JSON.stringify(cases)
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  }
}

export default new RAGService();
```

---

## 🔌 FASE 3: API Routes (1-2 ore)

### 3.1 Legal Routes
```typescript
// backend/src/routes/legal.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkModule } from '../middleware/checkModule';
import normativaService from '../services/legal/normattiva.service';
import eurlexService from '../services/legal/eurlex.service';
import cassazioneService from '../services/legal/cassazione.scraper';
import ragService from '../services/legal/rag.service';

const router = Router();

// Middleware: verifica che il modulo legal sia attivo
router.use(authenticate, checkModule('studi_legali'));

// Ricerca leggi italiane
router.get('/search/legislation', async (req, res) => {
  try {
    const { query } = req.query;
    const results = await normativaService.searchLegislation(query as string);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ricerca normativa UE
router.get('/search/eu', async (req, res) => {
  try {
    const { query } = req.query;
    const results = await eurlexService.searchEULegislation(query as string);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ricerca sentenze Cassazione
router.get('/search/sentences', async (req, res) => {
  try {
    const { text, year, number, section } = req.query;
    const results = await cassazioneService.searchSentences({
      text: text as string,
      year: year ? parseInt(year as string) : undefined,
      number: number ? parseInt(number as string) : undefined,
      section: section as string
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Legal Assistant
router.post('/ai/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const response = await ragService.answerLegalQuestion(question);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analizza casi simili
router.post('/ai/similar-cases', async (req, res) => {
  try {
    const { caseDescription } = req.body;
    const analysis = await ragService.analyzeSimilarCases(caseDescription);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3.2 Registra routes
```typescript
// backend/src/routes/index.ts
import legalRoutes from './legal.routes';

// ... altre routes ...

router.use('/legal', legalRoutes);
```

---

## 🎨 FASE 4: Frontend Updates (3-4 ore)

### 4.1 Legal Search Component
```typescript
// frontend/src/components/LegalSearch.tsx
import { useState } from 'react';
import { Search, Scale, FileText, Gavel } from 'lucide-react';
import api from '../services/api';

export default function LegalSearch() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'legislation' | 'eu' | 'sentences'>('legislation');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const endpoint = `/legal/search/${searchType}`;
      const response = await api.get(endpoint, { params: { query } });
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setSearchType('legislation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              searchType === 'legislation'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            Leggi Italiane
          </button>
          <button
            onClick={() => setSearchType('eu')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              searchType === 'eu'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <Scale className="w-4 h-4" />
            Normativa UE
          </button>
          <button
            onClick={() => setSearchType('sentences')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              searchType === 'sentences'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <Gavel className="w-4 h-4" />
            Sentenze
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Cerca leggi, sentenze, decreti..."
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition"
          >
            <h3 className="text-white font-bold text-lg mb-2">{result.titolo}</h3>
            <p className="text-gray-400 text-sm mb-3">{result.descrizione}</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">
                {result.tipo}
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                {result.data}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.2 AI Legal Assistant Component
```typescript
// frontend/src/components/LegalAIChat.tsx
import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function LegalAIChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/legal/ai/ask', { question: input });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources
      }]);
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 text-gray-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-400">Legal AI</span>
                </div>
              )}
              <p>{msg.content}</p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-indigo-500/20">
                  <p className="text-xs text-gray-400 mb-2">Fonti:</p>
                  {msg.sources.map((source: any, i: number) => (
                    <div key={i} className="text-xs text-indigo-300 mb-1">
                      • {source.tipo}: {source.titolo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-slate-900/50 border-t border-indigo-500/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Chiedi qualsiasi cosa sul diritto italiano..."
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 💰 Stima Costi (Mensili)

### Scenario 100 ricerche/giorno:

| Servizio | Costo | Note |
|----------|-------|------|
| Normattiva API | **GRATIS** | Illimitato |
| EUR-Lex API | **GRATIS** | Illimitato |
| Italgiure | **GRATIS** | Richiede registrazione |
| Pinecone | **GRATIS** | Fino a 1M vettori |
| OpenAI Embeddings | **$1.20/mese** | 60K tokens/mese |
| OpenAI GPT-4 | **$45/mese** | 100 richieste/giorno |
| **TOTALE** | **~$46/mese** | Per 100 ricerche/giorno |

### Alternativa 100% GRATUITA:
- Usare **Weaviate** (self-hosted) invece di Pinecone
- Usare **Mistral-7B** (open source) invece di GPT-4
- **Costo totale**: $0 (solo server)

---

## 🚀 Quick Start

Vuoi che implementi subito:
1. **Setup base con API gratuite** (2-3 ore)
2. **AI con RAG usando OpenAI** (2 ore)
3. **Frontend completo** (3 ore)

Oppure preferisci l'approccio **100% gratuito** con Weaviate + Mistral?

Dimmi quale preferisci e inizio subito! 🚀
