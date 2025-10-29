import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Middleware per verificare che l'utente sia admin
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user || user.role.nome.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato. Solo gli admin possono eseguire questa azione.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Errore nella verifica dei permessi' });
  }
};

// GET /api/projects - Lista tutti i progetti/cartelle (tree structure)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    // Recupera tutti i progetti/cartelle dell'azienda
    const progetti = await prisma.progetto.findMany({
      where: {
        companyId: user.companyId,
        // Se non è admin, mostra solo quelli di cui è owner o membro
        ...(isAdmin ? {} : {
          OR: [
            { ownerId: user.id },
            { memberIds: { contains: user.id } }
          ]
        })
      },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
            email: true
          }
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
            documents: true,
            subProjects: true
          }
        }
      },
      orderBy: [
        { isFolder: 'desc' }, // Cartelle prima
        { createdAt: 'desc' }
      ]
    });

    // Parsa memberIds da JSON a array
    const progettiWithMembers = progetti.map(p => {
      let memberIds: string[] = [];
      try {
        memberIds = JSON.parse(p.memberIds);
      } catch {}

      return {
        ...p,
        memberIds
      };
    });

    res.json(progettiWithMembers);
  } catch (error) {
    console.error('Errore nel recupero dei progetti:', error);
    res.status(500).json({ error: 'Errore nel recupero dei progetti' });
  }
});

// GET /api/projects/:id - Dettaglio progetto
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    const progetto = await prisma.progetto.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            avatar: true,
            email: true
          }
        },
        parent: {
          select: {
            id: true,
            nome: true,
            isFolder: true
          }
        },
        subProjects: {
          include: {
            owner: {
              select: {
                id: true,
                nome: true,
                cognome: true
              }
            },
            _count: {
              select: {
                tasks: true,
                subProjects: true
              }
            }
          }
        },
        tasks: {
          include: {
            assignees: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                avatar: true
              }
            },
            subtasks: true
          }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        },
        events: {
          include: {
            organizer: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                avatar: true
              }
            },
            partecipanti: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                avatar: true
              }
            }
          },
          orderBy: { dataInizio: 'desc' }
        },
        emails: {
          orderBy: { dataInvio: 'desc' }
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
            documents: true,
            events: true,
            emails: true
          }
        }
      }
    });

    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Verifica permessi
    let memberIds: string[] = [];
    try {
      memberIds = JSON.parse(progetto.memberIds);
    } catch {}

    const hasAccess = isAdmin || progetto.ownerId === user.id || memberIds.includes(user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Non hai i permessi per accedere a questo progetto' });
    }

    // Recupera i membri
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds }
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        avatar: true,
        email: true
      }
    });

    res.json({
      ...progetto,
      memberIds,
      members
    });
  } catch (error) {
    console.error('Errore nel recupero del progetto:', error);
    res.status(500).json({ error: 'Errore nel recupero del progetto' });
  }
});

// POST /api/projects - Crea nuovo progetto/cartella
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      nome,
      descrizione,
      colore,
      isFolder,
      parentId,
      memberIds,
      rewardPoints,
      dataInizio,
      scadenza
    } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Il nome è obbligatorio' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    // 🆕 Solo admin può impostare punti diversi da 50
    let finalRewardPoints = 50; // Default per tutti
    if (isAdmin && rewardPoints !== undefined) {
      finalRewardPoints = parseInt(rewardPoints);
    }

    // Verifica che il parent esista (se specificato)
    if (parentId) {
      const parent = await prisma.progetto.findFirst({
        where: {
          id: parentId,
          companyId: user.companyId,
          isFolder: true // Il parent deve essere una cartella
        }
      });

      if (!parent) {
        return res.status(400).json({ error: 'Cartella parent non valida' });
      }
    }

    // Valida memberIds
    let validatedMemberIds: string[] = [];
    if (memberIds && Array.isArray(memberIds)) {
      const members = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          companyId: user.companyId
        }
      });
      validatedMemberIds = members.map(m => m.id);
    }

    const progetto = await prisma.progetto.create({
      data: {
        nome,
        descrizione,
        colore: colore || '#3B82F6',
        isFolder: isFolder || false,
        parentId: parentId || undefined,
        memberIds: JSON.stringify(validatedMemberIds),
        rewardPoints: finalRewardPoints,
        dataInizio: dataInizio ? new Date(dataInizio) : undefined,
        scadenza: scadenza ? new Date(scadenza) : undefined,
        ownerId: user.id,
        companyId: user.companyId
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

    // Crea notifiche per i membri assegnati (escluso il creatore)
    if (validatedMemberIds.length > 0 && !isFolder) {
      const notificationPromises = validatedMemberIds
        .filter(memberId => memberId !== user.id)
        .map(memberId =>
          prisma.notification.create({
            data: {
              userId: memberId,
              tipo: 'progetto_assegnato',
              titolo: 'Nuovo progetto assegnato',
              messaggio: `Sei stato aggiunto al progetto "${nome}" da ${user.nome} ${user.cognome}`,
              link: `/progetti/${progetto.id}`
            }
          })
        );

      await Promise.all(notificationPromises);
    }

    res.status(201).json({
      ...progetto,
      memberIds: validatedMemberIds
    });
  } catch (error) {
    console.error('Errore nella creazione del progetto:', error);
    res.status(500).json({ error: 'Errore nella creazione del progetto' });
  }
});

