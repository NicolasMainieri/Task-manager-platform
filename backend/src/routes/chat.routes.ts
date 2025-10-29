import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/chat/messages - Ottieni tutti i messaggi della company
router.get('/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 100, before } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        companyId: user.companyId,
        eliminato: false,
        ...(before && { createdAt: { lt: new Date(before as string) } })
      },
      include: {
        autore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
            role: {
              select: {
                nome: true,
                colore: true
              }
            }
          }
        },
        replyTo: {
          select: {
            id: true,
            messaggio: true,
            autore: {
              select: {
                nome: true,
                cognome: true
              }
            }
          }
        },
        readBy: {
          select: {
            userId: true,
            readAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Errore nel recupero dei messaggi:', error);
    res.status(500).json({ error: 'Errore nel recupero dei messaggi' });
  }
});

// POST /api/chat/messages - Invia nuovo messaggio
router.post('/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { messaggio, replyToId } = req.body;

    if (!messaggio || messaggio.trim() === '') {
      return res.status(400).json({ error: 'Messaggio vuoto' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Estrai menzioni dal messaggio (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(messaggio)) !== null) {
      const username = match[1];
      // Cerca utente per nome/cognome nella stessa company
      const mentionedUsers = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { nome: { contains: username } },
            { cognome: { contains: username } },
            { email: { contains: username } }
          ]
        },
        select: { id: true }
      });

      mentionedUsers.forEach(u => {
        if (!mentions.includes(u.id)) {
          mentions.push(u.id);
        }
      });
    }

    // Crea il messaggio
    const message = await prisma.chatMessage.create({
      data: {
        messaggio: messaggio.trim(),
        menzioni: JSON.stringify(mentions),
        autoreId: req.user.id,
        companyId: user.companyId,
        ...(replyToId && { replyToId })
      },
      include: {
        autore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
            role: {
              select: {
                nome: true,
                colore: true
              }
            }
          }
        },
        replyTo: {
          select: {
            id: true,
            messaggio: true,
            autore: {
              select: {
                nome: true,
                cognome: true
              }
            }
          }
        }
      }
    });

    // Crea notifiche per le menzioni
    if (mentions.length > 0) {
      const notificationsData = mentions
        .filter(userId => userId !== req.user.id) // Non notificare se stesso
        .map(userId => ({
          userId,
          tipo: 'chat_mention',
          titolo: 'Menzione in chat',
          messaggio: `${req.user.nome} ${req.user.cognome} ti ha menzionato in chat`,
          link: '/chat'
        }));

      if (notificationsData.length > 0) {
        await prisma.notification.createMany({
          data: notificationsData
        });
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Errore nell\'invio del messaggio:', error);
    res.status(500).json({ error: 'Errore nell\'invio del messaggio' });
  }
});

// PUT /api/chat/messages/:id - Modifica messaggio
router.put('/messages/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { messaggio } = req.body;

    if (!messaggio || messaggio.trim() === '') {
      return res.status(400).json({ error: 'Messaggio vuoto' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che l'utente sia l'autore
    const existingMessage = await prisma.chatMessage.findFirst({
      where: {
        id,
        autoreId: req.user.id,
        companyId: user.companyId
      }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Messaggio non trovato o non sei l\'autore' });
    }

    // Aggiorna menzioni
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(messaggio)) !== null) {
      const username = match[1];
      const mentionedUsers = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { nome: { contains: username } },
            { cognome: { contains: username } }
          ]
        },
        select: { id: true }
      });

      mentionedUsers.forEach(u => {
        if (!mentions.includes(u.id)) {
          mentions.push(u.id);
        }
      });
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id },
      data: {
        messaggio: messaggio.trim(),
        menzioni: JSON.stringify(mentions),
        modificato: true
      },
      include: {
        autore: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
            role: {
              select: {
                nome: true,
                colore: true
              }
            }
          }
        }
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Errore nella modifica del messaggio:', error);
    res.status(500).json({ error: 'Errore nella modifica del messaggio' });
  }
});

// DELETE /api/chat/messages/:id - Elimina messaggio
router.delete('/messages/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che l'utente sia l'autore
    const existingMessage = await prisma.chatMessage.findFirst({
      where: {
        id,
        autoreId: req.user.id,
        companyId: user.companyId
      }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Messaggio non trovato o non sei l\'autore' });
    }

    // Soft delete
    await prisma.chatMessage.update({
      where: { id },
      data: { eliminato: true }
    });

    res.json({ message: 'Messaggio eliminato' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del messaggio:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del messaggio' });
  }
});

// POST /api/chat/messages/:id/reaction - Aggiungi/Rimuovi reaction
router.post('/messages/:id/reaction', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji mancante' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const message = await prisma.chatMessage.findFirst({
      where: {
        id,
        companyId: user.companyId,
        eliminato: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato' });
    }

    // Parse reactions
    const reactions = JSON.parse(message.reactions || '{}');

    // Toggle reaction
    if (!reactions[emoji]) {
      reactions[emoji] = [req.user.id];
    } else {
      const index = reactions[emoji].indexOf(req.user.id);
      if (index > -1) {
        reactions[emoji].splice(index, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji].push(req.user.id);
      }
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id },
      data: { reactions: JSON.stringify(reactions) }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Errore nell\'aggiunta della reaction:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta della reaction' });
  }
});

// POST /api/chat/messages/:id/read - Marca messaggio come letto
router.post('/messages/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che il messaggio esista nella stessa company
    const message = await prisma.chatMessage.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato' });
    }

    // Non auto-marcare i propri messaggi
    if (message.autoreId === req.user.id) {
      return res.json({ message: 'Non puoi marcare come letto il tuo messaggio' });
    }

    // Crea o aggiorna read status
    await prisma.chatMessageRead.upsert({
      where: {
        messageId_userId: {
          messageId: id,
          userId: req.user.id
        }
      },
      create: {
        messageId: id,
        userId: req.user.id
      },
      update: {
        readAt: new Date()
      }
    });

    res.json({ message: 'Messaggio marcato come letto' });
  } catch (error) {
    console.error('Errore nel marcare messaggio come letto:', error);
    res.status(500).json({ error: 'Errore nel marcare messaggio come letto' });
  }
});

// GET /api/chat/users - Ottieni lista utenti per autocomplete mentions
router.get('/users', authenticate, async (req: AuthRequest, res) => {
  try {
    const { search } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const users = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        status: 'approved',
        ...(search && {
          OR: [
            { nome: { contains: search as string } },
            { cognome: { contains: search as string } },
            { email: { contains: search as string } }
          ]
        })
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        avatar: true,
        role: {
          select: {
            nome: true,
            colore: true
          }
        }
      },
      take: 20
    });

    res.json(users);
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});

// GET /api/chat/unread-count - Conta messaggi non letti
router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Conta messaggi non letti (escluso i propri)
    const count = await prisma.chatMessage.count({
      where: {
        companyId: user.companyId,
        eliminato: false,
        autoreId: { not: req.user.id },
        readBy: {
          none: {
            userId: req.user.id
          }
        }
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Errore nel conteggio messaggi non letti:', error);
    res.status(500).json({ error: 'Errore nel conteggio messaggi non letti' });
  }
});

export default router;
