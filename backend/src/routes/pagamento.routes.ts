import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer = require('multer');
import path = require('path');
import fs = require('fs');

const router = Router();
const prisma = new PrismaClient();

// Configurazione multer per upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/pagamenti');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ricevuta-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo file PDF, immagini o documenti sono permessi'));
  }
});

/**
 * @route   GET /api/pagamenti
 * @desc    Lista tutti i pagamenti dell'azienda
 * @query   fatturaId (opzionale)
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const { fatturaId } = req.query;

    const where: any = {
      companyId: user.companyId
    };

    if (fatturaId) {
      where.fatturaId = fatturaId as string;
    }

    const pagamenti = await prisma.pagamento.findMany({
      where,
      include: {
        fattura: {
          select: {
            id: true,
            numero: true,
            clienteNome: true,
            totale: true,
            statoPagamento: true
          }
        }
      },
      orderBy: {
        dataPagamento: 'desc'
      }
    });

    res.json(pagamenti);
  } catch (error) {
    console.error('Errore nel recupero dei pagamenti:', error);
    res.status(500).json({ error: 'Errore nel recupero dei pagamenti' });
  }
});

/**
 * @route   GET /api/pagamenti/:id
 * @desc    Dettaglio singolo pagamento
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const pagamento = await prisma.pagamento.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        fattura: {
          select: {
            id: true,
            numero: true,
            clienteNome: true,
            totale: true,
            imponibile: true,
            iva: true,
            statoPagamento: true,
            dataEmissione: true,
            dataScadenza: true
          }
        }
      }
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento non trovato' });
    }

    res.json(pagamento);
  } catch (error) {
    console.error('Errore nel recupero del pagamento:', error);
    res.status(500).json({ error: 'Errore nel recupero del pagamento' });
  }
});

/**
 * @route   POST /api/pagamenti
 * @desc    Registra nuovo pagamento per una fattura con allegato opzionale
 * @body    { fatturaId, importo, metodoPagamento, dataPagamento, riferimento, note } + file (ricevuta)
 * @access  Private
 */
