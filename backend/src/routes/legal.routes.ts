import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkModule, checkCompanyCategory } from '../middleware/checkModule';
import {
  searchEURLex,
  analyzeLegalDocument,
  findRelatedLegalDocuments,
  extractKeyPointsFromSentence,
  legalChatbot,
  generateCaseSuggestions
} from '../services/eurlex.service';
import aiLegalService from '../services/legal/ai-legal.service';
import normativaService from '../services/legal/normattiva.service';
import cassazioneService from '../services/legal/cassazione.service';

const router = Router();
const prisma = new PrismaClient();

// Middleware: verifica che il modulo "studi_legali" sia attivo
router.use(checkModule('studi_legali'));

// ===================================
// RICERCA DOCUMENTI LEGALI
// ===================================

// POST /api/legal/search - Ricerca documenti legali
router.post('/search', async (req: any, res) => {
  try {
    const { query, fonte, materia, tipo, annoFrom, annoTo } = req.body;
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: 'Utente non associato ad azienda' });
    }

    // Ricerca nel database locale
    const whereConditions: any = {
      companyId: user.companyId
    };

    if (query) {
      whereConditions.OR = [
        { titolo: { contains: query, mode: 'insensitive' } },
        { testoCompleto: { contains: query, mode: 'insensitive' } },
        { abstract: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (fonte) whereConditions.fonte = fonte;
    if (materia) whereConditions.materia = materia;
    if (tipo) whereConditions.tipo = tipo;
    if (annoFrom || annoTo) {
      whereConditions.anno = {};
      if (annoFrom) whereConditions.anno.gte = parseInt(annoFrom);
      if (annoTo) whereConditions.anno.lte = parseInt(annoTo);
    }

    const localDocuments = await prisma.legalDocument.findMany({
      where: whereConditions,
      take: 50,
      orderBy: { dataEmissione: 'desc' }
    });

    // Ricerca anche su EUR-Lex se richiesto
    let externalDocuments: any[] = [];
    if (fonte === 'eur-lex' || !fonte) {
      try {
        externalDocuments = await searchEURLex(query || '');
      } catch (error) {
        console.error('Errore ricerca EUR-Lex:', error);
      }
    }

    res.json({
      localResults: localDocuments.map(doc => ({
        ...doc,
        keywords: JSON.parse(doc.keywords || '[]'),
        riferimentiNormativi: JSON.parse(doc.riferimentiNormativi || '[]'),
        documentoCollegati: JSON.parse(doc.documentoCollegati || '[]'),
        aiKeyPoints: JSON.parse(doc.aiKeyPoints || '[]'),
        tagsPersonali: JSON.parse(doc.tagsPersonali || '[]')
      })),
      externalResults: externalDocuments,
      total: localDocuments.length + externalDocuments.length
    });
  } catch (error) {
    console.error('Errore ricerca documenti:', error);
    res.status(500).json({ error: 'Errore durante la ricerca' });
  }
});

// GET /api/legal/documents/:id - Dettaglio documento
router.get('/documents/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    const document = await prisma.legalDocument.findFirst({
      where: {
        id,
        companyId: user?.companyId!
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    res.json({
      ...document,
      keywords: JSON.parse(document.keywords || '[]'),
      riferimentiNormativi: JSON.parse(document.riferimentiNormativi || '[]'),
      documentoCollegati: JSON.parse(document.documentoCollegati || '[]'),
      aiKeyPoints: JSON.parse(document.aiKeyPoints || '[]'),
      tagsPersonali: JSON.parse(document.tagsPersonali || '[]')
    });
  } catch (error) {
    console.error('Errore recupero documento:', error);
    res.status(500).json({ error: 'Errore durante il recupero del documento' });
  }
});

// POST /api/legal/documents - Salva documento
router.post('/documents', async (req: any, res) => {
  try {
    const userId = req.userId;
    const documentData = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: 'Utente non associato ad azienda' });
    }

    const document = await prisma.legalDocument.create({
      data: {
        ...documentData,
        companyId: user.companyId,
        savedByUserId: userId,
        keywords: JSON.stringify(documentData.keywords || []),
        riferimentiNormativi: JSON.stringify(documentData.riferimentiNormativi || []),
        documentoCollegati: JSON.stringify(documentData.documentoCollegati || []),
        aiKeyPoints: JSON.stringify(documentData.aiKeyPoints || []),
        tagsPersonali: JSON.stringify(documentData.tagsPersonali || []),
        metadata: JSON.stringify(documentData.metadata || {})
      }
    });

    res.json({
      ...document,
      keywords: JSON.parse(document.keywords),
      riferimentiNormativi: JSON.parse(document.riferimentiNormativi),
      aiKeyPoints: JSON.parse(document.aiKeyPoints)
    });
  } catch (error) {
    console.error('Errore salvataggio documento:', error);
    res.status(500).json({ error: 'Errore durante il salvataggio' });
  }
});

