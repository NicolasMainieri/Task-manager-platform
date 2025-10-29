import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/crm - Lista tutti i CRM dell'azienda
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const crms = await prisma.cRMTemplate.findMany({
      where: {
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            records: true,
            fields: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(crms);
  } catch (error) {
    console.error('Errore nel recupero dei CRM:', error);
    res.status(500).json({ error: 'Errore nel recupero dei CRM' });
  }
});

// GET /api/crm/:id - Dettaglio CRM con campi e record
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

    const crm = await prisma.cRMTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        fields: {
          orderBy: {
            ordine: 'asc'
          }
        },
        records: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!crm) {
      return res.status(404).json({ error: 'CRM non trovato' });
    }

    // Parse JSON fields
    const recordsWithParsedData = crm.records.map(record => ({
      ...record,
      dati: JSON.parse(record.dati),
      tags: JSON.parse(record.tags)
    }));

    const fieldsWithParsedOptions = crm.fields.map(field => ({
      ...field,
      opzioni: JSON.parse(field.opzioni)
    }));

    res.json({
      ...crm,
      fields: fieldsWithParsedOptions,
      records: recordsWithParsedData
    });
  } catch (error) {
    console.error('Errore nel recupero del CRM:', error);
    res.status(500).json({ error: 'Errore nel recupero del CRM' });
  }
});

// POST /api/crm - Crea nuovo CRM
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, descrizione, icona, colore, nomeTabella, progettoId, fields } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Il nome è obbligatorio' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const crm = await prisma.cRMTemplate.create({
      data: {
        nome,
        descrizione,
        icona: icona || 'Users',
        colore: colore || '#3B82F6',
        nomeTabella: nomeTabella || 'Record',
        progettoId,
        createdById: req.user.id,
        companyId: user.companyId,
        fields: {
          create: fields?.map((field: any, index: number) => ({
            nome: field.nome,
            tipo: field.tipo,
            descrizione: field.descrizione,
            ordine: index,
            obbligatorio: field.obbligatorio || false,
            opzioni: JSON.stringify(field.opzioni || []),
            valoreDefault: field.valoreDefault,
            isAggregabile: field.isAggregabile || false,
            isStatPrincipale: field.isStatPrincipale || false
          })) || []
        }
      },
      include: {
        fields: true
      }
    });

    res.status(201).json(crm);
  } catch (error) {
    console.error('Errore nella creazione del CRM:', error);
    res.status(500).json({ error: 'Errore nella creazione del CRM' });
  }
});

// PUT /api/crm/:id - Aggiorna CRM
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, icona, colore, nomeTabella, progettoId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const crm = await prisma.cRMTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!crm) {
      return res.status(404).json({ error: 'CRM non trovato' });
    }

    const updatedCrm = await prisma.cRMTemplate.update({
      where: { id },
      data: {
        nome,
        descrizione,
        icona,
        colore,
        nomeTabella,
        progettoId
      },
      include: {
        fields: true
      }
    });

    res.json(updatedCrm);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del CRM:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del CRM' });
  }
});

// DELETE /api/crm/:id - Elimina CRM
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

    const crm = await prisma.cRMTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!crm) {
      return res.status(404).json({ error: 'CRM non trovato' });
    }

    await prisma.cRMTemplate.delete({
      where: { id }
    });

    res.json({ message: 'CRM eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del CRM:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del CRM' });
  }
});

// POST /api/crm/:id/records - Aggiungi record al CRM
router.post('/:id/records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { dati, contactId, note, tags, createContact } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const crm = await prisma.cRMTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        fields: true
      }
    });

    if (!crm) {
      return res.status(404).json({ error: 'CRM non trovato' });
    }

    // Se createContact è true, crea un contatto dai dati
    let finalContactId = contactId;
    if (createContact && dati) {
      const newContact = await prisma.contact.create({
        data: {
          nome: dati.nome || dati.Nome || 'Nuovo Contatto',
          cognome: dati.cognome || dati.Cognome,
          email: dati.email || dati.Email,
          telefono: dati.telefono || dati.Telefono,
          azienda: dati.azienda || dati.Azienda,
          note: note,
          createdById: req.user.id,
          companyId: user.companyId
        }
      });
      finalContactId = newContact.id;
    }

    const record = await prisma.cRMRecord.create({
      data: {
        crmTemplateId: id,
        dati: JSON.stringify(dati || {}),
        contactId: finalContactId,
        note,
        tags: JSON.stringify(tags || []),
        createdById: req.user.id,
        companyId: user.companyId
      }
    });

    res.status(201).json({
      ...record,
      dati: JSON.parse(record.dati),
      tags: JSON.parse(record.tags)
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta del record:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta del record' });
  }
});