router.post('/', authenticate, upload.single('ricevuta'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      fatturaId,
      importo,
      metodoPagamento,
      dataPagamento,
      riferimento,
      note
    } = req.body;

    if (!fatturaId || !importo || !metodoPagamento) {
      return res.status(400).json({ error: 'FatturaId, importo e metodo di pagamento sono obbligatori' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che la fattura esista e appartenga all'azienda
    const fattura = await prisma.fattura.findFirst({
      where: {
        id: fatturaId,
        companyId: user.companyId
      },
      include: {
        pagamenti: true
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    // Calcola totale già pagato
    const totalePagato = fattura.pagamenti.reduce((sum, p) => sum + p.importo, 0);
    const nuovoTotalePagato = totalePagato + importo;

    // Verifica che il pagamento non superi il totale della fattura
    if (nuovoTotalePagato > fattura.totale) {
      return res.status(400).json({
        error: 'Il pagamento supera il totale della fattura',
        totale: fattura.totale,
        giaPagato: totalePagato,
        residuo: fattura.totale - totalePagato
      });
    }

    // Gestisci l'upload del file se presente
    let documentoId: string | undefined;
    if (req.file) {
      // Trova il contatto associato alla fattura
      const contactId = fattura.contactId;

      if (contactId) {
        // Crea il documento nella tabella Document
        const documento = await prisma.document.create({
          data: {
            contactId,
            nome: req.file.originalname,
            descrizione: `Ricevuta pagamento - Fattura ${fattura.numero}`,
            tipo: 'ricevuta',
            url: `/uploads/pagamenti/${req.file.filename}`,
            dimensione: req.file.size,
            mimeType: req.file.mimetype,
            uploadedById: req.user.id,
            companyId: user.companyId
          }
        });
        documentoId = documento.id;
      }
    }

    // Crea il pagamento con riferimento al documento
    const pagamento = await prisma.pagamento.create({
      data: {
        fatturaId,
        importo,
        metodoPagamento,
        dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
        riferimento: req.file ? `/uploads/pagamenti/${req.file.filename}` : riferimento,
        note: documentoId ? `${note}\nDocumento ID: ${documentoId}` : note,
        createdById: req.user.id,
        companyId: user.companyId
      },
      include: {
        fattura: {
          select: {
            id: true,
            numero: true,
            clienteNome: true,
            totale: true,
            contactId: true
          }
        }
      }
    });

    // Aggiorna stato fattura
    let nuovoStato = fattura.statoPagamento;
    if (nuovoTotalePagato >= fattura.totale) {
      nuovoStato = 'pagata';
    } else if (nuovoTotalePagato > 0) {
      nuovoStato = 'parzialmente_pagata';
    }

    await prisma.fattura.update({
      where: { id: fatturaId },
      data: {
        statoPagamento: nuovoStato,
        importoPagato: nuovoTotalePagato,
        importoDaPagare: fattura.totale - nuovoTotalePagato
      }
    });

    res.status(201).json({
      ...pagamento,
      documentoId,
      fatturaAggiornata: {
        statoPagamento: nuovoStato,
        totalePagato: nuovoTotalePagato,
        residuo: fattura.totale - nuovoTotalePagato
      },
      message: documentoId
        ? 'Pagamento registrato con successo e ricevuta salvata nel drive del contatto'
        : 'Pagamento registrato con successo'
    });
  } catch (error) {
    console.error('Errore nella registrazione del pagamento:', error);
    res.status(500).json({ error: 'Errore nella registrazione del pagamento' });
  }
});

/**
 * @route   PUT /api/pagamenti/:id
 * @desc    Aggiorna pagamento esistente
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      importo,
      metodoPagamento,
      dataPagamento,
      riferimento,
      note
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const pagamento = await prisma.pagamento.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        fattura: {
          include: {
            pagamenti: true
          }
        }
      }
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento non trovato' });
    }

    // Se l'importo cambia, ricalcola lo stato della fattura
    const importoVecchio = pagamento.importo;
    const importoNuovo = importo !== undefined ? importo : importoVecchio;
    const differenza = importoNuovo - importoVecchio;

    if (differenza !== 0) {
      const totalePagato = pagamento.fattura.pagamenti.reduce((sum, p) => sum + p.importo, 0);
      const nuovoTotalePagato = totalePagato + differenza;

      if (nuovoTotalePagato > pagamento.fattura.totale) {
        return res.status(400).json({
          error: 'La modifica supererebbe il totale della fattura',
          totale: pagamento.fattura.totale,
          totalePagato,
          nuovoImporto: importoNuovo
        });
      }
    }

    const pagamentoAggiornato = await prisma.pagamento.update({
      where: { id },
      data: {
        importo: importoNuovo,
        metodoPagamento,
        dataPagamento: dataPagamento ? new Date(dataPagamento) : undefined,
        riferimento,
        note
      },
      include: {
        fattura: {
          select: {
            id: true,
            numero: true,
            clienteNome: true,
            totale: true
          }
        }
      }
    });

    // Ricalcola stato fattura se necessario
    if (differenza !== 0) {
      const fattura = await prisma.fattura.findUnique({
        where: { id: pagamento.fatturaId },
        include: { pagamenti: true }
      });

      if (fattura) {
        const totalePagato = fattura.pagamenti.reduce((sum, p) => sum + p.importo, 0);
        let nuovoStato = fattura.statoPagamento;

        if (totalePagato >= fattura.totale) {
          nuovoStato = 'pagata';
        } else if (totalePagato > 0) {
          nuovoStato = 'parzialmente_pagata';
        } else {
          nuovoStato = 'non_pagata';
        }

        await prisma.fattura.update({
          where: { id: fattura.id },
          data: {
            statoPagamento: nuovoStato,
            importoPagato: totalePagato,
            importoDaPagare: fattura.totale - totalePagato
          }
        });
      }
    }

    res.json(pagamentoAggiornato);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del pagamento:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del pagamento' });
  }
});

/**
 * @route   DELETE /api/pagamenti/:id
 * @desc    Elimina pagamento (ricalcola stato fattura)
 * @access  Private
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const pagamento = await prisma.pagamento.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento non trovato' });
    }

    const fatturaId = pagamento.fatturaId;

    // Elimina il pagamento
    await prisma.pagamento.delete({
      where: { id }
    });

    // Ricalcola stato fattura
    const fattura = await prisma.fattura.findUnique({
      where: { id: fatturaId },
      include: { pagamenti: true }
    });

    if (fattura) {
      const totalePagato = fattura.pagamenti.reduce((sum, p) => sum + p.importo, 0);
      let nuovoStato = fattura.statoPagamento;

      if (totalePagato >= fattura.totale) {
        nuovoStato = 'pagata';
      } else if (totalePagato > 0) {
        nuovoStato = 'parzialmente_pagata';
      } else {
        nuovoStato = 'non_pagata';
      }

      await prisma.fattura.update({
        where: { id: fattura.id },
        data: {
          statoPagamento: nuovoStato,
          importoPagato: totalePagato,
          importoDaPagare: fattura.totale - totalePagato
        }
      });
    }

    res.json({ message: 'Pagamento eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del pagamento:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del pagamento' });
  }
});

/**
 * @route   GET /api/pagamenti/fattura/:fatturaId/residuo
 * @desc    Calcola importo residuo da pagare per una fattura
 * @access  Private
 */
router.get('/fattura/:fatturaId/residuo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fatturaId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const fattura = await prisma.fattura.findFirst({
      where: {
        id: fatturaId,
        companyId: user.companyId
      },
      include: {
        pagamenti: true
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    const totalePagato = fattura.pagamenti.reduce((sum, p) => sum + p.importo, 0);
    const residuo = fattura.totale - totalePagato;

    res.json({
      fatturaId: fattura.id,
      numeroFattura: fattura.numero,
      totale: fattura.totale,
      totalePagato,
      residuo,
      statoPagamento: fattura.statoPagamento,
      pagamenti: fattura.pagamenti.map(p => ({
        id: p.id,
        importo: p.importo,
        metodoPagamento: p.metodoPagamento,
        dataPagamento: p.dataPagamento,
        riferimento: p.riferimento
      }))
    });
  } catch (error) {
    console.error('Errore nel calcolo del residuo:', error);
    res.status(500).json({ error: 'Errore nel calcolo del residuo' });
  }
});

export default router;
