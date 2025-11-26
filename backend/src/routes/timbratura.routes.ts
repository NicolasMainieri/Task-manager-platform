import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/timbrature
 * @desc    Lista timbrature (entrate/uscite) con filtri
 * @query   userId, dataInizio, dataFine, tipo
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

    const { userId, dataInizio, dataFine, tipo } = req.query;

    const where: any = {
      companyId: user.companyId
    };

    // Solo admin/manager possono vedere le timbrature di altri
    if (userId && user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'Non hai i permessi per visualizzare le timbrature di altri utenti' });
      }
    }

    if (userId) {
      where.userId = userId as string;
    } else if (user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      // I dipendenti vedono solo le proprie timbrature
      where.userId = req.user.id;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (dataInizio || dataFine) {
      where.timestamp = {};
      if (dataInizio) {
        where.timestamp.gte = new Date(dataInizio as string);
      }
      if (dataFine) {
        where.timestamp.lte = new Date(dataFine as string);
      }
    }

    const timbrature = await prisma.timbratura.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      }
    });

    res.json(timbrature);
  } catch (error) {
    console.error('Errore nel recupero delle timbrature:', error);
    res.status(500).json({ error: 'Errore nel recupero delle timbrature' });
  }
});

/**
 * @route   GET /api/timbrature/oggi
 * @desc    Timbrature di oggi per l'utente corrente
 * @access  Private
 */
