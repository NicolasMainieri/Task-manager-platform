import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/fatture
 * @desc    Lista fatture dell'azienda con filtri opzionali
 * @query   statoPagamento, clienteNome, anno, mese
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

    const { statoPagamento, clienteNome, anno, mese, contactId } = req.query;

    // Build where clause
    const where: any = {
      companyId: user.companyId
    };

    if (statoPagamento) {
      where.statoPagamento = statoPagamento;
    }

    if (clienteNome) {
      where.clienteNome = {
        contains: clienteNome as string
      };
    }

    if (contactId) {
      where.contactId = contactId as string;
    }

    if (anno) {
      where.anno = parseInt(anno as string);
    }

    if (mese) {
      where.dataEmissione = {
        gte: new Date(parseInt(anno as string || new Date().getFullYear().toString()), parseInt(mese as string) - 1, 1),
        lt: new Date(parseInt(anno as string || new Date().getFullYear().toString()), parseInt(mese as string), 1)
      };
    }

    const fatture = await prisma.fattura.findMany({
      where,
      include: {
        pagamenti: true
      },
      orderBy: [
        { anno: 'desc' },
        { progressivo: 'desc' }
      ]
    });

    // Parse JSON righe field
    const fattureWithParsedData = fatture.map(fattura => ({
      ...fattura,
      righe: JSON.parse(fattura.righe)
    }));

    res.json(fattureWithParsedData);
  } catch (error) {
    console.error('Errore nel recupero delle fatture:', error);
    res.status(500).json({ error: 'Errore nel recupero delle fatture' });
  }
});

/**
 * @route   GET /api/fatture/stats
 * @desc    Statistiche fatturazione (totale fatturato, pagato, da pagare)
 * @query   anno (opzionale)
 * @access  Private
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const { anno } = req.query;
    const annoFiltro = anno ? parseInt(anno as string) : new Date().getFullYear();

    const fatture = await prisma.fattura.findMany({
      where: {
        companyId: user.companyId,
        anno: annoFiltro
      },
      include: {
        pagamenti: true
      }
    });

    const stats = {
      anno: annoFiltro,
      totaleEmesse: fatture.length,
      totaleImponibile: fatture.reduce((sum, f) => sum + f.imponibile, 0),
      totaleIva: fatture.reduce((sum, f) => sum + (f.totale - f.imponibile), 0),
      totaleFatturato: fatture.reduce((sum, f) => sum + f.totale, 0),
      totalePagato: fatture.filter(f => f.statoPagamento === 'pagata').reduce((sum, f) => sum + f.totale, 0),
      totaleDaPagare: fatture.filter(f => f.statoPagamento !== 'pagata' && f.statoPagamento !== 'annullata').reduce((sum, f) => sum + f.totale, 0),
      totaleScadute: fatture.filter(f => f.statoPagamento === 'scaduta').reduce((sum, f) => sum + f.totale, 0),
      perStato: {
        nonPagata: fatture.filter(f => f.statoPagamento === 'non_pagata').length,
        parzialmentePagata: fatture.filter(f => f.statoPagamento === 'parzialmente_pagata').length,
        pagata: fatture.filter(f => f.statoPagamento === 'pagata').length,
        scaduta: fatture.filter(f => f.statoPagamento === 'scaduta').length
      },
      perMese: [] as any[]
    };

    // Calcola statistiche mensili
    for (let mese = 1; mese <= 12; mese++) {
      const fattureMese = fatture.filter(f => {
        const dataEmissione = new Date(f.dataEmissione);
        return dataEmissione.getMonth() + 1 === mese;
      });

      stats.perMese.push({
        mese,
        totaleEmesse: fattureMese.length,
        totaleFatturato: fattureMese.reduce((sum, f) => sum + f.totale, 0),
        totalePagato: fattureMese.filter(f => f.statoPagamento === 'pagata').reduce((sum, f) => sum + f.totale, 0)
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

/**
 * @route   GET /api/fatture/numero-disponibile
 * @desc    Ottiene il prossimo numero di fattura disponibile per l'anno corrente
 * @query   anno (opzionale, default anno corrente)
 * @access  Private
 */
router.get('/numero-disponibile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const { anno } = req.query;
    const annoTarget = anno ? parseInt(anno as string) : new Date().getFullYear();

    // Trova l'ultima fattura dell'anno
    const ultimaFattura = await prisma.fattura.findFirst({
      where: {
        companyId: user.companyId,
        anno: annoTarget
      },
      orderBy: {
        progressivo: 'desc'
      }
    });

    const prossimoProgressivo = ultimaFattura ? ultimaFattura.progressivo + 1 : 1;
    const prossimoNumero = `${prossimoProgressivo}/${annoTarget}`;

    res.json({
      anno: annoTarget,
      progressivo: prossimoProgressivo,
      numero: prossimoNumero
    });
  } catch (error) {
    console.error('Errore nel recupero del numero disponibile:', error);
    res.status(500).json({ error: 'Errore nel recupero del numero disponibile' });
  }
});

