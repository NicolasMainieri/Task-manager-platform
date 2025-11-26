import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/assenze
 * @desc    Lista richieste di assenza con filtri
 * @query   userId, stato, tipo, dataInizio, dataFine
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const { userId, stato, tipo, dataInizio, dataFine } = req.query;

    const where: any = {
      companyId: user.companyId
    };

    // Solo admin/manager possono vedere le richieste di tutti
    if (userId && user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'Non hai i permessi per visualizzare le richieste di altri utenti' });
      }
    }

    if (userId) {
      where.userId = userId as string;
    } else if (user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      // I dipendenti vedono solo le proprie richieste
      where.userId = req.user.id;
    }

    if (stato) {
      where.stato = stato;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (dataInizio || dataFine) {
      where.dataInizio = {};
      if (dataInizio) {
        where.dataInizio.gte = new Date(dataInizio as string);
      }
      if (dataFine) {
        where.dataInizio.lte = new Date(dataFine as string);
      }
    }

    const richieste = await prisma.richiestaAssenza.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(richieste);
  } catch (error) {
    console.error('Errore nel recupero delle richieste di assenza:', error);
    res.status(500).json({ error: 'Errore nel recupero delle richieste di assenza' });
  }
});

/**
 * @route   GET /api/assenze/pending
 * @desc    Lista richieste in attesa di approvazione (solo per admin/manager)
 * @access  Private (Admin/Manager)
 */
router.get('/pending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    if (user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      return res.status(403).json({ error: 'Solo admin e manager possono visualizzare le richieste in sospeso' });
    }

    const richieste = await prisma.richiestaAssenza.findMany({
      where: {
        companyId: user.companyId,
        stato: 'pending'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(richieste);
  } catch (error) {
    console.error('Errore nel recupero delle richieste in sospeso:', error);
    res.status(500).json({ error: 'Errore nel recupero delle richieste in sospeso' });
  }
});

/**
 * @route   GET /api/assenze/stats/:anno
 * @desc    Statistiche assenze per anno (giorni di ferie/permessi/malattia usati)
 * @query   userId (opzionale)
 * @access  Private
 */