// POST /api/legal/documents/:id/analyze - Analizza documento con AI
router.post('/documents/:id/analyze', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { query } = req.body;
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    const document = await prisma.legalDocument.findFirst({
      where: {
        id,
        companyId: user?.companyId!
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    const analysis = await analyzeLegalDocument(document.testoCompleto || '', query);

    res.json({ analysis });
  } catch (error) {
    console.error('Errore analisi documento:', error);
    res.status(500).json({ error: 'Errore durante l\'analisi' });
  }
});

// POST /api/legal/documents/:id/extract-key-points - Estrai punti chiave
router.post('/documents/:id/extract-key-points', async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    const document = await prisma.legalDocument.findFirst({
      where: {
        id,
        companyId: user?.companyId!
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    const keyPoints = await extractKeyPointsFromSentence(document.testoCompleto || '');

    // Aggiorna il documento con i punti chiave estratti
    const updatedDocument = await prisma.legalDocument.update({
      where: { id },
      data: {
        aiSummary: keyPoints.massima,
        aiKeyPoints: JSON.stringify(keyPoints.punti_chiave),
        riferimentiNormativi: JSON.stringify(keyPoints.riferimenti_normativi)
      }
    });

    res.json({ keyPoints, document: updatedDocument });
  } catch (error) {
    console.error('Errore estrazione punti chiave:', error);
    res.status(500).json({ error: 'Errore durante l\'estrazione' });
  }
});

// ===================================
// GESTIONE CASI LEGALI
// ===================================

// GET /api/legal/cases - Lista casi
router.get('/cases', async (req: any, res) => {
  try {
    const userId = req.userId;
    const { stato, materia } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: 'Utente non associato ad azienda' });
    }

    const whereConditions: any = {
      companyId: user.companyId
    };

    if (stato) whereConditions.stato = stato;
    if (materia) whereConditions.materia = materia;

    const cases = await prisma.legalCase.findMany({
      where: whereConditions,
      orderBy: { dataApertura: 'desc' }
    });

    res.json(cases.map(c => ({
      ...c,
      teamLegale: JSON.parse(c.teamLegale || '[]'),
      documentiCaricati: JSON.parse(c.documentiCaricati || '[]'),
      scadenze: JSON.parse(c.scadenze || '[]'),
      attivita: JSON.parse(c.attivita || '[]'),
      aiSuggerimenti: JSON.parse(c.aiSuggerimenti || '[]'),
      precedentiRilevanti: JSON.parse(c.precedentiRilevanti || '[]'),
      tags: JSON.parse(c.tags || '[]')
    })));
  } catch (error) {
    console.error('Errore recupero casi:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei casi' });
  }
});

// POST /api/legal/cases - Crea nuovo caso
router.post('/cases', async (req: any, res) => {
  try {
    const userId = req.userId;
    const caseData = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: 'Utente non associato ad azienda' });
    }

    // Genera suggerimenti AI per il caso
    let aiSuggerimenti: any[] = [];
    try {
      const suggestions = await generateCaseSuggestions({
        titolo: caseData.titolo,
        descrizione: caseData.descrizione,
        materia: caseData.materia,
        sottoMateria: caseData.sottoMateria
      });
      aiSuggerimenti = [suggestions];
    } catch (error) {
      console.error('Errore generazione suggerimenti:', error);
    }

    const legalCase = await prisma.legalCase.create({
      data: {
        ...caseData,
        companyId: user.companyId,
        avvocatoId: userId,
        teamLegale: JSON.stringify(caseData.teamLegale || []),
        documentiCaricati: JSON.stringify(caseData.documentiCaricati || []),
        scadenze: JSON.stringify(caseData.scadenze || []),
        attivita: JSON.stringify(caseData.attivita || []),
        aiSuggerimenti: JSON.stringify(aiSuggerimenti),
        precedentiRilevanti: JSON.stringify(caseData.precedentiRilevanti || []),
        tags: JSON.stringify(caseData.tags || [])
      }
    });

    res.json({
      ...legalCase,
      aiSuggerimenti
    });
  } catch (error) {
    console.error('Errore creazione caso:', error);
    res.status(500).json({ error: 'Errore durante la creazione del caso' });
  }
});