/**
 * @route   GET /api/fatture/:id
 * @desc    Dettaglio singola fattura con pagamenti
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

    const fattura = await prisma.fattura.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        pagamenti: {
          orderBy: {
            dataPagamento: 'desc'
          }
        }
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    res.json({
      ...fattura,
      righe: JSON.parse(fattura.righe)
    });
  } catch (error) {
    console.error('Errore nel recupero della fattura:', error);
    res.status(500).json({ error: 'Errore nel recupero della fattura' });
  }
});

/**
 * @route   POST /api/fatture
 * @desc    Crea nuova fattura
 * @body    { clienteNome, clientePIva, clienteCF, clienteIndirizzo, clienteCitta, clienteCAP, clientePaese, righe[], imponibile, iva, totale, dataEmissione, dataScadenza, note, metodoPagamento }
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      clienteNome,
      clientePIva,
      clienteCF,
      clienteIndirizzo,
      clienteCitta,
      clienteCAP,
      clientePaese,
      clienteEmail,
      clienteTelefono,
      righe,
      imponibile,
      iva,
      totale,
      dataEmissione,
      dataScadenza,
      note,
      metodoPagamento,
      contactId,
      preventivoId,
      progettoId
    } = req.body;

    if (!clienteNome || !righe || righe.length === 0) {
      return res.status(400).json({ error: 'Nome cliente e righe sono obbligatori' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const anno = new Date(dataEmissione || new Date()).getFullYear();

    // Trova il prossimo numero progressivo
    const ultimaFattura = await prisma.fattura.findFirst({
      where: {
        companyId: user.companyId,
        anno
      },
      orderBy: {
        progressivo: 'desc'
      }
    });

    const progressivo = ultimaFattura ? ultimaFattura.progressivo + 1 : 1;
    const numero = `${progressivo}/${anno}`;

    const dataScadenzaDate = dataScadenza ? new Date(dataScadenza) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Auto-create or find contact
    let finalContactId = contactId;
    if (!contactId && (clientePIva || clienteEmail)) {
      // Search for existing contact by P.IVA or email
      const existingContact = await prisma.contact.findFirst({
        where: {
          companyId: user.companyId,
          OR: [
            clientePIva ? { partitaIva: clientePIva } : {},
            clienteEmail ? { email: clienteEmail } : {}
          ].filter(obj => Object.keys(obj).length > 0)
        }
      });

      if (existingContact) {
        finalContactId = existingContact.id;
      } else {
        // Create new contact
        const newContact = await prisma.contact.create({
          data: {
            nome: clienteNome,
            email: clienteEmail,
            telefono: clienteTelefono,
            azienda: clienteNome,
            partitaIva: clientePIva,
            codiceFiscale: clienteCF,
            indirizzo: clienteIndirizzo,
            citta: clienteCitta,
            cap: clienteCAP,
            paese: clientePaese || 'Italia',
            createdById: req.user.id,
            companyId: user.companyId
          }
        });
        finalContactId = newContact.id;
      }
    }

    const fattura = await prisma.fattura.create({
      data: {
        numero,
        anno,
        progressivo,
        clienteNome,
        clientePIva,
        clienteCF,
        clienteIndirizzo,
        clienteCitta,
        clienteCAP,
        clientePaese: clientePaese || 'Italia',
        clienteEmail,
        clienteTelefono,
        righe: JSON.stringify(righe),
        imponibile: imponibile || 0,
        iva: iva || 0,
        totale: totale || 0,
        importoDaPagare: totale || 0,
        dataEmissione: dataEmissione ? new Date(dataEmissione) : new Date(),
        dataScadenza: dataScadenzaDate,
        note,
        metodoPagamento,
        statoPagamento: 'non_pagata',
        createdById: req.user.id,
        companyId: user.companyId,
        contactId: finalContactId,
        preventivoId,
        progettoId
      },
      include: {
        pagamenti: true
      }
    });

    res.status(201).json({
      ...fattura,
      righe: JSON.parse(fattura.righe)
    });
  } catch (error) {
    console.error('Errore nella creazione della fattura:', error);
    res.status(500).json({ error: 'Errore nella creazione della fattura' });
  }
});

/**
 * @route   PUT /api/fatture/:id
 * @desc    Aggiorna fattura
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      clienteNome,
      clientePIva,
      clienteCF,
      clienteIndirizzo,
      clienteCitta,
      clienteCAP,
      clientePaese,
      clienteEmail,
      clienteTelefono,
      righe,
      imponibile,
      iva,
      totale,
      dataEmissione,
      dataScadenza,
      note,
      metodoPagamento
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const fattura = await prisma.fattura.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    // Non permettere modifiche a fatture pagate
    if (fattura.statoPagamento === 'pagata') {
      return res.status(400).json({ error: 'Impossibile modificare una fattura già pagata' });
    }

    const fatturaAggiornata = await prisma.fattura.update({
      where: { id },
      data: {
        clienteNome,
        clientePIva,
        clienteCF,
        clienteIndirizzo,
        clienteCitta,
        clienteCAP,
        clientePaese,
        clienteEmail,
        clienteTelefono,
        righe: righe ? JSON.stringify(righe) : undefined,
        imponibile,
        iva,
        totale,
        importoDaPagare: totale !== undefined ? totale - fattura.importoPagato : undefined,
        dataEmissione: dataEmissione ? new Date(dataEmissione) : undefined,
        dataScadenza: dataScadenza ? new Date(dataScadenza) : undefined,
        note,
        metodoPagamento
      },
      include: {
        pagamenti: true
      }
    });

    res.json({
      ...fatturaAggiornata,
      righe: JSON.parse(fatturaAggiornata.righe)
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento della fattura:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della fattura' });
  }
});

/**
 * @route   PUT /api/fatture/:id/stato
 * @desc    Cambia stato fattura
 * @body    { statoPagamento: 'non_pagata' | 'parzialmente_pagata' | 'pagata' | 'scaduta' }
 * @access  Private
 */
