import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ottiene la sessione attiva dell'utente
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const activeSession = await prisma.workSession.findFirst({
      where: {
        userId,
        stato: { in: ['active', 'paused'] },
      },
      include: {
        subtask: {
          include: {
            task: {
              select: {
                id: true,
                titolo: true,
                stato: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(activeSession);
  } catch (error) {
    console.error('Errore getActiveSession:', error);
    res.status(500).json({ error: 'Errore durante il recupero della sessione attiva' });
  }
};

// Avvia una nuova sessione di lavoro per una subtask
export const startWorkSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { subtaskId } = req.params;

    // Verifica che la subtask esista
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });

    if (!subtask) {
      return res.status(404).json({ error: 'Subtask non trovata' });
    }

    // Controlla se c'è già una sessione attiva per questo utente
    const existingActiveSession = await prisma.workSession.findFirst({
      where: {
        userId,
        stato: { in: ['active', 'paused'] },
      },
    });

    if (existingActiveSession) {
      return res.status(400).json({
        error: 'Hai già una sessione attiva. Fermala prima di iniziarne un\'altra.',
        activeSession: existingActiveSession,
      });
    }

    // Crea nuova sessione
    const session = await prisma.workSession.create({
      data: {
        subtaskId,
        userId,
        stato: 'active',
        startedAt: new Date(),
        lastUpdateAt: new Date(),
      },
      include: {
        subtask: {
          include: {
            task: {
              select: {
                id: true,
                titolo: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Errore startWorkSession:', error);
    res.status(500).json({ error: 'Errore durante l\'avvio della sessione' });
  }
};

// Mette in pausa la sessione corrente
export const pauseWorkSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (session.stato !== 'active') {
      return res.status(400).json({ error: 'La sessione non è attiva' });
    }

    const now = new Date();
    const tempoTrascorso = Math.floor((now.getTime() - session.lastUpdateAt.getTime()) / 1000);

    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        stato: 'paused',
        pausedAt: now,
        tempoAccumulato: session.tempoAccumulato + tempoTrascorso,
        pauseCount: session.pauseCount + 1,
        lastUpdateAt: now,
      },
      include: {
        subtask: {
          include: {
            task: {
              select: {
                id: true,
                titolo: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Errore pauseWorkSession:', error);
    res.status(500).json({ error: 'Errore durante la pausa della sessione' });
  }
};

// Riprende la sessione in pausa
export const resumeWorkSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (session.stato !== 'paused') {
      return res.status(400).json({ error: 'La sessione non è in pausa' });
    }

    const now = new Date();
    const tempoPausa = session.pausedAt
      ? Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
      : 0;

    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        stato: 'active',
        pausedAt: null,
        totalePause: session.totalePause + tempoPausa,
        lastUpdateAt: now,
      },
      include: {
        subtask: {
          include: {
            task: {
              select: {
                id: true,
                titolo: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Errore resumeWorkSession:', error);
    res.status(500).json({ error: 'Errore durante la ripresa della sessione' });
  }
};

// Completa e ferma la sessione
export const stopWorkSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      include: {
        subtask: {
          include: {
            task: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (session.stato === 'completed') {
      return res.status(400).json({ error: 'La sessione è già completata' });
    }

    const now = new Date();
    let tempoFinale = session.tempoAccumulato;

    // Se la sessione era attiva, aggiungi il tempo dall'ultimo update
    if (session.stato === 'active') {
      const tempoTrascorso = Math.floor((now.getTime() - session.lastUpdateAt.getTime()) / 1000);
      tempoFinale += tempoTrascorso;
    }

    // Aggiorna la sessione come completata
    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        stato: 'completed',
        completedAt: now,
        tempoAccumulato: tempoFinale,
        lastUpdateAt: now,
      },
    });

    // Crea un worklog per la task
    const minuti = Math.ceil(tempoFinale / 60);
    await prisma.taskWorklog.create({
      data: {
        taskId: session.subtask.taskId,
        userId,
        minuti,
        note: `Lavoro su subtask: ${session.subtask.titolo}`,
      },
    });

    res.json({
      ...updatedSession,
      minuti,
      message: 'Sessione completata e tempo registrato',
    });
  } catch (error) {
    console.error('Errore stopWorkSession:', error);
    res.status(500).json({ error: 'Errore durante il completamento della sessione' });
  }
};

// Ottiene lo storico delle sessioni
export const getWorkSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { subtaskId, limit = '10' } = req.query;

    const where: any = {
      userId,
      stato: 'completed',
    };

    if (subtaskId) {
      where.subtaskId = subtaskId;
    }

    const sessions = await prisma.workSession.findMany({
      where,
      include: {
        subtask: {
          include: {
            task: {
              select: {
                id: true,
                titolo: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
    });

    res.json(sessions);
  } catch (error) {
    console.error('Errore getWorkSessions:', error);
    res.status(500).json({ error: 'Errore durante il recupero delle sessioni' });
  }
};

// Aggiorna il tempo della sessione attiva (chiamato dal frontend ogni minuto)
export const updateSessionTime = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (session.stato !== 'active') {
      return res.status(400).json({ error: 'La sessione non è attiva' });
    }

    const now = new Date();
    const tempoTrascorso = Math.floor((now.getTime() - session.lastUpdateAt.getTime()) / 1000);

    // Controlla se è passata 1 ora di lavoro ininterrotto (3600 secondi)
    const tempoTotaleAttivo = session.tempoAccumulato + tempoTrascorso;
    let shouldNotifyBreak = false;

    // Notifica ogni ora
    if (session.ultimaNotificaPausa) {
      const tempoUltimaNotifica = Math.floor((now.getTime() - session.ultimaNotificaPausa.getTime()) / 1000);
      if (tempoUltimaNotifica >= 3600) {
        shouldNotifyBreak = true;
      }
    } else if (tempoTotaleAttivo >= 3600) {
      shouldNotifyBreak = true;
    }

    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        tempoAccumulato: session.tempoAccumulato + tempoTrascorso,
        lastUpdateAt: now,
        ...(shouldNotifyBreak && { ultimaNotificaPausa: now }),
      },
    });

    res.json({
      ...updatedSession,
      shouldNotifyBreak,
    });
  } catch (error) {
    console.error('Errore updateSessionTime:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento del tempo' });
  }
};
