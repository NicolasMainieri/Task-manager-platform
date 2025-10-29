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
      return res.status(403).json({ error: 'Accesso negato. Solo gli admin possono gestire i premi.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Errore nella verifica dei permessi' });
  }
};

// GET /api/rewards - Lista premi (tutti gli utenti possono vedere i premi disponibili)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const rewards = await prisma.reward.findMany({
      where: {
        companyId: user.companyId,
        disponibile: true
      },
      include: {
        redemptions: {
          where: { userId: req.user.id },
          select: {
            id: true,
            stato: true,
            createdAt: true
          }
        },
        _count: {
          select: { redemptions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcola quantità rimanente per ogni premio
    const rewardsWithAvailability = rewards.map(reward => ({
      ...reward,
      quantitaRimanente: reward.quantita === -1 ? -1 : reward.quantita - reward._count.redemptions,
      userHasRedeemed: reward.redemptions.length > 0
    }));

    res.json(rewardsWithAvailability);
  } catch (error) {
    console.error('Errore nel recupero dei premi:', error);
    res.status(500).json({ error: 'Errore nel recupero dei premi' });
  }
});

// GET /api/rewards/admin - Lista premi per admin (include premi disabilitati)
router.get('/admin', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const rewards = await prisma.reward.findMany({
      where: { companyId: user.companyId },
      include: {
        _count: {
          select: {
            redemptions: true
          }
        },
        redemptions: {
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const rewardsWithStats = rewards.map(reward => ({
      ...reward,
      quantitaRimanente: reward.quantita === -1 ? -1 : reward.quantita - reward._count.redemptions,
      totalRedemptions: reward._count.redemptions
    }));

    res.json(rewardsWithStats);
  } catch (error) {
    console.error('Errore nel recupero dei premi (admin):', error);
    res.status(500).json({ error: 'Errore nel recupero dei premi' });
  }
});

// POST /api/rewards - Crea nuovo premio (solo admin)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { nome, descrizione, immagine, costoScore, costoMensile, quantita } = req.body;

    if (!nome || costoScore === undefined || costoMensile === undefined) {
      return res.status(400).json({ error: 'Nome, costoScore e costoMensile sono obbligatori' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const reward = await prisma.reward.create({
      data: {
        nome,
        descrizione,
        immagine,
        costoScore: parseInt(costoScore),
        costoMensile: parseInt(costoMensile),
        quantita: quantita ? parseInt(quantita) : 1,
        companyId: user.companyId
      }
    });

    res.status(201).json(reward);
  } catch (error) {
    console.error('Errore nella creazione del premio:', error);
    res.status(500).json({ error: 'Errore nella creazione del premio' });
  }
});

// PUT /api/rewards/:id - Aggiorna premio (solo admin)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, immagine, costoScore, costoMensile, quantita, disponibile } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che il premio appartenga all'azienda
    const existingReward = await prisma.reward.findFirst({
      where: { id, companyId: user.companyId }
    });

    if (!existingReward) {
      return res.status(404).json({ error: 'Premio non trovato' });
    }

    const reward = await prisma.reward.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(descrizione !== undefined && { descrizione }),
        ...(immagine !== undefined && { immagine }),
        ...(costoScore !== undefined && { costoScore: parseInt(costoScore) }),
        ...(costoMensile !== undefined && { costoMensile: parseInt(costoMensile) }),
        ...(quantita !== undefined && { quantita: parseInt(quantita) }),
        ...(disponibile !== undefined && { disponibile })
      }
    });

    res.json(reward);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del premio:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del premio' });
  }
});

// DELETE /api/rewards/:id - Elimina premio (solo admin)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che il premio appartenga all'azienda
    const existingReward = await prisma.reward.findFirst({
      where: { id, companyId: user.companyId }
    });

    if (!existingReward) {
      return res.status(404).json({ error: 'Premio non trovato' });
    }

    await prisma.reward.delete({ where: { id } });

    res.json({ message: 'Premio eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del premio:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del premio' });
  }
});

