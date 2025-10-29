import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/direct-messages/conversations - Lista tutte le conversazioni dell'utente
router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Trova tutti gli utenti con cui ha scambiato messaggi
    const sentMessages = await prisma.directMessage.findMany({
      where: {
        senderId: userId,
        companyId: companyId!,
        eliminato: false
      },
      select: { receiverId: true },
      distinct: ['receiverId']
    });

    const receivedMessages = await prisma.directMessage.findMany({
      where: {
        receiverId: userId,
        companyId: companyId!,
        eliminato: false
      },
      select: { senderId: true },
      distinct: ['senderId']
    });

    // Combina i due array per avere tutti gli utenti
    const userIdsSet = new Set<string>();
    sentMessages.forEach(m => userIdsSet.add(m.receiverId));
    receivedMessages.forEach(m => userIdsSet.add(m.senderId));
    const userIds = Array.from(userIdsSet);

    // Per ogni utente, prendi l'ultimo messaggio e il conteggio non letti
    const conversations = await Promise.all(
      userIds.map(async (otherUserId) => {
        // Ultimo messaggio
        const lastMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId }
            ],
            companyId: companyId!,
            eliminato: false
          },
          orderBy: { createdAt: 'desc' }
        });

        // Messaggi non letti
        const unreadCount = await prisma.directMessage.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            companyId: companyId!,
            letto: false,
            eliminato: false
          }
        });

        // Dati utente
        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId },
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
          }
        });

        return {
          user: otherUser,
          lastMessage,
          unreadCount
        };
      })
    );

    // Ordina per data ultimo messaggio
    conversations.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt || new Date(0);
      const bDate = b.lastMessage?.createdAt || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });

    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/direct-messages/:userId - Ottieni tutti i messaggi con un utente specifico
router.get('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id;
    const otherUserId = req.params.userId;
    const companyId = req.user!.companyId;

    // Verifica che l'altro utente sia della stessa azienda
    const otherUser = await prisma.user.findFirst({
      where: {
        id: otherUserId,
        companyId: companyId!
      }
    });

    if (!otherUser) {
      return res.status(404).json({ error: 'Utente non trovato o non autorizzato' });
    }

    // Prendi tutti i messaggi tra i due utenti
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ],
        companyId: companyId!,
        eliminato: false
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Segna come letti tutti i messaggi ricevuti
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        letto: false,
        eliminato: false
      },
      data: {
        letto: true,
        lettoAt: new Date()
      }
    });

    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/direct-messages/:userId - Invia un messaggio a un utente
router.post('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const senderId = req.user!.id;
    const receiverId = req.params.userId;
    const companyId = req.user!.companyId;
    const { messaggio, allegati } = req.body;

    if (!messaggio || messaggio.trim() === '') {
      return res.status(400).json({ error: 'Il messaggio non può essere vuoto' });
    }

    // Verifica che il destinatario sia della stessa azienda
    const receiver = await prisma.user.findFirst({
      where: {
        id: receiverId,
        companyId: companyId!
      }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Destinatario non trovato o non autorizzato' });
    }

    // Crea il messaggio
    const message = await prisma.directMessage.create({
      data: {
        senderId,
        receiverId,
        companyId: companyId!,
        messaggio: messaggio.trim(),
        allegati: allegati ? JSON.stringify(allegati) : '[]'
      },
      include: {
        sender: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Crea notifica per il destinatario
    await prisma.notification.create({
      data: {
        userId: receiverId,
        tipo: 'direct_message',
        titolo: 'Nuovo messaggio diretto',
        messaggio: `${req.user!.nome} ${req.user!.cognome} ti ha inviato un messaggio`,
        link: `/direct-messages/${senderId}`
      }
    });

    res.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/direct-messages/:messageId - Modifica un messaggio
router.put('/:messageId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const messageId = req.params.messageId;
    const { messaggio } = req.body;

    if (!messaggio || messaggio.trim() === '') {
      return res.status(400).json({ error: 'Il messaggio non può essere vuoto' });
    }

    // Verifica che il messaggio appartenga all'utente
    const message = await prisma.directMessage.findFirst({
      where: {
        id: messageId,
        senderId: userId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato o non autorizzato' });
    }

    // Modifica il messaggio
    const updatedMessage = await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        messaggio: messaggio.trim(),
        modificato: true
      },
      include: {
        sender: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    res.json(updatedMessage);
  } catch (error: any) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/direct-messages/:messageId - Elimina un messaggio
router.delete('/:messageId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const messageId = req.params.messageId;

    // Verifica che il messaggio appartenga all'utente
    const message = await prisma.directMessage.findFirst({
      where: {
        id: messageId,
        senderId: userId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato o non autorizzato' });
    }

    // Soft delete
    await prisma.directMessage.update({
      where: { id: messageId },
      data: { eliminato: true }
    });

    res.json({ success: true, message: 'Messaggio eliminato' });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/direct-messages/company/users - Lista tutti gli utenti della company per iniziare nuove chat
router.get('/company/users', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const users = await prisma.user.findMany({
      where: {
        companyId: companyId!,
        id: { not: userId }, // Escludi se stesso
        status: 'approved'
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
      orderBy: [
        { nome: 'asc' },
        { cognome: 'asc' }
      ]
    });

    res.json(users);
  } catch (error: any) {
    console.error('Error fetching company users:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