// PUT /api/projects/:id - Aggiorna progetto
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descrizione,
      colore,
      stato,
      memberIds,
      rewardPoints,
      dataInizio,
      scadenza,
      parentId
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    const progetto = await prisma.progetto.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Verifica permessi (solo owner o admin)
    if (!isAdmin && progetto.ownerId !== user.id) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo progetto' });
    }

    // Valida memberIds
    let validatedMemberIds: string[] | undefined;
    let oldMemberIds: string[] = [];
    let newMembers: string[] = [];

    if (memberIds && Array.isArray(memberIds)) {
      const members = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          companyId: user.companyId
        }
      });
      validatedMemberIds = members.map(m => m.id);

      // Trova i nuovi membri aggiunti
      try {
        oldMemberIds = JSON.parse(progetto.memberIds);
      } catch {}

      newMembers = validatedMemberIds.filter(id => !oldMemberIds.includes(id));
    }

    const updateData: any = {};
    if (nome) updateData.nome = nome;
    if (descrizione !== undefined) updateData.descrizione = descrizione;
    if (colore) updateData.colore = colore;
    if (stato) updateData.stato = stato;
    if (validatedMemberIds) updateData.memberIds = JSON.stringify(validatedMemberIds);
    // 🆕 Solo admin può modificare i punti
    if (rewardPoints !== undefined && isAdmin) {
      updateData.rewardPoints = parseInt(rewardPoints);
    }
    if (dataInizio !== undefined) updateData.dataInizio = dataInizio ? new Date(dataInizio) : null;
    if (scadenza !== undefined) updateData.scadenza = scadenza ? new Date(scadenza) : null;
    if (parentId !== undefined) updateData.parentId = parentId || null;

    const updatedProgetto = await prisma.progetto.update({
      where: { id },
      data: updateData,
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

    // Notifica i nuovi membri aggiunti
    if (newMembers.length > 0 && !progetto.isFolder) {
      const notificationPromises = newMembers
        .filter(memberId => memberId !== user.id)
        .map(memberId =>
          prisma.notification.create({
            data: {
              userId: memberId,
              tipo: 'progetto_assegnato',
              titolo: 'Aggiunto a progetto',
              messaggio: `Sei stato aggiunto al progetto "${updatedProgetto.nome}" da ${user.nome} ${user.cognome}`,
              link: `/progetti/${id}`
            }
          })
        );

      await Promise.all(notificationPromises);
    }

    res.json({
      ...updatedProgetto,
      memberIds: validatedMemberIds || JSON.parse(updatedProgetto.memberIds)
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del progetto:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del progetto' });
  }
});

// DELETE /api/projects/:id - Elimina progetto/cartella
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    const progetto = await prisma.progetto.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Verifica permessi (solo owner o admin)
    if (!isAdmin && progetto.ownerId !== user.id) {
      return res.status(403).json({ error: 'Non hai i permessi per eliminare questo progetto' });
    }

    await prisma.progetto.delete({
      where: { id }
    });

    res.json({ message: 'Progetto eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del progetto:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del progetto' });
  }
});