// POST /api/rewards/:id/redeem - Riscatta premio (dipendenti)
router.post('/:id/redeem', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    // Verifica che il premio esista ed è disponibile
    const reward = await prisma.reward.findFirst({
      where: {
        id,
        companyId: user.companyId,
        disponibile: true
      },
      include: {
        _count: {
          select: { redemptions: true }
        }
      }
    });

    if (!reward) {
      return res.status(404).json({ error: 'Premio non trovato o non disponibile' });
    }

    // Verifica quantità rimanente
    const quantitaRimanente = reward.quantita === -1 ? -1 : reward.quantita - reward._count.redemptions;
    if (quantitaRimanente === 0) {
      return res.status(400).json({ error: 'Premio esaurito' });
    }

    // Verifica che l'utente non abbia già riscattato questo premio (pending/approved)
    const existingRedemption = await prisma.rewardRedemption.findFirst({
      where: {
        rewardId: id,
        userId: req.user.id,
        stato: { in: ['pending', 'approved'] }
      }
    });

    if (existingRedemption) {
      return res.status(400).json({ error: 'Hai già richiesto questo premio' });
    }

    // Calcola i punteggi dell'utente
    const currentMonth = new Promise((resolve) => {
      const now = new Date();
      resolve(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    });

    const [totalScore, monthlyScore, monthPeriod] = await Promise.all([
      prisma.score.aggregate({
        where: { userId: req.user.id },
        _sum: { puntiTotali: true }
      }),
      currentMonth.then(period =>
        prisma.score.aggregate({
          where: {
            userId: req.user.id,
            periodo: period as string
          },
          _sum: { puntiTotali: true }
        })
      ),
      currentMonth
    ]);

    const userTotalScore = totalScore._sum.puntiTotali || 0;
    const userMonthlyScore = monthlyScore._sum.puntiTotali || 0;

    // Verifica se l'utente ha abbastanza punti
    if (userTotalScore < reward.costoScore) {
      return res.status(400).json({
        error: `Punteggio totale insufficiente. Hai ${userTotalScore} punti, ne servono ${reward.costoScore}.`
      });
    }

    if (userMonthlyScore < reward.costoMensile) {
      return res.status(400).json({
        error: `Punteggio mensile insufficiente. Hai ${userMonthlyScore} punti questo mese, ne servono ${reward.costoMensile}.`
      });
    }

    // Crea la richiesta di riscatto
    const redemption = await prisma.rewardRedemption.create({
      data: {
        rewardId: id,
        userId: req.user.id,
        companyId: user.companyId,
        stato: 'pending'
      },
      include: {
        reward: true
      }
    });

    // Crea notifica per l'admin
    const adminUser = await prisma.user.findFirst({
      where: {
        companyId: user.companyId,
        role: { nome: 'Admin' }
      }
    });

    if (adminUser) {
      const userInfo = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { nome: true, cognome: true }
      });

      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          tipo: 'reward_redemption',
          titolo: 'Nuova richiesta premio',
          messaggio: `${userInfo?.nome} ${userInfo?.cognome} ha richiesto il premio "${reward.nome}"`,
          link: '/admin/premi'
        }
      });
    }

    res.status(201).json(redemption);
  } catch (error) {
    console.error('Errore nel riscatto del premio:', error);
    res.status(500).json({ error: 'Errore nel riscatto del premio' });
  }
});

// GET /api/rewards/redemptions/pending - Ottieni tutte le richieste pending (solo admin)
router.get('/redemptions/pending', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const redemptions = await prisma.rewardRedemption.findMany({
      where: {
        companyId: user.companyId,
        stato: 'pending'
      },
      include: {
        reward: {
          select: {
            id: true,
            nome: true,
            descrizione: true,
            immagine: true,
            costoScore: true,
            costoMensile: true
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(redemptions);
  } catch (error) {
    console.error('Errore nel recupero delle richieste pending:', error);
    res.status(500).json({ error: 'Errore nel recupero delle richieste pending' });
  }
});

// GET /api/rewards/redemptions/my - Ottieni i riscatti dell'utente corrente
router.get('/redemptions/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const redemptions = await prisma.rewardRedemption.findMany({
      where: { userId: req.user.id },
      include: {
        reward: {
          select: {
            id: true,
            nome: true,
            descrizione: true,
            immagine: true,
            costoScore: true,
            costoMensile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(redemptions);
  } catch (error) {
    console.error('Errore nel recupero dei riscatti:', error);
    res.status(500).json({ error: 'Errore nel recupero dei riscatti' });
  }
});

// PUT /api/rewards/redemptions/:id - Aggiorna stato riscatto (solo admin)
router.put('/redemptions/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { stato, adminNote } = req.body;

    if (!['approved', 'rejected', 'delivered'].includes(stato)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'Utente non associato a nessuna azienda' });
    }

    const redemption = await prisma.rewardRedemption.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        reward: true,
        user: {
          select: {
            id: true,
            nome: true,
            cognome: true
          }
        }
      }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Riscatto non trovato' });
    }

    const updatedRedemption = await prisma.rewardRedemption.update({
      where: { id },
      data: {
        stato,
        ...(adminNote && { adminNote })
      }
    });

    // Notifica l'utente
    const statusMessages: { [key: string]: string } = {
      approved: 'approvata',
      rejected: 'rifiutata',
      delivered: 'consegnato'
    };

    await prisma.notification.create({
      data: {
        userId: redemption.userId,
        tipo: 'reward_status',
        titolo: `Premio ${statusMessages[stato]}`,
        messaggio: `La tua richiesta per il premio "${redemption.reward.nome}" è stata ${statusMessages[stato]}.`,
        link: '/premi'
      }
    });

    res.json(updatedRedemption);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del riscatto:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del riscatto' });
  }
});