// GET /api/legal/cases/:id - Dettaglio caso
router.get('/cases/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    const legalCase = await prisma.legalCase.findFirst({
      where: {
        id,
        companyId: user?.companyId!
      },
      include: {
        documenti: true
      }
    });

    if (!legalCase) {
      return res.status(404).json({ error: 'Caso non trovato' });
    }

    res.json({
      ...legalCase,
      teamLegale: JSON.parse(legalCase.teamLegale),
      documentiCaricati: JSON.parse(legalCase.documentiCaricati),
      scadenze: JSON.parse(legalCase.scadenze),
      attivita: JSON.parse(legalCase.attivita),
      aiSuggerimenti: JSON.parse(legalCase.aiSuggerimenti),
      precedentiRilevanti: JSON.parse(legalCase.precedentiRilevanti),
      tags: JSON.parse(legalCase.tags)
    });
  } catch (error) {
    console.error('Errore recupero caso:', error);
    res.status(500).json({ error: 'Errore durante il recupero del caso' });
  }
});

// ===================================
// CHAT LEGALE AI
// ===================================

// GET /api/legal/chats - Lista chat
router.get('/chats', async (req: any, res) => {
  try {
    const userId = req.userId;

    const chats = await prisma.legalChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(chats.map(chat => ({
      ...chat,
      messaggi: JSON.parse(chat.messaggi || '[]'),
      documentiRiferimento: JSON.parse(chat.documentiRiferimento || '[]')
    })));
  } catch (error) {
    console.error('Errore recupero chat:', error);
    res.status(500).json({ error: 'Errore durante il recupero delle chat' });
  }
});

// POST /api/legal/chats - Nuova chat
router.post('/chats', async (req: any, res) => {
  try {
    const userId = req.userId;
    const { titolo, caseId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(403).json({ error: 'Utente non associato ad azienda' });
    }

    const chat = await prisma.legalChat.create({
      data: {
        userId,
        companyId: user.companyId,
        titolo: titolo || 'Nuova consulenza',
        caseId,
        messaggi: JSON.stringify([]),
        documentiRiferimento: JSON.stringify([])
      }
    });

    res.json({
      ...chat,
      messaggi: [],
      documentiRiferimento: []
    });
  } catch (error) {
    console.error('Errore creazione chat:', error);
    res.status(500).json({ error: 'Errore durante la creazione della chat' });
  }
});

// POST /api/legal/chats/:id/message - Invia messaggio
router.post('/chats/:id/message', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { message, documentIds } = req.body;
    const userId = req.userId;

    const chat = await prisma.legalChat.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat non trovata' });
    }

    const messaggi = JSON.parse(chat.messaggi || '[]');

    // Carica documenti di riferimento se forniti
    let relevantDocuments: any[] = [];
    if (documentIds?.length) {
      relevantDocuments = await prisma.legalDocument.findMany({
        where: {
          id: { in: documentIds }
        },
        select: {
          titolo: true,
          testoCompleto: true
        }
      });
    }

    // Ottieni risposta AI
    const aiResponse = await legalChatbot(message, messaggi, relevantDocuments);

    // Aggiungi messaggi alla conversazione
    messaggi.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    messaggi.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    // Aggiorna chat
    const updatedChat = await prisma.legalChat.update({
      where: { id },
      data: {
        messaggi: JSON.stringify(messaggi),
        documentiRiferimento: JSON.stringify([
          ...JSON.parse(chat.documentiRiferimento || '[]'),
          ...(documentIds || [])
        ])
      }
    });

    res.json({
      ...updatedChat,
      messaggi: JSON.parse(updatedChat.messaggi),
      aiResponse
    });
  } catch (error) {
    console.error('Errore invio messaggio:', error);
    res.status(500).json({ error: 'Errore durante l\'invio del messaggio' });
  }
});

// ===================================
// AI LEGAL ASSISTANT (NUOVO)
// ===================================

// POST /api/legal/ai/ask - Chiedi all'AI una domanda legale
router.post('/ai/ask', async (req: any, res) => {
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

// POST /api/legal/ai/analyze-case - Analizza caso e trova sentenze simili
router.post('/ai/analyze-case', async (req: any, res) => {
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

// POST /api/legal/ai/generate-document - Genera documento legale
router.post('/ai/generate-document', async (req: any, res) => {
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

// GET /api/legal/search/italian-legislation - Cerca normativa italiana (Normattiva)
router.get('/search/italian-legislation', async (req: any, res) => {
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

// GET /api/legal/search/cassazione - Cerca sentenze Cassazione
router.get('/search/cassazione', async (req: any, res) => {
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

export default router;
