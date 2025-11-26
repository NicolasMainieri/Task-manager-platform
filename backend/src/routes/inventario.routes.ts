import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/inventario
 * @desc    Get all inventory items
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

    const { categoria, attivo, search } = req.query;

    const where: any = {
      companyId: user.companyId
    };

    if (categoria) {
      where.categoria = categoria as string;
    }

    if (attivo !== undefined) {
      where.attivo = attivo === 'true';
    }

    if (search) {
      where.OR = [
        { nome: { contains: search as string } },
        { codice: { contains: search as string } },
        { descrizione: { contains: search as string } }
      ];
    }

    const items = await prisma.inventarioItem.findMany({
      where,
      orderBy: { nome: 'asc' }
    });

    res.json(items);
  } catch (error) {
    console.error('Errore nel recupero inventario:', error);
    res.status(500).json({ error: 'Errore nel recupero inventario' });
  }
});

/**
 * @route   GET /api/inventario/stats
 * @desc    Get inventory statistics
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

    const items = await prisma.inventarioItem.findMany({
      where: { companyId: user.companyId, attivo: true }
    });

    const stats = {
      totaleItems: items.length,
      valoreTotale: items.reduce((sum, item) => sum + (item.prezzoVendita * item.quantita), 0),
      itemsSottoScorta: items.filter(item => item.quantita <= item.scorteMinime).length,
      perCategoria: items.reduce((acc: any, item) => {
        const cat = item.categoria || 'Altro';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Errore nel calcolo statistiche:', error);
    res.status(500).json({ error: 'Errore nel calcolo statistiche' });
  }
});

/**
 * @route   POST /api/inventario
 * @desc    Create inventory item
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      codice,
      nome,
      descrizione,
      categoria,
      prezzoAcquisto,
      prezzoVendita,
      iva,
      quantita,
      unitaMisura,
      scorteMinime,
      fornitore,
      fornitoreId,
      note
    } = req.body;

    if (!codice || !nome || prezzoVendita === undefined) {
      return res.status(400).json({ error: 'Codice, nome e prezzo vendita sono obbligatori' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Check for duplicate code
    const existing = await prisma.inventarioItem.findFirst({
      where: {
        companyId: user.companyId,
        codice
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Esiste già un articolo con questo codice' });
    }

    const item = await prisma.inventarioItem.create({
      data: {
        codice,
        nome,
        descrizione,
        categoria,
        prezzoAcquisto: prezzoAcquisto || 0,
        prezzoVendita,
        iva: iva || 22,
        quantita: quantita || 0,
        unitaMisura: unitaMisura || 'pz',
        scorteMinime: scorteMinime || 0,
        fornitore,
        fornitoreId,
        note,
        companyId: user.companyId,
        createdById: req.user.id
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Errore nella creazione articolo:', error);
    res.status(500).json({ error: 'Errore nella creazione articolo' });
  }
});

/**
 * @route   PUT /api/inventario/:id
 * @desc    Update inventory item
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verify ownership
    const existing = await prisma.inventarioItem.findFirst({
      where: { id, companyId: user.companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Articolo non trovato' });
    }

    const item = await prisma.inventarioItem.update({
      where: { id },
      data: updateData
    });

    res.json(item);
  } catch (error) {
    console.error('Errore aggiornamento articolo:', error);
    res.status(500).json({ error: 'Errore aggiornamento articolo' });
  }
});

/**
 * @route   DELETE /api/inventario/:id
 * @desc    Delete inventory item
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

    // Verify ownership
    const existing = await prisma.inventarioItem.findFirst({
      where: { id, companyId: user.companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Articolo non trovato' });
    }

    await prisma.inventarioItem.delete({ where: { id } });

    res.json({ message: 'Articolo eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione articolo:', error);
    res.status(500).json({ error: 'Errore eliminazione articolo' });
  }
});

/**
 * @route   POST /api/inventario/import
 * @desc    Import inventory from CSV/Excel data
 * @access  Private
 */
router.post('/import', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dati non validi' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const results = {
      imported: 0,
      updated: 0,
      errors: [] as string[]
    };

    for (const itemData of items) {
      try {
        if (!itemData.codice || !itemData.nome) {
          results.errors.push(`Riga saltata: mancano codice o nome`);
          continue;
        }

        // Check if exists
        const existing = await prisma.inventarioItem.findFirst({
          where: {
            companyId: user.companyId,
            codice: itemData.codice
          }
        });

        if (existing) {
          // Update
          await prisma.inventarioItem.update({
            where: { id: existing.id },
            data: {
              nome: itemData.nome,
              descrizione: itemData.descrizione,
              categoria: itemData.categoria,
              prezzoAcquisto: parseFloat(itemData.prezzoAcquisto) || 0,
              prezzoVendita: parseFloat(itemData.prezzoVendita) || existing.prezzoVendita,
              iva: parseFloat(itemData.iva) || 22,
              quantita: parseInt(itemData.quantita) || 0,
              unitaMisura: itemData.unitaMisura || 'pz',
              scorteMinime: parseInt(itemData.scorteMinime) || 0,
              fornitore: itemData.fornitore,
              note: itemData.note
            }
          });
          results.updated++;
        } else {
          // Create
          await prisma.inventarioItem.create({
            data: {
              codice: itemData.codice,
              nome: itemData.nome,
              descrizione: itemData.descrizione,
              categoria: itemData.categoria,
              prezzoAcquisto: parseFloat(itemData.prezzoAcquisto) || 0,
              prezzoVendita: parseFloat(itemData.prezzoVendita) || 0,
              iva: parseFloat(itemData.iva) || 22,
              quantita: parseInt(itemData.quantita) || 0,
              unitaMisura: itemData.unitaMisura || 'pz',
              scorteMinime: parseInt(itemData.scorteMinime) || 0,
              fornitore: itemData.fornitore,
              note: itemData.note,
              companyId: user.companyId,
              createdById: req.user.id
            }
          });
          results.imported++;
        }
      } catch (error: any) {
        results.errors.push(`Errore su articolo ${itemData.codice}: ${error.message}`);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Errore import inventario:', error);
    res.status(500).json({ error: 'Errore import inventario' });
  }
});

export default router;