// GET /api/rewards/stats - Statistiche utente (punti disponibili)
router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [totalScore, monthlyScore] = await Promise.all([
      prisma.score.aggregate({
        where: { userId: req.user.id },
        _sum: { puntiTotali: true }
      }),
      prisma.score.aggregate({
        where: {
          userId: req.user.id,
          periodo: currentPeriod
        },
        _sum: { puntiTotali: true }
      })
    ]);

    res.json({
      totalScore: totalScore._sum.puntiTotali || 0,
      monthlyScore: monthlyScore._sum.puntiTotali || 0,
      currentPeriod
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

// GET /api/rewards/redemptions/approved - Ottieni i premi approvati dell'utente (da ritirare)
router.get('/redemptions/approved', authenticate, async (req: AuthRequest, res) => {
  try {
    const redemptions = await prisma.rewardRedemption.findMany({
      where: {
        userId: req.user.id,
        stato: { in: ['approved', 'awaiting_pickup'] }
      },
      include: {
        reward: {
          select: {
            id: true,
            nome: true,
            descrizione: true,
            immagine: true,
            costoScore: true,
            costoMensile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(redemptions);
  } catch (error) {
    console.error('Errore nel recupero dei premi approvati:', error);
    res.status(500).json({ error: 'Errore nel recupero dei premi approvati' });
  }
});

// POST /api/rewards/redemptions/:id/choose-pickup - Scelta metodo ritiro
router.post('/redemptions/:id/choose-pickup', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { metodoRitiro, indirizzoConsegna, cittaConsegna, capConsegna, telefonoConsegna, noteConsegna } = req.body;

    if (!['consegna_casa', 'ritiro_persona'].includes(metodoRitiro)) {
      return res.status(400).json({ error: 'Metodo di ritiro non valido' });
    }

    // Verifica che il riscatto appartenga all'utente e sia approvato
    const redemption = await prisma.rewardRedemption.findFirst({
      where: {
        id,
        userId: req.user.id,
        stato: 'approved'
      },
      include: {
        reward: true
      }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Riscatto non trovato o non approvato' });
    }

    // Se consegna a casa, verifica che ci siano tutti i dati
    if (metodoRitiro === 'consegna_casa') {
      if (!indirizzoConsegna || !cittaConsegna || !capConsegna || !telefonoConsegna) {
        return res.status(400).json({ error: 'Dati di consegna incompleti' });
      }
    }

    // Aggiorna il riscatto
    const updatedRedemption = await prisma.rewardRedemption.update({
      where: { id },
      data: {
        metodoRitiro,
        stato: 'awaiting_pickup',
        ...(metodoRitiro === 'consegna_casa' && {
          indirizzoConsegna,
          cittaConsegna,
          capConsegna,
          telefonoConsegna,
          noteConsegna
        })
      }
    });

    // Notifica admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { nome: true, cognome: true, companyId: true }
    });

    const adminUser = await prisma.user.findFirst({
      where: {
        companyId: user?.companyId,
        role: { nome: 'Admin' }
      }
    });

    if (adminUser) {
      const metodoText = metodoRitiro === 'consegna_casa' ? 'consegna a domicilio' : 'ritiro di persona';
      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          tipo: 'reward_pickup_method',
          titolo: 'Metodo ritiro premio scelto',
          messaggio: `${user?.nome} ${user?.cognome} ha scelto ${metodoText} per il premio "${redemption.reward.nome}"`,
          link: '/admin/premi'
        }
      });
    }

    res.json(updatedRedemption);
  } catch (error) {
    console.error('Errore nella scelta del metodo di ritiro:', error);
    res.status(500).json({ error: 'Errore nella scelta del metodo di ritiro' });
  }
});

// PUT /api/rewards/redemptions/:id/mark-delivered - Segna come consegnato (solo admin)
router.put('/redemptions/:id/mark-delivered', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    });

    const redemption = await prisma.rewardRedemption.findFirst({
      where: {
        id,
        companyId: user?.companyId,
        stato: 'awaiting_pickup'
      },
      include: {
        reward: true,
        user: {
          select: {
            id: true,
            nome: true,
            cognome: true
          }
        }
      }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Riscatto non trovato o non in attesa di ritiro' });
    }

    const updated = await prisma.rewardRedemption.update({
      where: { id },
      data: { stato: 'delivered' }
    });

    // Notifica l'utente
    await prisma.notification.create({
      data: {
        userId: redemption.userId,
        tipo: 'reward_delivered',
        titolo: 'Premio consegnato',
        messaggio: `Il premio "${redemption.reward.nome}" è stato consegnato!`,
        link: '/premi'
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Errore nella marcatura come consegnato:', error);
    res.status(500).json({ error: 'Errore nella marcatura come consegnato' });
  }
});

export default router; // v2