router.get('/oggi', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const domani = new Date(oggi);
    domani.setDate(domani.getDate() + 1);

    const timbrature = await prisma.timbratura.findMany({
      where: {
        userId: req.user.id,
        companyId: user.companyId,
        timestamp: {
          gte: oggi,
          lt: domani
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Calcola ore lavorate oggi
    let oreLavorate = 0;
    for (let i = 0; i < timbrature.length - 1; i += 2) {
      if (timbrature[i].tipo === 'entrata' && timbrature[i + 1]?.tipo === 'uscita') {
        const entrata = new Date(timbrature[i].timestamp);
        const uscita = new Date(timbrature[i + 1].timestamp);
        const diff = (uscita.getTime() - entrata.getTime()) / (1000 * 60 * 60); // Ore
        oreLavorate += diff;
      }
    }

    // Verifica se attualmente al lavoro
    const ultimaTimbratura = timbrature[timbrature.length - 1];
    const alLavoro = ultimaTimbratura?.tipo === 'entrata';

    res.json({
      timbrature,
      oreLavorateOggi: parseFloat(oreLavorate.toFixed(2)),
      alLavoro,
      ultimaTimbratura: ultimaTimbratura || null
    });
  } catch (error) {
    console.error('Errore nel recupero delle timbrature di oggi:', error);
    res.status(500).json({ error: 'Errore nel recupero delle timbrature di oggi' });
  }
});

/**
 * @route   GET /api/timbrature/mese/:anno/:mese
 * @desc    Timbrature del mese per un utente
 * @query   userId (opzionale, default utente corrente)
 * @access  Private
 */
router.get('/mese/:anno/:mese', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { anno, mese } = req.params;
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
      return res.status(403).json({ error: 'Non hai i permessi per visualizzare le timbrature di altri utenti' });
    }

    const inizioMese = new Date(parseInt(anno), parseInt(mese) - 1, 1);
    const fineMese = new Date(parseInt(anno), parseInt(mese), 1);

    const timbrature = await prisma.timbratura.findMany({
      where: {
        userId: targetUserId,
        companyId: user.companyId,
        timestamp: {
          gte: inizioMese,
          lt: fineMese
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Calcola statistiche mensili
    let oreLavorate = 0;
    let giorniLavorati = new Set<string>();

    for (let i = 0; i < timbrature.length - 1; i += 2) {
      if (timbrature[i].tipo === 'entrata' && timbrature[i + 1]?.tipo === 'uscita') {
        const entrata = new Date(timbrature[i].timestamp);
        const uscita = new Date(timbrature[i + 1].timestamp);
        const diff = (uscita.getTime() - entrata.getTime()) / (1000 * 60 * 60); // Ore
        oreLavorate += diff;

        const giorno = entrata.toISOString().split('T')[0];
        giorniLavorati.add(giorno);
      }
    }

    res.json({
      anno: parseInt(anno),
      mese: parseInt(mese),
      timbrature,
      statistiche: {
        oreTotali: parseFloat(oreLavorate.toFixed(2)),
        giorniLavorati: giorniLavorati.size,
        mediaOreGiorno: giorniLavorati.size > 0 ? parseFloat((oreLavorate / giorniLavorati.size).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Errore nel recupero delle timbrature mensili:', error);
    res.status(500).json({ error: 'Errore nel recupero delle timbrature mensili' });
  }
});

/**
 * @route   POST /api/timbrature
 * @desc    Registra nuova timbratura (entrata/uscita)
 * @body    { tipo: 'entrata' | 'uscita', note, latitude, longitude, modalita, foto, indirizzoIP }
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tipo,
      note,
      latitudine,
      longitudine,
      modalita,
      ipAddress
    } = req.body;

    if (!tipo || !['entrata', 'uscita', 'pausa_inizio', 'pausa_fine'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo timbratura non valido (entrata/uscita/pausa_inizio/pausa_fine)' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica logica entrate/uscite
    const ultimaTimbratura = await prisma.timbratura.findFirst({
      where: {
        userId: req.user.id,
        companyId: user.companyId
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Validazione: non puoi fare entrata se l'ultima è entrata, e viceversa
    if (ultimaTimbratura) {
      if (tipo === 'entrata' && ultimaTimbratura.tipo === 'entrata') {
        return res.status(400).json({ error: 'Hai già timbrato l\'entrata. Devi prima timbrare l\'uscita.' });
      }
      if (tipo === 'uscita' && ultimaTimbratura.tipo === 'uscita') {
        return res.status(400).json({ error: 'Hai già timbrato l\'uscita. Devi prima timbrare l\'entrata.' });
      }
    }

    const timbratura = await prisma.timbratura.create({
      data: {
        userId: req.user.id,
        companyId: user.companyId,
        tipo,
        timestamp: new Date(),
        note,
        latitudine,
        longitudine,
        modalita: modalita || 'manuale',
        ipAddress: ipAddress || req.ip
      }
    });

    res.status(201).json(timbratura);
  } catch (error) {
    console.error('Errore nella registrazione della timbratura:', error);
    res.status(500).json({ error: 'Errore nella registrazione della timbratura' });
  }
});

/**
 * @route   PUT /api/timbrature/:id
 * @desc    Modifica timbratura esistente (solo admin)
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tipo, timestamp, note, latitudine, longitudine } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Solo admin possono modificare timbrature
    if (user.role.nome !== 'admin') {
      return res.status(403).json({ error: 'Solo gli amministratori possono modificare le timbrature' });
    }

    const timbratura = await prisma.timbratura.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!timbratura) {
      return res.status(404).json({ error: 'Timbratura non trovata' });
    }

    const timbratureAggiornata = await prisma.timbratura.update({
      where: { id },
      data: {
        tipo,
        timestamp: timestamp ? new Date(timestamp) : undefined,
        note,
        latitudine,
        longitudine
      }
    });

    res.json(timbratureAggiornata);
  } catch (error) {
    console.error('Errore nell\'aggiornamento della timbratura:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della timbratura' });
  }
});

/**
 * @route   DELETE /api/timbrature/:id
 * @desc    Elimina timbratura (solo admin)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Solo admin possono eliminare timbrature
    if (user.role.nome !== 'admin') {
      return res.status(403).json({ error: 'Solo gli amministratori possono eliminare le timbrature' });
    }

    const timbratura = await prisma.timbratura.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!timbratura) {
      return res.status(404).json({ error: 'Timbratura non trovata' });
    }

    await prisma.timbratura.delete({
      where: { id }
    });

    res.json({ message: 'Timbratura eliminata con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione della timbratura:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della timbratura' });
  }
});

/**
 * @route   GET /api/timbrature/report/:userId/:anno/:mese
 * @desc    Report presenze mensile dettagliato
 * @access  Private
 */
router.get('/report/:userId/:anno/:mese', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, anno, mese } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, role: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica permessi
    if (userId !== req.user.id && user.role.nome !== 'admin' && user.role.nome !== 'manager') {
      return res.status(403).json({ error: 'Non hai i permessi per visualizzare questo report' });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: user.companyId
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const inizioMese = new Date(parseInt(anno), parseInt(mese) - 1, 1);
    const fineMese = new Date(parseInt(anno), parseInt(mese), 1);

    const timbrature = await prisma.timbratura.findMany({
      where: {
        userId,
        companyId: user.companyId,
        timestamp: {
          gte: inizioMese,
          lt: fineMese
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Organizza per giorno
    const giorniMap = new Map<string, any>();

    for (let i = 0; i < timbrature.length - 1; i++) {
      const timbratura = timbrature[i];
      const giorno = new Date(timbratura.timestamp).toISOString().split('T')[0];

      if (!giorniMap.has(giorno)) {
        giorniMap.set(giorno, {
          data: giorno,
          timbrature: [],
          oreLavorate: 0,
          entrata: null,
          uscita: null
        });
      }

      const giornoData = giorniMap.get(giorno);
      giornoData.timbrature.push(timbratura);

      if (timbratura.tipo === 'entrata' && !giornoData.entrata) {
        giornoData.entrata = timbratura.timestamp;
      }

      if (timbratura.tipo === 'uscita') {
        giornoData.uscita = timbratura.timestamp;
      }

      // Calcola ore se c'è coppia entrata-uscita
      if (timbratura.tipo === 'entrata' && timbrature[i + 1]?.tipo === 'uscita') {
        const entrata = new Date(timbratura.timestamp);
        const uscita = new Date(timbrature[i + 1].timestamp);
        const diff = (uscita.getTime() - entrata.getTime()) / (1000 * 60 * 60);
        giornoData.oreLavorate += diff;
      }
    }

    const giorni = Array.from(giorniMap.values()).map(g => ({
      ...g,
      oreLavorate: parseFloat(g.oreLavorate.toFixed(2))
    }));

    const oreTotali = giorni.reduce((sum, g) => sum + g.oreLavorate, 0);

    res.json({
      utente: targetUser,
      periodo: {
        anno: parseInt(anno),
        mese: parseInt(mese)
      },
      giorni,
      riepilogo: {
        oreTotali: parseFloat(oreTotali.toFixed(2)),
        giorniLavorati: giorni.filter(g => g.oreLavorate > 0).length,
        mediaOreGiorno: giorni.length > 0 ? parseFloat((oreTotali / giorni.filter(g => g.oreLavorate > 0).length).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Errore nella generazione del report:', error);
    res.status(500).json({ error: 'Errore nella generazione del report' });
  }
});

export default router;
