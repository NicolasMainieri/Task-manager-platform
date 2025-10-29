import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/contacts - Lista tutti i contatti dell'azienda
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { search, tag } = req.query;

    let where: any = {
      companyId: companyId!
    };

    // Ricerca per nome, cognome, email o azienda
    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: 'insensitive' } },
        { cognome: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { emailAziendale: { contains: search as string, mode: 'insensitive' } },
        { azienda: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: [
        { nome: 'asc' },
        { cognome: 'asc' }
      ]
    });

    // Filtra per tag se specificato
    let filteredContacts = contacts;
    if (tag) {
      filteredContacts = contacts.filter(contact => {
        const tags = JSON.parse(contact.tags || '[]');
        return tags.includes(tag);
      });
    }

    res.json({ contacts: filteredContacts });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:id - Ottieni un contatto specifico
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        companyId: companyId!
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contatto non trovato' });
    }

    res.json(contact);
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/contacts - Crea un nuovo contatto
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const {
      nome,
      cognome,
      email,
      emailAziendale,
      telefono,
      telefonoCellulare,
      azienda,
      ruolo,
      indirizzo,
      citta,
      cap,
      paese,
      sito,
      linkedin,
      note,
      tags,
      avatar
    } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Il nome è obbligatorio' });
    }

    const contact = await prisma.contact.create({
      data: {
        nome: nome.trim(),
        cognome: cognome?.trim(),
        email: email?.trim(),
        emailAziendale: emailAziendale?.trim(),
        telefono: telefono?.trim(),
        telefonoCellulare: telefonoCellulare?.trim(),
        azienda: azienda?.trim(),
        ruolo: ruolo?.trim(),
        indirizzo: indirizzo?.trim(),
        citta: citta?.trim(),
        cap: cap?.trim(),
        paese: paese?.trim(),
        sito: sito?.trim(),
        linkedin: linkedin?.trim(),
        note: note?.trim(),
        tags: tags ? JSON.stringify(tags) : '[]',
        avatar,
        createdById: userId,
        companyId: companyId!
      }
    });

    res.json(contact);
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/contacts/:id - Aggiorna un contatto
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Verifica che il contatto appartenga all'azienda
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        companyId: companyId!
      }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contatto non trovato' });
    }

    const {
      nome,
      cognome,
      email,
      emailAziendale,
      telefono,
      telefonoCellulare,
      azienda,
      ruolo,
      indirizzo,
      citta,
      cap,
      paese,
      sito,
      linkedin,
      note,
      tags,
      avatar
    } = req.body;

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(nome && { nome: nome.trim() }),
        ...(cognome !== undefined && { cognome: cognome?.trim() }),
        ...(email !== undefined && { email: email?.trim() }),
        ...(emailAziendale !== undefined && { emailAziendale: emailAziendale?.trim() }),
        ...(telefono !== undefined && { telefono: telefono?.trim() }),
        ...(telefonoCellulare !== undefined && { telefonoCellulare: telefonoCellulare?.trim() }),
        ...(azienda !== undefined && { azienda: azienda?.trim() }),
        ...(ruolo !== undefined && { ruolo: ruolo?.trim() }),
        ...(indirizzo !== undefined && { indirizzo: indirizzo?.trim() }),
        ...(citta !== undefined && { citta: citta?.trim() }),
        ...(cap !== undefined && { cap: cap?.trim() }),
        ...(paese !== undefined && { paese: paese?.trim() }),
        ...(sito !== undefined && { sito: sito?.trim() }),
        ...(linkedin !== undefined && { linkedin: linkedin?.trim() }),
        ...(note !== undefined && { note: note?.trim() }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(avatar !== undefined && { avatar })
      }
    });

    res.json(contact);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/contacts/:id - Elimina un contatto
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Verifica che il contatto appartenga all'azienda
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        companyId: companyId!
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contatto non trovato' });
    }

    await prisma.contact.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Contatto eliminato' });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/tags/all - Ottieni tutti i tag utilizzati
router.get('/tags/all', authenticate, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;

    const contacts = await prisma.contact.findMany({
      where: { companyId: companyId! },
      select: { tags: true }
    });

    const allTags = new Set<string>();
    contacts.forEach(contact => {
      const tags = JSON.parse(contact.tags || '[]');
      tags.forEach((tag: string) => allTags.add(tag));
    });

    res.json(Array.from(allTags).sort());
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
