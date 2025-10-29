import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import OpenAI from 'openai';

const router = Router();

// Inizializza OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// POST /api/brain - Richiesta al Brain AI
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { prompt, model = 'gpt-4o-mini', conversationHistory = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt mancante' });
    }

    // System prompt per Brain
    const systemPrompt = `Sei PlanOra Brain, un assistente AI intelligente integrato in una piattaforma di gestione progetti aziendali.

Il tuo ruolo è aiutare gli utenti a:
- Gestire progetti e task
- Creare report e riepiloghi
- Generare idee e soluzioni creative
- Analizzare dati e metriche
- Pianificare strategie
- Automatizzare processi

Rispondi sempre in italiano, in modo chiaro, professionale e actionable.
Quando possibile, struttura le risposte con:
- Bullet points per liste
- Numeri per step sequenziali
- Esempi pratici
- Suggerimenti concreti

Mantieni un tono amichevole ma professionale.`;

    // Mappa conversazione history
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Aggiungi history (max 6 messaggi = 3 scambi)
    conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Aggiungi prompt corrente
    messages.push({
      role: 'user',
      content: prompt
    });

    // Chiama OpenAI
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || 'Nessuna risposta generata.';

    res.json({
      response,
      model,
      tokens: completion.usage?.total_tokens || 0
    });

  } catch (error: any) {
    console.error('Errore Brain AI:', error);

    if (error.status === 401) {
      return res.status(500).json({
        error: 'API Key OpenAI non configurata o non valida'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Limite rate raggiunto. Riprova tra qualche secondo.'
      });
    }

    res.status(500).json({
      error: error.message || 'Errore nella richiesta al Brain AI'
    });
  }
});

export default router;