// PUT /api/crm/:id/records/:recordId - Aggiorna record
router.put('/:id/records/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const { dati, note, tags } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const record = await prisma.cRMRecord.findFirst({
      where: {
        id: recordId,
        crmTemplateId: id,
        companyId: user.companyId
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record non trovato' });
    }

    const updatedRecord = await prisma.cRMRecord.update({
      where: { id: recordId },
      data: {
        dati: dati ? JSON.stringify(dati) : undefined,
        note,
        tags: tags ? JSON.stringify(tags) : undefined
      }
    });

    res.json({
      ...updatedRecord,
      dati: JSON.parse(updatedRecord.dati),
      tags: JSON.parse(updatedRecord.tags)
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del record:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del record' });
  }
});

// DELETE /api/crm/:id/records/:recordId - Elimina record
router.delete('/:id/records/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, recordId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const record = await prisma.cRMRecord.findFirst({
      where: {
        id: recordId,
        crmTemplateId: id,
        companyId: user.companyId
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record non trovato' });
    }

    await prisma.cRMRecord.delete({
      where: { id: recordId }
    });

    res.json({ message: 'Record eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del record:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del record' });
  }
});

// GET /api/crm/:id/stats - Statistiche CRM
router.get('/:id/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const crm = await prisma.cRMTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        fields: {
          where: {
            OR: [
              { isAggregabile: true },
              { isStatPrincipale: true }
            ]
          }
        },
        records: true
      }
    });

    if (!crm) {
      return res.status(404).json({ error: 'CRM non trovato' });
    }

    // Calcola statistiche
    const stats: any = {
      totalRecords: crm.records.length,
      aggregatedFields: {}
    };

    // Per ogni campo aggregabile, somma i valori
    for (const field of crm.fields) {
      if (field.isAggregabile && (field.tipo === 'number' || field.tipo === 'currency')) {
        let sum = 0;
        for (const record of crm.records) {
          const dati = JSON.parse(record.dati);
          const value = parseFloat(dati[field.nome]) || 0;
          sum += value;
        }
        stats.aggregatedFields[field.nome] = {
          total: sum,
          average: crm.records.length > 0 ? sum / crm.records.length : 0,
          isPrincipal: field.isStatPrincipale
        };
      }
    }

    res.json(stats);
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

// POST /api/crm/:id/fields - Aggiungi campo al CRM
router.post('/:id/fields', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, tipo, descrizione, obbligatorio, opzioni, isAggregabile, isStatPrincipale } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const crm = await prisma.cRMTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        fields: true
      }
    });

    if (!crm) {
      return res.status(404).json({ error: 'CRM non trovato' });
    }

    // Calcola ordine (ultimo + 1)
    const maxOrdine = crm.fields.length > 0 ? Math.max(...crm.fields.map(f => f.ordine)) : -1;

    const newField = await prisma.cRMField.create({
      data: {
        crmTemplateId: id,
        nome,
        tipo,
        descrizione,
        ordine: maxOrdine + 1,
        obbligatorio: obbligatorio || false,
        opzioni: JSON.stringify(opzioni || []),
        isAggregabile: isAggregabile || false,
        isStatPrincipale: isStatPrincipale || false
      }
    });

    res.status(201).json({
      ...newField,
      opzioni: JSON.parse(newField.opzioni)
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta del campo:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta del campo' });
  }
});

// DELETE /api/crm/:id/fields/:fieldId - Rimuovi campo dal CRM
router.delete('/:id/fields/:fieldId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, fieldId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const field = await prisma.cRMField.findFirst({
      where: {
        id: fieldId,
        crmTemplateId: id,
        crmTemplate: {
          companyId: user.companyId
        }
      }
    });

    if (!field) {
      return res.status(404).json({ error: 'Campo non trovato' });
    }

    await prisma.cRMField.delete({
      where: { id: fieldId }
    });

    res.json({ message: 'Campo eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del campo:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del campo' });
  }
});

export default router;
