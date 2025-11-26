import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkModule } from '../middleware/checkModule';
import aiLegalService from '../services/legal/ai-legal.service';
import normativaService from '../services/legal/normattiva.service';
import cassazioneService from '../services/legal/cassazione.service';

const router = Router();

// Middleware: richiede autenticazione e modulo studi_legali attivo
router.use(authenticate, checkModule('studi_legali'));

/**
 * POST /api/legal/ai/ask
 * Chiedi all'AI una domanda legale
 */
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length < 10) {
      return res.status(400).json({
        error: 'La domanda deve essere di almeno 10 caratteri'
      });
    }

    const result = await aiLegalService.answerLegalQuestion(question);

    res.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('AI ask error:', error);
    res.status(500).json({
      error: error.message || 'Errore nell\'elaborazione della domanda'
    });
  }
});

/**
 * POST /api/legal/ai/analyze-case
 * Analizza un caso e trova sentenze simili
 */
router.post('/analyze-case', async (req, res) => {
  try {
    const { caseDescription } = req.body;

    if (!caseDescription || caseDescription.trim().length < 50) {
      return res.status(400).json({
        error: 'La descrizione del caso deve essere di almeno 50 caratteri'
      });
    }

    const result = await aiLegalService.analyzeSimilarCases(caseDescription);

    res.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Analyze case error:', error);
    res.status(500).json({
      error: error.message || 'Errore nell\'analisi del caso'
    });
  }
});

/**
 * POST /api/legal/ai/generate-document
 * Genera bozza di documento legale
 */
router.post('/generate-document', async (req, res) => {
  try {
    const { tipo, parti, fatti, richieste } = req.body;

    if (!tipo || !fatti || !richieste) {
      return res.status(400).json({
        error: 'Parametri mancanti: tipo, fatti, richieste sono obbligatori'
      });
    }

    const validTypes = ['atto_citazione', 'ricorso', 'memoria', 'contratto'];
    if (!validTypes.includes(tipo)) {
      return res.status(400).json({
        error: `Tipo documento non valido. Valori ammessi: ${validTypes.join(', ')}`
      });
    }

    const document = await aiLegalService.generateLegalDocument({
      tipo,
      parti,
      fatti,
      richieste
    });

    res.json({
      success: true,
      document
    });

  } catch (error: any) {
    console.error('Generate document error:', error);
    res.status(500).json({
      error: error.message || 'Errore nella generazione del documento'
    });
  }
});

/**
 * GET /api/legal/search/legislation
 * Cerca leggi e decreti italiani
 */
router.get('/search/legislation', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Parametro query mancante'
      });
    }

    const results = await normativaService.searchLegislation(query);

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error: any) {
    console.error('Search legislation error:', error);
    res.status(500).json({
      error: error.message || 'Errore nella ricerca della normativa'
    });
  }
});

/**
 * GET /api/legal/search/sentences
 * Cerca sentenze della Cassazione
 */
router.get('/search/sentences', async (req, res) => {
  try {
    const { text, year, number, section } = req.query;

    const results = await cassazioneService.searchSentences({
      text: text as string,
      year: year ? parseInt(year as string) : undefined,
      number: number ? parseInt(number as string) : undefined,
      section: section as string
    });

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error: any) {
    console.error('Search sentences error:', error);
    res.status(500).json({
      error: error.message || 'Errore nella ricerca delle sentenze'
    });
  }
});

/**
 * GET /api/legal/legislation/:urn
 * Ottieni dettagli di una legge specifica
 */
router.get('/legislation/:urn', async (req, res) => {
  try {
    const { urn } = req.params;

    const legislation = await normativaService.getLegislationByURN(urn);

    res.json({
      success: true,
      legislation
    });

  } catch (error: any) {
    console.error('Get legislation error:', error);
    res.status(500).json({
      error: error.message || 'Errore nel recupero della normativa'
    });
  }
});

/**
 * GET /api/legal/sentence/:id
 * Ottieni dettagli di una sentenza specifica
 */
router.get('/sentence/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sentence = await cassazioneService.getSentenceDetail(id);

    res.json({
      success: true,
      sentence
    });

  } catch (error: any) {
    console.error('Get sentence error:', error);
    res.status(500).json({
      error: error.message || 'Errore nel recupero della sentenza'
    });
  }
});

export default router;