// POST /api/projects/:id/complete - Completa progetto e distribuisci rewards
router.post('/:id/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    const progetto = await prisma.progetto.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Solo admin o owner possono completare il progetto
    if (!isAdmin && progetto.ownerId !== user.id) {
      return res.status(403).json({ error: 'Non hai i permessi per completare questo progetto' });
    }

    if (progetto.isFolder) {
      return res.status(400).json({ error: 'Non puoi completare una cartella' });
    }

    if (progetto.stato === 'completed') {
      return res.status(400).json({ error: 'Progetto già completato' });
    }

    if (progetto.rewardDistributed) {
      return res.status(400).json({ error: 'Premi già distribuiti per questo progetto' });
    }

    // Recupera i membri del team
    let memberIds: string[] = [];
    try {
      memberIds = JSON.parse(progetto.memberIds);
    } catch {}

    // Aggiungi l'owner se non è già nei membri
    if (!memberIds.includes(progetto.ownerId)) {
      memberIds.push(progetto.ownerId);
    }

    // Distribuisci i punti in modo equo
    const pointsPerMember = Math.floor(progetto.rewardPoints / memberIds.length);
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Crea gli score per ogni membro
    const scorePromises = memberIds.map(memberId =>
      prisma.score.create({
        data: {
          userId: memberId,
          taskId: id, // Uso l'ID del progetto come riferimento
          puntiBase: pointsPerMember,
          punti: pointsPerMember,
          puntiTotali: pointsPerMember,
          periodo: currentPeriod,
          breakdown: JSON.stringify({
            tipo: 'progetto_completato',
            progettoId: id,
            progettoNome: progetto.nome,
            totalReward: progetto.rewardPoints,
            teamMembers: memberIds.length
          })
        }
      })
    );

    await Promise.all(scorePromises);

    // Aggiorna il progetto
    const updatedProgetto = await prisma.progetto.update({
      where: { id },
      data: {
        stato: 'completed',
        progresso: 100,
        rewardDistributed: true,
        dataCompletamento: new Date()
      }
    });

    // Crea notifiche per tutti i membri
    const notificationPromises = memberIds.map(memberId =>
      prisma.notification.create({
        data: {
          userId: memberId,
          tipo: 'progetto_completato',
          titolo: 'Progetto completato!',
          messaggio: `Il progetto "${progetto.nome}" è stato completato! Hai guadagnato ${pointsPerMember} punti.`,
          link: `/progetti/${id}`
        }
      })
    );

    await Promise.all(notificationPromises);

    res.json({
      ...updatedProgetto,
      pointsDistributed: progetto.rewardPoints,
      pointsPerMember,
      membersRewarded: memberIds.length
    });
  } catch (error) {
    console.error('Errore nel completamento del progetto:', error);
    res.status(500).json({ error: 'Errore nel completamento del progetto' });
  }
});

// GET /api/projects/:id/stats - Statistiche progetto
router.get('/:id/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true, id: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const progetto = await prisma.progetto.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        tasks: {
          include: {
            subtasks: true
          }
        }
      }
    });

    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Calcola statistiche
    const totalTasks = progetto.tasks.length;
    const completedTasks = progetto.tasks.filter(t => t.stato === 'done').length;
    const totalSubtasks = progetto.tasks.reduce((sum, t) => sum + t.subtasks.length, 0);
    const completedSubtasks = progetto.tasks.reduce(
      (sum, t) => sum + t.subtasks.filter(st => st.completata).length,
      0
    );

    const tasksProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const subtasksProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    res.json({
      progettoId: id,
      totalTasks,
      completedTasks,
      totalSubtasks,
      completedSubtasks,
      tasksProgress,
      subtasksProgress,
      overallProgress: Math.round((tasksProgress + subtasksProgress) / 2)
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

// POST /api/projects/:id/toggle-active - Attiva/disattiva progetto
router.post('/:id/toggle-active', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const isAdmin = user.role.nome.toLowerCase() === 'admin';

    const progetto = await prisma.progetto.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    });

    if (!progetto) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Solo admin o owner possono attivare/disattivare il progetto
    if (!isAdmin && progetto.ownerId !== user.id) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo progetto' });
    }

    if (progetto.isFolder) {
      return res.status(400).json({ error: 'Non puoi attivare/disattivare una cartella' });
    }

    const updatedProgetto = await prisma.progetto.update({
      where: { id },
      data: { isActive: isActive ?? !progetto.isActive },
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

    // Se il progetto viene attivato, invia notifica ai membri
    if (updatedProgetto.isActive && !progetto.isActive) {
      let memberIds: string[] = [];
      try {
        memberIds = JSON.parse(progetto.memberIds);
      } catch {}

      if (memberIds.length > 0) {
        const notificationPromises = memberIds.map(memberId =>
          prisma.notification.create({
            data: {
              userId: memberId,
              tipo: 'progetto_attivato',
              titolo: 'Progetto attivato!',
              messaggio: `Il progetto "${progetto.nome}" è stato attivato. Ora puoi lavorare sulle sue task.`,
              link: `/progetti/${id}`
            }
          })
        );

        await Promise.all(notificationPromises);
      }
    }

    res.json({
      ...updatedProgetto,
      memberIds: JSON.parse(updatedProgetto.memberIds),
      message: updatedProgetto.isActive ? 'Progetto attivato con successo' : 'Progetto disattivato con successo'
    });
  } catch (error) {
    console.error('Errore nel toggle del progetto:', error);
    res.status(500).json({ error: 'Errore nel toggle del progetto' });
  }
});

export default router;