router.get('/stats/:anno', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { anno } = req.params;
    const { userId } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica permessi
    const targetUserId = userId as string || req.user.id;
    if (targetUserId !== req.user.id && user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      return res.status(403).json({ error: 'Non hai i permessi per visualizzare le statistiche di altri utenti' });
    }

    const inizioAnno = new Date(parseInt(anno), 0, 1);
    const fineAnno = new Date(parseInt(anno) + 1, 0, 1);

    const richieste = await prisma.richiestaAssenza.findMany({
      where: {
        userId: targetUserId,
        companyId: user.companyId,
        stato: 'approvata',
        dataInizio: {
          gte: inizioAnno,
          lt: fineAnno
        }
      }
    });

    // Calcola giorni per tipo
    const stats = {
      anno: parseInt(anno),
      ferie: {
        giorniUsati: 0,
        richieste: 0
      },
      permessi: {
        giorniUsati: 0,
        richieste: 0
      },
      malattia: {
        giorniUsati: 0,
        richieste: 0
      },
      altro: {
        giorniUsati: 0,
        richieste: 0
      }
    };

    richieste.forEach(richiesta => {
      const giorni = richiesta.giorniRichiesti;
      const tipo = richiesta.tipo;

      if (tipo === 'ferie') {
        stats.ferie.giorniUsati += giorni;
        stats.ferie.richieste++;
      } else if (tipo === 'permesso') {
        stats.permessi.giorniUsati += giorni;
        stats.permessi.richieste++;
      } else if (tipo === 'malattia') {
        stats.malattia.giorniUsati += giorni;
        stats.malattia.richieste++;
      } else {
        stats.altro.giorniUsati += giorni;
        stats.altro.richieste++;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Errore nel calcolo delle statistiche:', error);
    res.status(500).json({ error: 'Errore nel calcolo delle statistiche' });
  }
});

/**
 * @route   GET /api/assenze/:id
 * @desc    Dettaglio singola richiesta di assenza
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const richiesta = await prisma.richiestaAssenza.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!richiesta) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    // Verifica permessi
    if (richiesta.userId !== req.user.id && user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      return res.status(403).json({ error: 'Non hai i permessi per visualizzare questa richiesta' });
    }

    res.json(richiesta);
  } catch (error) {
    console.error('Errore nel recupero della richiesta:', error);
    res.status(500).json({ error: 'Errore nel recupero della richiesta' });
  }
});

/**
 * @route   POST /api/assenze
 * @desc    Crea nuova richiesta di assenza
 * @body    { tipo, dataInizio, dataFine, giorniRichiesti, motivazione, documentoAllegato }
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tipo,
      dataInizio,
      dataFine,
      giorniRichiesti,
      motivazione,
      documentoAllegato
    } = req.body;

    if (!tipo || !dataInizio || !dataFine || !giorniRichiesti) {
      return res.status(400).json({ error: 'Tipo, date e giorni richiesti sono obbligatori' });
    }

    const tipiValidi = ['ferie', 'permesso', 'malattia', 'congedo', 'altro'];
    if (!tipiValidi.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo di assenza non valido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica sovrapposizioni con richieste già approvate
    const sovrapposizioni = await prisma.richiestaAssenza.findMany({
      where: {
        userId: req.user.id,
        companyId: user.companyId,
        stato: 'approvata',
        OR: [
          {
            dataInizio: {
              lte: new Date(dataFine)
            },
            dataFine: {
              gte: new Date(dataInizio)
            }
          }
        ]
      }
    });

    if (sovrapposizioni.length > 0) {
      return res.status(400).json({
        error: 'Esiste già una richiesta approvata per questo periodo',
        sovrapposizioni
      });
    }

    const richiesta = await prisma.richiestaAssenza.create({
      data: {
        userId: req.user.id,
        companyId: user.companyId,
        tipo,
        dataInizio: new Date(dataInizio),
        dataFine: new Date(dataFine),
        giorniRichiesti,
        motivazione,
        stato: 'pending'
      }
    });

    res.status(201).json(richiesta);
  } catch (error) {
    console.error('Errore nella creazione della richiesta:', error);
    res.status(500).json({ error: 'Errore nella creazione della richiesta' });
  }
});

/**
 * @route   PUT /api/assenze/:id
 * @desc    Modifica richiesta di assenza (solo se in_attesa)
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tipo,
      dataInizio,
      dataFine,
      giorniRichiesti,
      motivazione,
      documentoAllegato
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const richiesta = await prisma.richiestaAssenza.findFirst({
      where: {
        id,
        companyId: user.companyId,
        userId: req.user.id
      }
    });

    if (!richiesta) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    // Solo richieste in attesa possono essere modificate
    if (richiesta.stato !== 'in_attesa') {
      return res.status(400).json({ error: 'Impossibile modificare una richiesta già approvata o rifiutata' });
    }

    const richiestaAggiornata = await prisma.richiestaAssenza.update({
      where: { id },
      data: {
        tipo,
        dataInizio: dataInizio ? new Date(dataInizio) : undefined,
        dataFine: dataFine ? new Date(dataFine) : undefined,
        giorniRichiesti,
        motivazione
      }
    });

    res.json(richiestaAggiornata);
  } catch (error) {
    console.error('Errore nell\'aggiornamento della richiesta:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della richiesta' });
  }
});

/**
 * @route   PUT /api/assenze/:id/approva
 * @desc    Approva richiesta di assenza (solo admin/manager)
 * @body    { noteApprovazione }
 * @access  Private (Admin/Manager)
 */
router.put('/:id/approva', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { noteApprovazione } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    if (user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      return res.status(403).json({ error: 'Solo admin e manager possono approvare le richieste' });
    }

    const richiesta = await prisma.richiestaAssenza.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!richiesta) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    if (richiesta.stato !== 'pending') {
      return res.status(400).json({ error: 'La richiesta è già stata processata' });
    }

    const richiestaAggiornata = await prisma.richiestaAssenza.update({
      where: { id },
      data: {
        stato: 'approvata',
        approvataDa: req.user.id,
        dataApprovazione: new Date(),
        noteApprovazione
      }
    });

    res.json(richiestaAggiornata);
  } catch (error) {
    console.error('Errore nell\'approvazione della richiesta:', error);
    res.status(500).json({ error: 'Errore nell\'approvazione della richiesta' });
  }
});

/**
 * @route   PUT /api/assenze/:id/rifiuta
 * @desc    Rifiuta richiesta di assenza (solo admin/manager)
 * @body    { noteApprovazione }
 * @access  Private (Admin/Manager)
 */
router.put('/:id/rifiuta', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { noteApprovazione } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    if (user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      return res.status(403).json({ error: 'Solo admin e manager possono rifiutare le richieste' });
    }

    const richiesta = await prisma.richiestaAssenza.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!richiesta) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    if (richiesta.stato !== 'pending') {
      return res.status(400).json({ error: 'La richiesta è già stata processata' });
    }

    const richiestaAggiornata = await prisma.richiestaAssenza.update({
      where: { id },
      data: {
        stato: 'rifiutata',
        approvataDa: req.user.id,
        dataApprovazione: new Date(),
        noteApprovazione
      }
    });

    res.json(richiestaAggiornata);
  } catch (error) {
    console.error('Errore nel rifiuto della richiesta:', error);
    res.status(500).json({ error: 'Errore nel rifiuto della richiesta' });
  }
});

/**
 * @route   DELETE /api/assenze/:id
 * @desc    Elimina richiesta di assenza (solo se in_attesa)
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

    const richiesta = await prisma.richiestaAssenza.findFirst({
      where: {
        id,
        companyId: user.companyId,
        userId: req.user.id
      }
    });

    if (!richiesta) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    // Solo richieste in attesa possono essere eliminate
    if (richiesta.stato !== 'pending') {
      return res.status(400).json({ error: 'Impossibile eliminare una richiesta già approvata o rifiutata' });
    }

    await prisma.richiestaAssenza.delete({
      where: { id }
    });

    res.json({ message: 'Richiesta eliminata con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione della richiesta:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della richiesta' });
  }
});

export default router;
