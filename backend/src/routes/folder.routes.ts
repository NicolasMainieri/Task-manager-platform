import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/folders - Ottieni tutte le cartelle dell'utente
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Cartelle possedute dall'utente o condivise con lui
    const [ownedFolders, sharedFolders] = await Promise.all([
      prisma.folder.findMany({
        where: {
          ownerId: userId,
          companyId
        },
        include: {
          owner: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              avatar: true
            }
          },
          sharedWith: {
            include: {
              user: {
                select: {
                  id: true,
                  nome: true,
                  cognome: true,
                  avatar: true
                }
              }
            }
          },
          documents: true,
          subFolders: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.folderShare.findMany({
        where: {
          userId,
          folder: {
            companyId
          }
        },
        include: {
          folder: {
            include: {
              owner: {
                select: {
                  id: true,
                  nome: true,
                  cognome: true,
                  avatar: true
                }
              },
              sharedWith: {
                include: {
                  user: {
                    select: {
                      id: true,
                      nome: true,
                      cognome: true,
                      avatar: true
                    }
                  }
                }
              },
              documents: true,
              subFolders: true
            }
          }
        }
      })
    ]);

    // Combina le cartelle possedute e condivise
    const allFolders = [
      ...ownedFolders.map(f => ({ ...f, isOwner: true })),
      ...sharedFolders.map(sf => ({ ...sf.folder, isOwner: false, permissions: sf }))
    ];

    res.json(allFolders);
  } catch (error) {
    console.error('Errore nel recupero cartelle:', error);
    res.status(500).json({ error: 'Errore nel recupero cartelle' });
  }
});

// GET /api/folders/:id - Ottieni una cartella specifica
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true
          }
        },
        sharedWith: {
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                avatar: true
              }
            }
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        subFolders: true,
        parentFolder: true
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Cartella non trovata' });
    }

    // Verifica permessi
    const isOwner = folder.ownerId === userId;
    const sharePermissions = folder.sharedWith.find(s => s.userId === userId);

    res.json({
      ...folder,
      isOwner,
      permissions: sharePermissions || null
    });
  } catch (error) {
    console.error('Errore nel recupero cartella:', error);
    res.status(500).json({ error: 'Errore nel recupero cartella' });
  }
});

// POST /api/folders - Crea una nuova cartella
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, descrizione, colore, parentFolderId } = req.body;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!nome) {
      return res.status(400).json({ error: 'Nome cartella obbligatorio' });
    }

    const folder = await prisma.folder.create({
      data: {
        nome,
        descrizione,
        colore: colore || '#3B82F6',
        parentFolderId: parentFolderId || null,
        ownerId: userId,
        companyId
      },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true
          }
        }
      }
    });

    res.json(folder);
  } catch (error) {
    console.error('Errore nella creazione cartella:', error);
    res.status(500).json({ error: 'Errore nella creazione cartella' });
  }
});

// PUT /api/folders/:id - Aggiorna una cartella
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, colore } = req.body;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verifica che l'utente sia il proprietario o abbia permesso di edit
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, canEdit: true } } }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Cartella non trovata o permessi insufficienti' });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        nome: nome || folder.nome,
        descrizione: descrizione !== undefined ? descrizione : folder.descrizione,
        colore: colore || folder.colore
      },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true
          }
        },
        sharedWith: {
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    res.json(updatedFolder);
  } catch (error) {
    console.error('Errore nell\'aggiornamento cartella:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento cartella' });
  }
});

// DELETE /api/folders/:id - Elimina una cartella
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verifica che l'utente sia il proprietario o abbia permesso di delete
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, canDelete: true } } }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Cartella non trovata o permessi insufficienti' });
    }

    await prisma.folder.delete({
      where: { id }
    });

    res.json({ message: 'Cartella eliminata' });
  } catch (error) {
    console.error('Errore nell\'eliminazione cartella:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione cartella' });
  }
});

// POST /api/folders/:id/share - Condividi cartella con utenti
router.post('/:id/share', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userIds, permissions } = req.body; // userIds: string[], permissions: { canView, canEdit, canDelete, canShare }
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array obbligatorio' });
    }

    // Verifica che l'utente sia il proprietario o abbia permesso di share
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, canShare: true } } }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Cartella non trovata o permessi insufficienti' });
    }

    // Verifica che tutti gli utenti esistano e siano della stessa company
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        companyId
      }
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({ error: 'Uno o più utenti non trovati o non nella stessa azienda' });
    }

    // Crea le condivisioni
    const shares = await Promise.all(
      userIds.map(targetUserId =>
        prisma.folderShare.upsert({
          where: {
            folderId_userId: {
              folderId: id,
              userId: targetUserId
            }
          },
          create: {
            folderId: id,
            userId: targetUserId,
            canView: permissions?.canView !== undefined ? permissions.canView : true,
            canEdit: permissions?.canEdit !== undefined ? permissions.canEdit : false,
            canDelete: permissions?.canDelete !== undefined ? permissions.canDelete : false,
            canShare: permissions?.canShare !== undefined ? permissions.canShare : false
          },
          update: {
            canView: permissions?.canView !== undefined ? permissions.canView : true,
            canEdit: permissions?.canEdit !== undefined ? permissions.canEdit : false,
            canDelete: permissions?.canDelete !== undefined ? permissions.canDelete : false,
            canShare: permissions?.canShare !== undefined ? permissions.canShare : false
          },
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                avatar: true
              }
            }
          }
        })
      )
    );

    res.json(shares);
  } catch (error) {
    console.error('Errore nella condivisione cartella:', error);
    res.status(500).json({ error: 'Errore nella condivisione cartella' });
  }
});

// DELETE /api/folders/:id/share/:userId - Rimuovi condivisione
router.delete('/:id/share/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verifica che l'utente sia il proprietario o abbia permesso di share
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        companyId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, canShare: true } } }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Cartella non trovata o permessi insufficienti' });
    }

    await prisma.folderShare.delete({
      where: {
        folderId_userId: {
          folderId: id,
          userId: targetUserId
        }
      }
    });

    res.json({ message: 'Condivisione rimossa' });
  } catch (error) {
    console.error('Errore nella rimozione condivisione:', error);
    res.status(500).json({ error: 'Errore nella rimozione condivisione' });
  }
});

// PUT /api/folders/:id/move-document/:documentId - Sposta documento in cartella
router.put('/:id/move-document/:documentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id: folderId, documentId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verifica permessi sulla cartella
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        companyId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, canEdit: true } } }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Cartella non trovata o permessi insufficienti' });
    }

    // Verifica che il documento esista
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        companyId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // Sposta il documento nella cartella
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { folderId }
    });

    res.json(updatedDocument);
  } catch (error) {
    console.error('Errore nello spostamento documento:', error);
    res.status(500).json({ error: 'Errore nello spostamento documento' });
  }
});

export default router;