router.put('/:id/stato', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statoPagamento } = req.body;

    const statiValidi = ['non_pagata', 'parzialmente_pagata', 'pagata', 'scaduta'];
    if (!statiValidi.includes(statoPagamento)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const fattura = await prisma.fattura.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    const fatturaAggiornata = await prisma.fattura.update({
      where: { id },
      data: { statoPagamento },
      include: {
        pagamenti: true
      }
    });

    res.json({
      ...fatturaAggiornata,
      righe: JSON.parse(fatturaAggiornata.righe)
    });
  } catch (error) {
    console.error('Errore nel cambio stato della fattura:', error);
    res.status(500).json({ error: 'Errore nel cambio stato della fattura' });
  }
});

/**
 * @route   GET /api/fatture/:id/pdf
 * @desc    Genera e scarica PDF della fattura
 * @access  Private
 */
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const PDFDocument = require('pdfkit');
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, company: { select: { nome: true } } }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const fattura = await prisma.fattura.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    const righe = JSON.parse(fattura.righe);

    // Crea PDF
    const doc = new PDFDocument({ margin: 50 });

    // Headers per il download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Fattura_${fattura.numero}.pdf`);

    doc.pipe(res);

    // Intestazione
    doc.fontSize(20).text('FATTURA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Numero: ${fattura.numero}`, { align: 'right' });
    doc.text(`Data: ${new Date(fattura.dataEmissione).toLocaleDateString('it-IT')}`, { align: 'right' });
    doc.moveDown();

    // Dati azienda
    doc.fontSize(14).text('Emittente:', { underline: true });
    doc.fontSize(10).text(user.company?.nome || 'Azienda');
    doc.moveDown();

    // Dati cliente
    doc.fontSize(14).text('Cliente:', { underline: true });
    doc.fontSize(10).text(fattura.clienteNome);
    if (fattura.clienteEmail) doc.text(`Email: ${fattura.clienteEmail}`);
    if (fattura.clienteIndirizzo) doc.text(`Indirizzo: ${fattura.clienteIndirizzo}`);
    if (fattura.clienteCitta) doc.text(`${fattura.clienteCitta} ${fattura.clienteCAP || ''}`);
    if (fattura.clientePIva) doc.text(`P.IVA: ${fattura.clientePIva}`);
    doc.moveDown();

    // Tabella righe
    doc.fontSize(12).text('Dettaglio:', { underline: true });
    doc.moveDown(0.5);

    let y = doc.y;
    righe.forEach((riga: any, index: number) => {
      doc.fontSize(10);
      doc.text(`${index + 1}. ${riga.descrizione}`, 50, y);
      doc.text(`Qtà: ${riga.quantita}`, 350, y);
      doc.text(`€${riga.prezzoUnitario.toFixed(2)}`, 420, y);
      doc.text(`€${(riga.quantita * riga.prezzoUnitario).toFixed(2)}`, 480, y, { align: 'right' });
      y += 20;
    });

    doc.moveDown(2);

    // Calcolo totali per il PDF
    const totaleIva = fattura.totale - fattura.imponibile;
    doc.fontSize(12);
    doc.text(`Imponibile: €${fattura.imponibile.toFixed(2)}`, { align: 'right' });
    doc.text(`IVA (${fattura.iva}%): €${totaleIva.toFixed(2)}`, { align: 'right' });
    doc.fontSize(14).text(`TOTALE: €${fattura.totale.toFixed(2)}`, { align: 'right', underline: true });

    doc.end();
  } catch (error) {
    console.error('Errore nella generazione del PDF:', error);
    res.status(500).json({ error: 'Errore nella generazione del PDF' });
  }
});

/**
 * @route   DELETE /api/fatture/:id
 * @desc    Elimina fattura (solo se non pagata)
 * @access  Private
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

    const fattura = await prisma.fattura.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!fattura) {
      return res.status(404).json({ error: 'Fattura non trovata' });
    }

    // Solo fatture non pagate possono essere eliminate
    if (fattura.statoPagamento !== 'non_pagata') {
      return res.status(400).json({ error: 'Impossibile eliminare una fattura già pagata o parzialmente pagata' });
    }

    await prisma.fattura.delete({
      where: { id }
    });

    res.json({ message: 'Fattura eliminata con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione della fattura:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della fattura' });
  }
});

export default router;
